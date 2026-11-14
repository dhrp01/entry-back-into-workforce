# MOMentum

### *Everything she has, finally in motion.*

**AI Collective Hackathon**

**MOMentum** (Mom + momentum) is a nonprofit app that helps caregivers — especially stay-at-home moms — return to work after a long career break. Users don't just get information; they leave with **actual direction**: a personalized re-entry plan, a resume that handles the gap, a skill-building path, and real connections to community resources and jobs.

The name is the thesis: in physics, momentum is mass × velocity — everything you already have, moving forward. A mom's years of caregiving aren't a gap to apologize for; they're the mass. The app provides the velocity. And the hardest part of any re-entry isn't ability — it's *starting*. Every feature is engineered to create motion: 10-minute wins, a skill profile that builds in real time, and a next single step at every turn. Each small action makes the next one easier.

> **Fun. Highly useful. Relentlessly encouraging. Built for people with 10 spare minutes at a time.**
> *Once she's moving, she's unstoppable.*

---

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

## US job sources

Jobs are searched using the target and previous role. Remotive, Remote OK and Arbeitnow work without credentials; availability and location eligibility should be checked on each posting.

For more US and Utah opportunities, copy `.env.example` to `.env` and configure:

- **Adzuna:** Register at [developer.adzuna.com](https://developer.adzuna.com/), set `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`, and use `ADZUNA_COUNTRY=us` (the default). Set another supported country code if needed.
- **USAJOBS:** Register at [developer.usajobs.gov](https://developer.usajobs.gov/) and set `USAJOBS_EMAIL` and `USAJOBS_API_KEY` for federal listings. Enter a city or state in the location filter to narrow results.

Restart the server after changing `.env`. Both integrations are optional. Location filtering matches the location text returned by each source; it is not a commute-radius search. A Utah DWS feed and CareerOneStop are not integrated; their access and terms need verification.

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
