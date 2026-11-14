# Re-Entry: A Guided Pathway Back Into the Workforce

**AI Collective Hackathon**

A nonprofit app that helps caregivers — especially stay-at-home parents — return to work after a long career break. Users don't just get information; they leave with **actual direction**: a personalized re-entry plan, a resume that handles the gap, a skill-building path, and real connections to community resources and jobs.

> **Fun. Highly useful. Relentlessly encouraging. Built for people with 10 spare minutes at a time.**

---
The questionnaire and adaptive conversation run through two local servers. Install the dependencies, configure `GEMINI_API_KEY` in `.env`, and start both servers in separate terminals:

    uvicorn app.main:app --reload --port 8001
    python3 server.py

The conversation sends the questionnaire profile and interview answers to Google Gemini when the user starts the interview or generates a roadmap. Answers and the generated roadmap are stored in browser localStorage. Do not enter sensitive personal information. Edit `skills/SKILL.md` to change the skill guidance loaded for future model requests. Model-generated guidance and resources should be verified.

The frontend server can also run on its own, but the conversation requires the FastAPI server:

    python3 server.py

## The Problem

Millions of caregivers want to return to work but face compounding barriers:

- **Confidence** — imposter syndrome, lost professional identity, underselling caregiving as skilled work
- **The resume gap** — hiring bias and ATS screening filter out nonlinear histories
- **Outdated skills & shrunken networks** — unsure what transfers, nobody to call
- **Practical walls** — childcare costs, schedule inflexibility, benefits cliffs
- **No roadmap** — existing resources are scattered articles, not a guided path

Nothing walks a returner from *"who am I now?"* to *"here is my plan."* This app does.

## How It Works — The 6-Stage Journey

| Stage | What happens |
|---|---|
| 1. **Discover** | Skills & aptitude assessment — including skills built *during* the gap |
| 2. **Choose** | Compare 2–3 suggested career pathways with honest fit reasoning |
| 3. **Build** | Gap-closing skill plan: free/low-cost courses and certifications |
| 4. **Package** | Resume + gap-story builder that survives ATS screening |
| 5. **Connect** | Community resources, mentors, peer cohorts, returner-friendly job board |
| 6. **Launch** | Exit deliverable: a personalized 30/60/90-day re-entry action plan |

The whole app is designed **backward from the exit deliverable**. Direction, not information.

## What Makes It Different

- **Caregiving counts as experience.** The assessment translates budgeting, logistics, advocacy, and crisis management into professional skills.
- **Warm handoffs, not link lists.** Every resource connection answers *"what's my next single step?"*
- **Built for real life.** Every module is completable in 10-minute bites — nap-time and pickup-line friendly.
- **Encouragement is a feature.** Celebration mechanics, rejection-recovery support, and a tone that works whether someone is returning by choice or by necessity.

## Repo Contents

| File | Description |
|---|---|
| [`WORKFLOW.md`](WORKFLOW.md) | Full product workflow: user journey, feature detail per stage, design requirements, MVP vs. later phases, success metrics |
| [`ICP_PERSONA.md`](ICP_PERSONA.md) | Who we're building for: ideal customer profile, the "Melissa" persona, secondary segments, and anti-ICP |
| [`INTAKE_DESIGN.md`](INTAKE_DESIGN.md) | Build spec for the intake/assessment: UX principles, 11-question script, activity→skill mapping table, resume generation logic |
| [`UTAH_RESOURCES.md`](UTAH_RESOURCES.md) | Vetted Utah community resources to integrate — returnships, workforce services, childcare assistance, 211 — with a 3-tier integration plan |

## MVP Scope (Hackathon)

Discover assessment → pathway suggestions → resume & gap-story builder → curated resource directory → personalized exit action plan.

## Success Metrics

- % of users completing an exit action plan
- Resumes completed / gap stories practiced
- Resource connections made (and warm handoffs completed)
- Self-reported confidence lift (pre/post)
- Interviews and jobs landed at 30/60/90 days
- No account and no database. Answers, plan progress and resume text are kept in
  the visitor's browser (localStorage) and sent to the server only to compute results.
- Job sources are public APIs that permit this use. LinkedIn and Indeed are not
  scraped because their terms prohibit it. The recruiter button opens a LinkedIn
  people search in the visitor's own account.
- Job results are cached on the server for an hour per source.
- Resume upload accepts text-based PDF files only (up to 2 MB and 20 pages). The original PDF is previewed in the browser; extracted text is used for review. Scanned PDFs and Word files are not supported. Install `pypdf` from requirements.txt to enable PDF extraction.

---

# Gemini workforce skills conversation API

A Python backend for a future UI. It asks a fixed set of questions you provide, then uses the Gemini API to assess the answers, identify transferable skills, and suggest learning steps. Assessments are informational, not hiring decisions or verified qualifications.

## Setup

Requires Python 3.10+ and a Gemini API key from [Google AI Studio](https://aistudio.google.com/).

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your Gemini API key.
uvicorn app.main:app --reload --port 8001
```

Open http://127.0.0.1:8001/docs for interactive API documentation. Keep the API key on the server, never in the UI. API usage may incur Google charges; check model availability and pricing for your account.

## Conversation flow

1. `POST /sessions` with your fixed skills and questions, in the order they should be asked:

   ```json
   {"skills": [{"name": "Communication", "questions": ["How have you communicated with others in your work or daily life?", "Can you give an example?"]}, {"name": "Digital skills", "questions": ["What digital tools have you used?"]}]}
   ```

   The response contains a `session_id`, status, and `current_question` with its skill. Save the ID for subsequent requests.
2. `POST /sessions/{session_id}/answers` with `{"answer": "..."}`. The response returns the next question, or `ready_for_assessment` when finished. `GET /sessions/{session_id}` retrieves the current state and answers.
3. `POST /sessions/{session_id}/assessment` calls Gemini and returns a summary, skill assessments with evidence, transferable skills, and learning recommendations. It requires all questions to be answered. Calling it again generates a new assessment and may incur another API charge.

`GET /health` provides a basic health check. Missing sessions return 404; answering after completion or requesting an assessment early returns 409. Gemini failures return 502, and a missing API key returns 503.

## Prototype limitations

Sessions live only in memory, disappear on restart, and are not shared between server processes; use a single worker. There is no authentication, authorization, rate limiting, or cross-origin configuration. Do not deploy publicly or use real sensitive personal data without addressing security, privacy, retention, and consent. Answers are sent to Google's Gemini API when an assessment is requested. The UI should treat generated content as untrusted and render it safely.

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest
```

Tests mock assessment generation and do not require an API key.

## Running the app

The core app needs only Python 3.9 or later:

    python3 server.py

Then open http://localhost:8000.

The conversation and the Gemini-built roadmap need Python 3.10 or later and a
Gemini key:

    python3 -m venv .venv
    .venv/bin/pip install -r requirements.txt
    cp .env.example .env      # then add GEMINI_API_KEY
    .venv/bin/python server.py

### The journey in the app

1. **Onboarding** — eight questions: name, last role, field, skills and tools,
   when they stepped away, where they want to improve, target start date, education.
2. **Conversation** — a Gemini coach that already has those answers asks what the
   form does not: what they did during the break, what work needs to look like to
   fit their life, what they enjoy, what worries them. It decides when it knows enough.
3. **Roadmap** — Gemini builds a week-by-week plan from the onboarding answers and
   the conversation, and shows what it understood and how that shaped the plan.
   Without a key, the app builds a standard plan from the onboarding answers.

Then: Summary, What changed (field refresher), Courses, Resume review and Jobs
(live postings with LinkedIn recruiter searches). After the roadmap is built, the
conversation becomes a coach that works from the plan.

| Feature | Without keys | With keys |
|---|---|---|
| Onboarding, summary, courses | Built in | Same |
| Conversation and roadmap | Standard roadmap, no conversation | Gemini conversation and personalised roadmap (`GEMINI_API_KEY`) |
| What changed | Curated digest per field | Live digest with sources (`ANTHROPIC_API_KEY`) |
| Resume | Rule-based check | Line-by-line review (`ANTHROPIC_API_KEY`) |
| Jobs | Remotive, Arbeitnow, Remote OK | Adds local listings (`ADZUNA_APP_ID`, `ADZUNA_APP_KEY`) |

The conversation comes from Michelle Tessier's Streamlit + Gemini prototype
(`michelle/streamlit-gemini-chat-prototype`); its prompt and Gemini call live in
`rtw/coach.py`.

### Code layout

    server.py        HTTP server and JSON API (standard library)
    rtw/data.py      Editable content: fields, skills, refresher items, courses
    rtw/engine.py    Summary, standard roadmap, course matching, resume rules
    rtw/coach.py     Gemini conversation, coach and roadmap planner
    rtw/jobs.py      Job sources, ranking, recruiter search links
    rtw/ai.py        Optional Claude layer for the refresher and resume review
    static/          The single-page front end (plain HTML, CSS and JavaScript)

No account and no database: answers, the conversation and plan progress are kept
in the visitor's browser and sent to the server only to compute results.
