"""Courses chosen from the questionnaire and the skills interview.

Gemini picks from the app's own catalogue (rtw/data.py COURSES), so every link
is a real, checked course; it only chooses and explains. Without Gemini, or on
any failure, the rule-based pick is used, nudged towards courses whose topics
come up in the interview.
"""
import re
import sys

from . import coach, engine
from .data import COURSES

PROMPT = """You choose courses for one person returning to work after a career break.

You get what they told the app (CONTEXT), their skills interview (CONVERSATION),
what the interview concluded (INTERVIEW FINDINGS) and the course CATALOGUE.
Choose the 4 to 6 catalogue courses that best close the gap between what they
have and the pathways chosen for them, easiest useful win first. Prefer free
courses and ones that fit the time they have. Use only catalogue courses.

Reply with one JSON object and nothing else:
{"courses": [{"url": "the catalogue url, copied exactly", "why": "one or two sentences, to them in the second person, on why this course, using their own details"}]}"""


def _interview_text(body):
    turns = body.get("turns") if isinstance(body.get("turns"), list) else []
    findings = body.get("findings") if isinstance(body.get("findings"), dict) else {}
    parts = [str(t.get("answer", "")) for t in turns if isinstance(t, dict)]
    for key in ("strengths", "growth_areas", "pathways", "steps"):
        for item in findings.get(key) or []:
            if isinstance(item, dict):
                parts.extend(str(v) for v in item.values())
    return " ".join(parts).lower()


def _decorate(course, profile, budget):
    item = dict(course)
    item["fieldMatch"] = engine.field_of(profile) in course["tags"]
    item["fits"] = course["hours"] <= budget * 0.6
    return item


MAX_COURSES = 4
MAX_AI_COURSES = 1
_AI_TITLE = re.compile(r"\bAI\b|artificial intelligence|machine learning|prompt", re.I)


def _trim(picks):
    """No repeats, at most MAX_AI_COURSES courses about AI, and MAX_COURSES in all."""
    out, seen, ai_count = [], set(), 0
    for course in picks:
        key = course.get("url") or course.get("title")
        if key in seen:
            continue
        if _AI_TITLE.search(course.get("title", "")):
            if ai_count >= MAX_AI_COURSES:
                continue
            ai_count += 1
        seen.add(key)
        out.append(course)
    return out[:MAX_COURSES]


def _rule_based(body):
    """The engine's pick, re-ranked by how often a course's topic appears in the interview."""
    profile = body.get("profile") or {}
    text = _interview_text(body)
    picked = engine.pick_courses(profile)
    if not text:
        return _trim(picked)
    def overlap(course):
        words = set(re.findall(r"[a-z]{4,}", (course["title"] + " " + course["why"]).lower()))
        return sum(1 for w in words if w in text)
    extra = sorted((c for c in COURSES if c not in picked), key=overlap, reverse=True)[:2]
    budget = engine.weeks_to_start(profile) * engine.hours_per_week(profile)
    ranked = sorted(picked, key=overlap, reverse=True) + [_decorate(c, profile, budget) for c in extra if overlap(c) > 1]
    return _trim(ranked)


def pick(body):
    profile = body.get("profile") or {}
    turns = body.get("turns") if isinstance(body.get("turns"), list) else []
    answered = [t for t in turns if isinstance(t, dict) and str(t.get("answer", "")).strip() not in ("", "Skipped")]
    if not coach.status()["enabled"] or not answered:
        return {"mode": "starter", "courses": _rule_based(body)}

    catalogue = {c["url"]: c for c in COURSES}
    request = "\n".join(
        [coach.build_context({"profile": profile}, with_plan=False), "", "CONVERSATION"]
        + ["Coach: %s\nPerson: %s" % (coach._clip(t.get("question"), 600), coach._clip(t.get("answer"), 1500)) for t in answered[-30:]]
        + ["", "INTERVIEW FINDINGS"] + (coach._findings({"findings": body.get("findings")}) or ["(not built yet)"])
        + ["", "CATALOGUE"]
        + ["- %s | %s | %s | about %d hours | url: %s" % (c["title"], c["provider"], c["cost"], c["hours"], c["url"]) for c in COURSES])
    try:
        data = coach._extract_json("".join(v for k, v in coach._stream_text(PROMPT, request) if k == "text"))
        budget = engine.weeks_to_start(profile) * engine.hours_per_week(profile)
        out, seen = [], set()
        for raw in data.get("courses") or []:
            url = raw.get("url") if isinstance(raw, dict) else None
            if url in catalogue and url not in seen:
                seen.add(url)
                item = _decorate(catalogue[url], profile, budget)
                why = coach._clip(raw.get("why"), 320)
                if why:
                    item["why"] = why
                out.append(item)
        if len(out) < 2:
            raise ValueError("too few catalogue courses chosen")
        return {"mode": "live", "courses": _trim(out)}
    except Exception as exc:  # keep the page useful whatever happens upstream
        print("[courses] %r; using the rule-based pick" % exc, file=sys.stderr)
        return {"mode": "starter", "courses": _rule_based(body)}
