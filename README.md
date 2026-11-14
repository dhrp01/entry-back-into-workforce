# Return to Work

Built for the AI Collective Hackathon.

A web app that helps someone return to work after a career break:
a motivating questionnaire, then a summary, a week-by-week roadmap with
training, a refresher on what changed in their field, matched courses,
resume edits, and live job postings with a way to find each company's recruiters.

## Run it

    python3 server.py

Then open http://localhost:8000. Python 3.9 or later, no installs needed.

## What is live and what is built in

| Step | Without any keys | With keys |
|---|---|---|
| Questionnaire, summary, roadmap, courses | Built in | Same |
| What changed | Curated starter digest per field (`rtw/data.py`) | Live digest from Claude with web search and source links |
| Resume | Rule-based check: gap, summary, keywords, dated wording, numbers | Review by Claude with line-by-line rewrites |
| Jobs | Live from Remotive, Arbeitnow and Remote OK (mostly remote and European roles) | Adds Adzuna for local listings by country |

To turn on the keyed features, copy `.env.example` to `.env`, fill it in, and for
Claude also run `pip3 install -r requirements.txt`.

## Layout

    server.py        HTTP server and JSON API (standard library)
    rtw/data.py      Editable content: fields, skills, refresher items, courses
    rtw/engine.py    Summary, roadmap, course matching, resume rules
    rtw/jobs.py      Job sources, ranking, recruiter search links
    rtw/ai.py        Optional Claude layer; falls back to engine.py on any failure
    static/          The single-page front end (plain HTML, CSS and JavaScript)

## Notes

- No account and no database. Answers, plan progress and resume text are kept in
  the visitor's browser (localStorage) and sent to the server only to compute results.
- Job sources are public APIs that permit this use. LinkedIn and Indeed are not
  scraped because their terms prohibit it. The recruiter button opens a LinkedIn
  people search in the visitor's own account.
- Job results are cached on the server for an hour per source.
- Resume upload accepts pasted text or a .txt file. PDF and Word parsing is not built yet.
