"""Live job postings: fetch from public job APIs, normalise, rank against the
returner's profile, and attach a recruiter search link per company.

Sources used here all publish an API for this purpose. LinkedIn and Indeed are
deliberately not scraped: their terms prohibit it.
"""
import datetime
import html
import json
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

from .data import FIELDS
from .engine import field_of, target_role

USER_AGENT = "return-to-work-app/0.1"
CACHE_SECONDS = 60 * 60          # be a polite API client: one fetch per source per hour
_cache = {}
_lock = threading.Lock()

_STOP = {"and", "the", "for", "with", "senior", "junior", "lead", "associate",
         "officer", "executive", "head", "of", "in", "to", "a", "an"}


def _get_json(url, timeout=15, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json", **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8", "replace"))


def _cached(key, loader):
    now = time.time()
    with _lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < CACHE_SECONDS:
            return hit[1]
    value = loader()
    with _lock:
        _cache[key] = (now, value)
    return value


def _clean(text, limit=600):
    """Job descriptions arrive as HTML, sometimes double-escaped."""
    text = html.unescape(html.unescape(str(text or "")))
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit]


def _iso(value):
    try:
        if isinstance(value, (int, float)) or str(value).isdigit():
            return datetime.datetime.utcfromtimestamp(int(value)).date().isoformat()
        return str(value)[:10]
    except (ValueError, OverflowError, OSError):
        return ""


# ----------------------------------------------------------------- sources ---
def _remotive(query):
    url = "https://remotive.com/api/remote-jobs?" + urllib.parse.urlencode({"search": query, "limit": 60})
    data = _get_json(url)
    out = []
    for j in data.get("jobs", []):
        out.append({
            "title": j.get("title", ""), "company": (j.get("company_name") or "").strip(),
            "location": j.get("candidate_required_location") or "Remote", "remote": True,
            "url": j.get("url", ""), "tags": j.get("tags") or [],
            "description": _clean(j.get("description"), 4000), "posted": _iso(j.get("publication_date")),
            "type": (j.get("job_type") or "").replace("_", " "), "salary": j.get("salary") or "",
            "source": "Remotive",
        })
    return out


def _arbeitnow(_query):
    data = _get_json("https://www.arbeitnow.com/api/job-board-api")
    out = []
    for j in data.get("data", []):
        out.append({
            "title": j.get("title", ""), "company": (j.get("company_name") or "").strip(),
            "location": j.get("location") or ("Remote" if j.get("remote") else ""), "remote": bool(j.get("remote")),
            "url": j.get("url", ""), "tags": j.get("tags") or [],
            "description": _clean(j.get("description"), 4000), "posted": _iso(j.get("created_at")),
            "type": ", ".join(j.get("job_types") or []), "salary": "", "source": "Arbeitnow",
        })
    return out


def _remoteok(_query):
    data = _get_json("https://remoteok.com/api")
    out = []
    for j in data:
        if not isinstance(j, dict) or not j.get("position"):
            continue
        out.append({
            "title": j.get("position", ""), "company": (j.get("company") or "").strip(),
            "location": j.get("location") or "Remote", "remote": True,
            "url": j.get("url") or j.get("apply_url") or "", "tags": j.get("tags") or [],
            "description": _clean(j.get("description"), 4000), "posted": _iso(j.get("date")),
            "type": "", "salary": "", "source": "Remote OK",
        })
    return out


def _adzuna(query, where):
    app_id, app_key = os.environ.get("ADZUNA_APP_ID"), os.environ.get("ADZUNA_APP_KEY")
    country = os.environ.get("ADZUNA_COUNTRY", "us").lower()
    params = {"app_id": app_id, "app_key": app_key, "what": query, "results_per_page": 50,
              "content-type": "application/json"}
    if where:
        params["where"] = where
    data = _get_json("https://api.adzuna.com/v1/api/jobs/%s/search/1?%s" % (country, urllib.parse.urlencode(params)))
    out = []
    for j in data.get("results", []):
        text = _clean(j.get("description"), 4000)
        out.append({
            "title": _clean(j.get("title"), 200), "company": ((j.get("company") or {}).get("display_name") or "").strip(),
            "location": (j.get("location") or {}).get("display_name") or "", "remote": "remote" in text.lower(),
            "url": j.get("redirect_url", ""), "tags": [],
            "description": text, "posted": _iso(j.get("created")),
            "type": (j.get("contract_time") or "").replace("_", " "), "salary": "", "source": "Adzuna",
        })
    return out


def adzuna_enabled():
    return bool(os.environ.get("ADZUNA_APP_ID") and os.environ.get("ADZUNA_APP_KEY"))


def usajobs_enabled():
    return bool(os.environ.get("USAJOBS_EMAIL") and os.environ.get("USAJOBS_API_KEY"))


def _usajobs(query, where):
    params = {"Keyword": query, "ResultsPerPage": 50}
    if where:
        params["LocationName"] = where
    data = _get_json("https://data.usajobs.gov/api/search?" + urllib.parse.urlencode(params), headers={
        "Host": "data.usajobs.gov", "User-Agent": os.environ["USAJOBS_EMAIL"],
        "Authorization-Key": os.environ["USAJOBS_API_KEY"],
    })
    out = []
    for item in (data.get("SearchResult") or {}).get("SearchResultItems", []):
        j = item.get("MatchedObjectDescriptor") or {}
        details = j.get("UserArea", {}).get("Details", {}) or {}
        locations = j.get("PositionLocation") or []
        names = [loc.get("LocationName", "") for loc in locations if loc.get("LocationName")]
        if not names:
            names = [j.get("PositionLocationDisplay") or ""]
        remote = details.get("RemoteIndicator") is True or str(details.get("RemoteIndicator", "")).lower() == "true"
        remuneration = (j.get("PositionRemuneration") or [{}])[0]
        salary = " – ".join(str(remuneration.get(k) or "") for k in ("MinimumRange", "MaximumRange")).strip(" –")
        for location in names:
            out.append({
                "title": _clean(j.get("PositionTitle"), 200),
                "company": _clean(j.get("OrganizationName") or j.get("DepartmentName"), 200),
                "location": location, "remote": remote,
                "url": j.get("PositionURI") or item.get("MatchedObjectId") or "", "tags": [],
                "description": _clean(details.get("JobSummary") or j.get("QualificationSummary"), 4000),
                "posted": _iso(j.get("PublicationStartDate")),
                "type": ", ".join(x.get("Name", "") for x in (j.get("PositionSchedule") or []) if x.get("Name")),
                "salary": salary, "source": "USAJOBS",
            })
    return out


# ----------------------------------------------------------------- ranking ---
def _tokens(text):
    return [t for t in re.findall(r"[a-z][a-z+#/]+", str(text or "").lower()) if len(t) > 2 and t not in _STOP]


def _has(word, text):
    return re.search(r"(?<![a-z])%s(?![a-z])" % re.escape(word), text) is not None


def recruiter_link(company):
    """A LinkedIn people search the user opens while signed in. Nothing is scraped."""
    query = '"%s" (recruiter OR "talent acquisition" OR "talent partner")' % company
    return "https://www.linkedin.com/search/results/people/?" + urllib.parse.urlencode({"keywords": query})


def _score(job, profile, role_tokens, field, previous_tokens=None):
    title = job["title"].lower()
    blob = " ".join([title, " ".join(str(t) for t in job["tags"]).lower(), job["description"].lower()])
    score, reasons = 0, []

    # Generic job levels alone (e.g. "manager") do not establish relevance.
    generic = {"manager", "specialist", "director", "coordinator", "analyst", "assistant", "engineer"}
    def title_match(tokens):
        matched = [t for t in tokens if _has(t, title)]
        meaningful = [t for t in tokens if t not in generic]
        return matched if matched and (not meaningful or any(t in matched for t in meaningful)) else []

    matched = title_match(role_tokens)
    previous = title_match(previous_tokens or [])
    if matched:
        full = len(matched) == len(role_tokens)
        score += 55 if full else 15 + round(25 * len(matched) / len(role_tokens))
        reasons.append("Title matches your target role" if full else "Title shares keywords with your target role")
    elif previous:
        full = len(previous) == len(previous_tokens)
        score += 50 if full else 15 + round(25 * len(previous) / len(previous_tokens))
        reasons.append("Title matches your previous role" if full else "Title shares keywords with your previous role")
    elif not role_tokens and any(_has(t, title) for t in field["titles"]):
        score += 22
        reasons.append("In your field: %s" % field["label"].lower())
    else:
        return 0, []

    hits = [k for k in field["keywords"] if _has(k, blob)]
    if hits:
        score += min(20, 4 * len(hits))
        reasons.append("Asks for %s" % ", ".join(hits[:4]))

    style = profile.get("workStyle")
    if job["remote"] and style in ("remote", "hybrid", "any"):
        score += 10
        reasons.append("Remote, as you prefer" if style == "remote" else "Can be done remotely")
    elif not job["remote"] and style == "remote":
        score -= 15

    place = (profile.get("location") or "").strip().lower()
    where = job["location"].lower()
    if place and any(p in where for p in _tokens(place)):
        score += 12
        reasons.append("Located in %s" % job["location"])
    elif re.search(r"worldwide|anywhere|global", where):
        score += 5
        reasons.append("Open to applicants anywhere")

    if profile.get("schedule") in ("part-time", "phased") and re.search(r"part[- ]time|flexible hours|job share", blob):
        score += 10
        reasons.append("Mentions part-time or flexible hours")
    if re.search(r"returnship|returner|career break|return to work|career gap", blob):
        score += 15
        reasons.append("Welcomes people returning from a career break")

    try:
        age = (datetime.date.today() - datetime.date.fromisoformat(job["posted"])).days
        if 0 <= age <= 14:
            score += 5
            reasons.append("Posted in the last two weeks")
        elif age > 60:
            score -= 10
    except ValueError:
        pass

    if re.search(r"\b(intern|internship|student|werkstudent|praktikum)\b", title):
        score -= 20
    return max(0, min(100, score)), reasons


def find_jobs(profile, location=""):
    field_key = field_of(profile)
    field = FIELDS[field_key]
    role = target_role(profile)
    role_tokens = _tokens(role)
    previous_role = (profile.get("lastRole") or "").strip()
    previous_tokens = _tokens(previous_role) if previous_role.lower() != role.lower() else []
    location = str(location or "").strip()
    place = location or (profile.get("location") or "").strip()

    loaders = [("Remotive", "remotive:" + role.lower(), lambda: _remotive(role)),
               ("Arbeitnow", "arbeitnow", lambda: _arbeitnow(role)),
               ("Remote OK", "remoteok", lambda: _remoteok(role))]
    if previous_tokens:
        loaders.append(("Remotive", "remotive:" + previous_role.lower(), lambda: _remotive(previous_role)))
    if adzuna_enabled():
        loaders.append(("Adzuna", "adzuna:%s:%s" % (role.lower(), place.lower()), lambda: _adzuna(role, place)))
        if previous_tokens:
            loaders.append(("Adzuna", "adzuna:%s:%s" % (previous_role.lower(), place.lower()), lambda: _adzuna(previous_role, place)))

    if usajobs_enabled():
        for search_role in dict.fromkeys([role, previous_role] if previous_tokens else [role]):
            loaders.append(("USAJOBS", "usajobs:%s:%s" % (search_role.lower(), place.lower()),
                            lambda search_role=search_role: _usajobs(search_role, place)))

    results, sources = [], []
    lock = threading.Lock()

    def run(name, key, loader):
        try:
            jobs = _cached(key, loader)
            with lock:
                results.extend(jobs)
                sources.append({"name": name, "ok": True, "count": len(jobs)})
        except (urllib.error.URLError, ValueError, OSError) as exc:
            with lock:
                sources.append({"name": name, "ok": False, "error": str(exc)[:120]})

    threads = [threading.Thread(target=run, args=l, daemon=True) for l in loaders]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=25)

    ranked, seen = [], set()
    for job in results:
        if not job["title"] or not job["url"].startswith("http"):
            continue
        if location and location.casefold() not in job["location"].casefold():
            continue
        key = (job["title"].lower(), job["company"].lower(), job["location"].lower())
        if key in seen:
            continue
        seen.add(key)
        score_profile = {**profile, "location": location} if location else profile
        score, reasons = _score(job, score_profile, role_tokens, field, previous_tokens)
        if score < 30:
            continue
        ranked.append({
            "title": job["title"], "company": job["company"], "location": job["location"],
            "remote": job["remote"], "url": job["url"], "posted": job["posted"], "type": job["type"],
            "salary": job["salary"], "source": job["source"],
            "snippet": job["description"][:260], "match": score, "reasons": reasons,
            "recruiterUrl": recruiter_link(job["company"]) if job["company"] else "",
        })
    ranked.sort(key=lambda j: (j["match"], j["posted"]), reverse=True)

    return {
        "role": role,
        "scanned": len(results),
        "jobs": ranked[:30],
        "sources": sorted(sources, key=lambda s: s["name"]),
        "fetchedAt": datetime.datetime.now().isoformat(timespec="minutes"),
        "adzuna": adzuna_enabled(),
    }
