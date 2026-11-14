"""Optional Claude layer. When the `anthropic` package is installed and
credentials are available, the refresher becomes a live, cited digest and the
resume review is written against the person's actual text. Without them the
app uses the rule-based versions in engine.py, so nothing here is required.
"""
import json
import os
import sys

from .data import FIELDS
from .engine import field_of, gap_line, target_role

try:
    import anthropic
except ImportError:  # the app still runs; see README
    anthropic = None

MODEL = os.environ.get("RTW_MODEL", "claude-opus-5-5")
_client = None


def enabled():
    if anthropic is None:
        return False
    if os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"):
        return True
    # `ant auth login` stores a profile the SDK picks up with no env var.
    return os.path.isdir(os.path.expanduser("~/.config/anthropic"))


def _get_client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


def _extract_json(text):
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("no JSON object in model output")
    return json.loads(text[start:end + 1])


def _ask(system, user, tools=None, max_continuations=3):
    """Run one request to completion and return (text, sources).

    Streams so long outputs do not hit HTTP timeouts, and resumes a server-tool
    turn that stops with pause_turn.
    """
    client = _get_client()
    messages = [{"role": "user", "content": user}]
    kwargs = {"model": MODEL, "max_tokens": 16000, "system": system}
    if tools:
        kwargs["tools"] = tools

    text_parts, sources = [], {}
    for _ in range(max_continuations + 1):
        with client.messages.stream(messages=messages, **kwargs) as stream:
            message = stream.get_final_message()
        for block in message.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "web_search_tool_result" and isinstance(block.content, list):
                for result in block.content:
                    url = getattr(result, "url", None)
                    if url:
                        sources[url] = getattr(result, "title", None) or url
        if message.stop_reason == "pause_turn":
            messages = [{"role": "user", "content": user}, {"role": "assistant", "content": message.content}]
            continue
        if message.stop_reason == "refusal":
            raise ValueError("the model declined this request")
        break
    return "".join(text_parts), sources


def _safe(fn):
    """AI is an enhancement: on any failure, log it and let the caller fall back."""
    def wrapper(*args, **kwargs):
        if not enabled():
            return None
        try:
            return fn(*args, **kwargs)
        except anthropic.AuthenticationError:
            print("[ai] credentials were rejected; using the built-in version", file=sys.stderr)
        except anthropic.RateLimitError:
            print("[ai] rate limited; using the built-in version", file=sys.stderr)
        except anthropic.APIStatusError as exc:
            print("[ai] API error %s: %s" % (exc.status_code, exc.message), file=sys.stderr)
        except anthropic.APIConnectionError:
            print("[ai] could not reach the API; using the built-in version", file=sys.stderr)
        except (ValueError, KeyError, TypeError) as exc:
            print("[ai] unusable response (%s); using the built-in version" % exc, file=sys.stderr)
        return None
    return wrapper


# --------------------------------------------------------------- refresher ---
_REFRESHER_SYSTEM = """You write a "what changed while you were away" briefing for someone returning to work after a career break. The reader is capable and experienced, and may be anxious that they have fallen behind. The briefing should leave them thinking "that is manageable".

Search the web to confirm what has changed in their field since the month they left: tools and software, regulations and standards, common job titles and hiring practice, and how AI is used in the role today. Prefer primary and reputable sources. Include only changes you found a source for, and state uncertainty plainly where sources disagree.

Reply with one JSON object and nothing else, in this shape:
{"items": [{"date": "YYYY-MM", "title": "under ten words", "body": "two sentences on what changed and why it matters for this role", "action": "one concrete thing to do this week", "scope": "Your field" or "Every workplace", "source": "URL of the page that supports this"}]}

Give 8 to 12 items in date order. Write in plain, warm language with no jargon left unexplained."""


@_safe
def refresher(profile):
    field = FIELDS[field_of(profile)]["label"]
    user = "Field: %s\nLast role: %s\nTarget role: %s\nLeft work: %s\nLocation: %s" % (
        field, profile.get("lastRole") or "not given", target_role(profile),
        profile.get("awayDate") or "a few years ago", profile.get("location") or "not given")
    tools = [{"type": "web_search_20260209", "name": "web_search", "max_uses": 8}]
    text, sources = _ask(_REFRESHER_SYSTEM, user, tools=tools)
    items = []
    for raw in _extract_json(text).get("items", []):
        if not raw.get("title") or not raw.get("body"):
            continue
        source = str(raw.get("source") or "")
        items.append({
            "date": str(raw.get("date") or "")[:7], "title": str(raw["title"]), "body": str(raw["body"]),
            "action": str(raw.get("action") or ""), "scope": str(raw.get("scope") or "Your field"),
            "source": source if source.startswith("http") else "",
        })
    if not items:
        raise ValueError("no refresher items returned")
    return {
        "mode": "live", "field": field, "since": profile.get("awayDate") or None, "items": items,
        "sources": [{"url": u, "title": t} for u, t in list(sources.items())[:20]],
    }


# ------------------------------------------------------------------ resume ---
_RESUME_SYSTEM = """You review a resume for someone returning to work after a career break. Your job is to give specific edits they can apply today, quoting their own lines and offering a rewrite. Be honest about what needs to change and encouraging about what is already strong. Never invent experience, employers, dates or numbers: where a figure would help, write a placeholder such as [number] for them to fill in.

Reply with one JSON object and nothing else, in this shape:
{"score": 0-100 for readiness to send, "strong": ["up to three things that already work"], "edits": [{"severity": "high" | "medium" | "low", "title": "short imperative", "detail": "one or two sentences on why", "before": "their exact line, if the edit replaces one", "after": "your rewrite"}], "summary": "a three line professional summary for the top of the page", "gapLine": "one confident sentence that names the career break", "missing": ["keywords current postings for the target role use that are absent"]}

Give 6 to 10 edits, most important first. Cover how the break is presented, wording that dates the resume, keywords for the target role, and achievements that need a result."""


@_safe
def resume(profile, resume_text, starter):
    user = "Target role: %s\nField: %s\nLeft work: %s\nWhat they did during the break: %s\nA draft gap line they can adapt: %s\n\n<resume>\n%s\n</resume>" % (
        target_role(profile), FIELDS[field_of(profile)]["label"], profile.get("awayDate") or "not given",
        ", ".join(profile.get("breakReasons") or []) or "not given", gap_line(profile), resume_text)
    text, _ = _ask(_RESUME_SYSTEM, user)
    data = _extract_json(text)
    edits = []
    for raw in data.get("edits", []):
        if not raw.get("title"):
            continue
        severity = raw.get("severity") if raw.get("severity") in ("high", "medium", "low") else "medium"
        edit = {"severity": severity, "title": str(raw["title"]), "detail": str(raw.get("detail") or "")}
        if raw.get("before"):
            edit["before"] = str(raw["before"])
        if raw.get("after"):
            edit["after"] = str(raw["after"])
        edits.append(edit)
    if not edits:
        raise ValueError("no resume edits returned")
    result = dict(starter)
    result.update({
        "mode": "live",
        "score": max(0, min(100, int(data.get("score", starter["score"])))),
        "edits": edits,
        "strong": [str(s) for s in data.get("strong", [])][:3],
        "summary": str(data.get("summary") or starter["summary"]),
        "gapLine": str(data.get("gapLine") or starter["gapLine"]),
    })
    if isinstance(data.get("missing"), list) and data["missing"]:
        result["missing"] = [str(m) for m in data["missing"]][:12]
    return result
