# Intake & Assessment Design Spec

How the app collects user information without overwhelming them, and how that input drives the skill profile, job pathway, and resume. This is the build spec for the **Discover** stage of the journey (see `WORKFLOW.md`).

**Core design rule:** never ask "what are your skills?" Returners can't answer that — underselling themselves is the problem we're solving. Ask *what they've done*, translate it into professional skills behind the scenes, and let them watch their skill profile build in real time.

---

## UX Principles

1. **One question per screen, conversational tone.** Chat-style flow ("Tell us about your last job — just the basics"), not a form. Think Typeform, not tax form.
2. **Three named sessions of ~3–4 minutes each**, progress saved between them:
   - Session 1: **Your Story**
   - Session 2: **Your Life Now**
   - Session 3: **Your Direction**
   Show estimated time upfront ("about 4 minutes"). Users can stop anywhere and resume later.
3. **Checkboxes over blank text boxes.** A blank box produces paralysis; a checklist of activities produces recognition ("oh, I *did* do that").
4. **Give value before asking for more.** After Session 1, show a result: "You already have 8 professional skills on your profile." That's the hook for Session 2.
5. **No wrong answers, visibly.** "Skip" on every question, "not sure yet" always an option, minimum required fields. Skips are recoverable later.
6. **Celebrate during intake.** Micro-affirmations between sections: *"Six years managing a household is six years of operations experience. Keep going."*
7. **Real-time skill building.** Each checked activity makes a professional skill appear on their growing profile — the assessment and the confidence mechanic are the same feature.

---

## The Question Script (11 questions total)

### Session 1 — Your Story (~4 min) · resume raw material

| # | Question (suggested wording) | Input type | Feeds |
|---|---|---|---|
| 1 | "What was your last paid job? Just the basics — title, what kind of work, and roughly how long you did it." | Dropdowns: title (searchable), industry, years (ranges) | Resume work history; pathway matching |
| 2 | "What's one thing you did well in that job? Did it involve money, people, or a number? Even a guess helps." | Free text with nudge chips ("saved money", "trained people", "hit a goal") | Resume accomplishment bullet |
| 3 | "Any education, certifications, or licenses? Include expired ones — lapsed counts." | Checklist + add-your-own; flag lapsed items | Resume education; renewal pathway suggestions |
| 4 | "How long have you been away from paid work?" | Ranges: <1 yr / 1–2 / 3–5 / 6–10 / 10+ | Gap-story guidance; Return Utah eligibility (2+ yrs) |

> **End-of-session moment:** show their profile starting to form. "Great start — your experience is already taking shape."

### Session 2 — Your Life Now (~4 min) · skill goldmine + constraints

| # | Question | Input type | Feeds |
|---|---|---|---|
| 5 | **The Activity Checklist** — "Which of these have you done while you've been home? Check everything that applies." | Multi-select checklist (see mapping table below) | Skill profile; resume career-break entry; pathway matching |
| 6 | "What does work need to look like to fit your life right now?" | Selects: hours/week, schedule needs, remote/hybrid/in-person, childcare situation, earliest start | Pathway filtering; job board filters; resource matching (e.g., childcare assistance) |
| 7 | "What does a job need to pay to make sense for your family?" | Ranges; "not sure" option with link to money-math calculator | Pathway filtering; benefits-cliff check |

> **End-of-session moment:** the payoff screen. "You just translated your career break into N professional skills." Show the list.

### Session 3 — Your Direction (~3 min) · aptitude + goals

| # | Question | Input type | Feeds |
|---|---|---|---|
| 8 | "Which of these sounds most appealing day-to-day?" | Pick 1–2: working with **people** / **information & numbers** / **hands-on things** / **ideas & creativity** (simplified Holland codes) | Pathway matching |
| 9 | "What kind of environment fits you best?" | Toggles: busy & social ↔ quiet & focused; variety ↔ routine | Pathway matching |
| 10 | "What matters most right now?" | Rank: fastest re-entry / most growth potential / most flexibility | Pathway ranking logic |
| 11 | "Anything you've always wondered if you'd be good at?" | Optional free text | Pathway wildcard; coach/mentor conversation starter |

> **Exit moment:** deliver the Discover output — skill profile + 2–3 suggested pathways with honest fit reasoning.

---

## The Activity → Skill Mapping Table

The heart of the app. Each checked item records professional skills on the user's profile and generates resume bullet language. Extend this table as needed.

| User checks... | Skills recorded | Example resume bullet |
|---|---|---|
| Managed the family budget / stretched a tight budget | Budget management, financial planning, resource allocation | "Managed household budget of $XX,XXX/year, consistently meeting savings goals under tight constraints" |
| PTA/PTO officer, room parent, school fundraising | Stakeholder communication, event planning, fundraising, volunteer coordination | "Led fundraising initiatives generating $X,XXX; coordinated XX volunteers across multiple events" |
| Organized carpool/schedules for multiple kids' activities | Logistics coordination, scheduling, multi-priority management | "Coordinated complex weekly logistics for X people across XX recurring commitments" |
| Coordinated care for an aging parent (doctors, insurance, medications) | Case management, vendor coordination, records management, advocacy | "Managed care coordination across 6+ medical providers, including insurance advocacy and records management" |
| Taught a class / led a youth group / church teaching role | Public speaking, curriculum planning, group facilitation | "Developed and delivered weekly lessons to groups of XX; adapted curriculum to diverse learning needs" |
| Ran a side hustle (Etsy, babysitting, direct sales, crafts) | Small business operations, customer service, sales, marketing | "Operated independent small business: managed inventory, pricing, customer relationships, and marketing" |
| Planned a major event (reunion, wedding, large fundraiser) | Project management, budgeting, vendor negotiation | "Planned and executed XXX-person event on $X,XXX budget, negotiating with XX vendors" |
| Managed a home renovation / major move | Project management, contractor negotiation, timeline management | "Managed $XX,XXX renovation project: vendor selection, contract negotiation, timeline and quality oversight" |
| Volunteer treasurer/secretary for any organization | Bookkeeping, record keeping, governance, meeting management | "Maintained financial records and meeting minutes for XX-member organization" |
| Navigated IEPs / special-needs services / insurance appeals | Advocacy, negotiation, complex-systems navigation, documentation | "Successfully navigated multi-agency processes including formal appeals and documentation requirements" |
| Ran social media for a school/team/church group | Content creation, social media management, communications | "Created and managed social content for community organization, growing engagement across platforms" |
| Mentored/tutored kids or adults | Coaching, training, patience under pressure | "Provided one-on-one tutoring and mentoring, adapting methods to individual needs" |
| Organized meal trains, service projects, neighborhood efforts | Community organizing, empathy-driven leadership, coordination | "Organized community support efforts, mobilizing XX+ participants" |

**Implementation notes:**
- Bullets with "X" placeholders prompt the user: "Even a rough number makes this stronger. Can you estimate?"
- Every generated bullet gets two one-tap reactions: **"Sounds like me"** (keep) / **"Tone it down"** (regenerate softer).
- Skills deduplicate across activities; profile shows skill + evidence ("Project management — from your renovation and event planning").

---

## Feeding the Resume (zero re-asking)

| Intake input | Resume section |
|---|---|
| Q1–Q2 | Work experience entry with accomplishment bullet |
| Q5 checklist | **Career-break entry treated as a real role** — e.g., "Family Caregiver & Household Manager, 2019–2026" with skill-based bullets from checked activities; formal volunteer roles become their own entries |
| Q3 | Education & certifications (lapsed items flagged, renewal path suggested) |
| Q4 | Gap-story guidance for interviews |

**Two resume framings — user's choice:**
1. **Own the gap** — career break as a titled role with accomplishment bullets (best for returner-friendly employers and most modern ATS guidance)
2. **Skills-first functional format** — leads with skill groupings, minimizes chronology (for users who prefer to downplay the gap in their target field)

Both must be ATS-safe: standard headings, no tables/graphics in the output file, keywords matched to the chosen pathway.

---

## Open Questions for the Team

- [ ] Chat-style UI vs. card-based screens — prototype both?
- [ ] How many activity-checklist items before it overwhelms? (Suggest: show 12–15, "see more" expands)
- [ ] Spanish-language version in MVP or Phase 2?
- [ ] Where does the AI call happen — per-bullet generation at resume time, or batch at end of Session 2?
- [ ] Data privacy: what do we store vs. keep client-side? (Income need and childcare situation are sensitive.)
