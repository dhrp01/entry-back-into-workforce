#!/usr/bin/env python3
"""Return-to-work app server. Standard library only.

    python3 server.py            # http://localhost:8000

Serves the single-page app in ./static and a small JSON API. No user data is
stored on the server: the profile lives in the browser and is sent with each
request.
"""
import json
import mimetypes
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(ROOT, "static")
MAX_BODY = 400 * 1024


def load_env(path):
    """Read KEY=value lines from .env without overriding the real environment."""
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("'\""))


load_env(os.path.join(ROOT, ".env"))

from rtw import ai, coach, engine, jobs  # noqa: E402  (after .env so keys are visible)
from rtw.data import FIELDS  # noqa: E402


def config():
    return {
        "ai": ai.enabled(),
        "adzuna": jobs.adzuna_enabled(),
        "coach": coach.status(),
        # Options for the onboarding questionnaire; only "field" needs a list.
        "fields": [{"key": k, "label": v["label"], "roles": v["roles"]} for k, v in FIELDS.items()],
    }


def refresher(body):
    profile = body.get("profile") or {}
    return ai.refresher(profile) or engine.build_refresher(profile)


def resume(body):
    profile = body.get("profile") or {}
    text = str(body.get("resume") or "")[:60000]
    if len(text.strip()) < 40:
        raise ValueError("Paste your resume text first.")
    starter = engine.review_resume(profile, text)
    return ai.resume(profile, text, starter) or starter


def interview_proxy(path, body):
    url = os.environ.get("CONVERSATION_API_URL", "http://127.0.0.1:8001").rstrip("/") + path
    request = Request(url, data=json.dumps(body).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urlopen(request, timeout=90) as response:
            return json.load(response)
    except HTTPError as exc:
        try:
            detail = json.load(exc).get("detail", "Conversation request failed.")
        except (ValueError, AttributeError):
            detail = "Conversation request failed."
        raise ValueError(str(detail)) from None
    except (URLError, TimeoutError):
        raise ValueError("Conversation server unavailable. Start the FastAPI server on port 8001.") from None


ROUTES = {
    "/api/interview/question": lambda b: interview_proxy("/interview/question", b),
    "/api/interview/roadmap": lambda b: interview_proxy("/interview/roadmap", b),
    "/api/interview/demo": lambda b: interview_proxy("/interview/demo", b),
    "/api/summary": lambda b: engine.build_summary(b.get("profile") or {}),
    "/api/roadmap": lambda b: engine.build_roadmap(b.get("profile") or {}),
    "/api/courses": lambda b: {"courses": engine.pick_courses(b.get("profile") or {})},
    "/api/refresher": refresher,
    "/api/resume": resume,
    "/api/jobs": lambda b: jobs.find_jobs(b.get("profile") or {}),
    "/api/coach/start": coach.start,
    "/api/plan": coach.build_plan,
}


class Handler(BaseHTTPRequestHandler):
    server_version = "ReturnToWork/0.1"

    def _send(self, status, payload, content_type="application/json; charset=utf-8"):
        data = payload if isinstance(payload, bytes) else json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/config":
            return self._send(200, config())
        if path in ("", "/"):
            path = "/index.html"
        target = os.path.normpath(os.path.join(STATIC, path.lstrip("/")))
        if not target.startswith(STATIC + os.sep) or not os.path.isfile(target):
            return self._send(404, {"error": "Not found"})
        with open(target, "rb") as handle:
            body = handle.read()
        kind = mimetypes.guess_type(target)[0] or "application/octet-stream"
        if kind.startswith("text/") or kind.endswith(("javascript", "json")):
            kind += "; charset=utf-8"
        self._send(200, body, kind)

    def _stream_coach(self, body):
        """Send the coach's reply as newline-delimited JSON, one event per line."""
        state = coach.status()
        if not state["enabled"]:
            return self._send(503, {"error": state["reason"]})
        if not str(body.get("message") or "").strip():
            raise ValueError("Type a message first.")
        self.send_response(200)
        self.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Connection", "close")
        self.end_headers()

        def emit(event):
            self.wfile.write((json.dumps(event) + "\n").encode("utf-8"))
            self.wfile.flush()

        try:
            for event in coach.stream_reply(body):
                emit(event)
        except (BrokenPipeError, ConnectionResetError):
            pass  # the visitor left the page mid-reply
        except Exception as exc:  # headers are sent, so report the failure in-stream
            print("[coach] %r" % exc, file=sys.stderr)
            try:
                emit({"error": "The coach could not reply just now. Please try again."})
            except OSError:
                pass

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        route = ROUTES.get(path)
        if not route and path != "/api/coach":
            return self._send(404, {"error": "Not found"})
        try:
            length = int(self.headers.get("Content-Length") or 0)
            if length > MAX_BODY:
                return self._send(413, {"error": "That is too large to process."})
            body = json.loads(self.rfile.read(length) or b"{}")
            if not isinstance(body, dict):
                raise ValueError("Expected a JSON object.")
            if path == "/api/coach":
                return self._stream_coach(body)
            self._send(200, route(body))
        except ValueError as exc:
            self._send(400, {"error": str(exc)})
        except Exception as exc:  # keep the server up; report the failure to the page
            print("[error] %s: %r" % (self.path, exc), file=sys.stderr)
            self._send(500, {"error": "Something went wrong on the server. Check the terminal for details."})

    def do_HEAD(self):
        """Health checks and link previews send HEAD; answer without a body."""
        self.send_response(200 if self.path.split("?", 1)[0] in ("", "/") else 404)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, fmt, *args):
        # args[0] is the request line for normal logs, but an HTTPStatus for
        # error logs, so convert before checking it.
        if "/api/" in str(args[0] if args else ""):
            sys.stderr.write("%s\n" % (fmt % args))

    def log_error(self, fmt, *args):
        sys.stderr.write("%s\n" % (fmt % args))


def main():
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print("Return to Work is running at http://localhost:%d" % port)
    print("  AI features: %s" % ("on (%s)" % ai.MODEL if ai.enabled() else "off, using built-in versions (see README)"))
    print("  Conversation and dynamic roadmap (Gemini): %s" % ("on (%s)" % coach.MODEL if coach.status()["enabled"] else "off. " + coach.status()["reason"]))
    print("  Job sources: Remotive, Arbeitnow, Remote OK%s" % (", Adzuna" if jobs.adzuna_enabled() else ""))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
