"""Rule-based core: turns a questionnaire profile into a summary, roadmap,
refresher digest, course list and resume review. Works with no API key.
"""
import datetime
import re

from .data import BREAK_REASONS, BREAK_SKILLS, COURSES, FIELDS, REFRESHER, WORRIES


# ----------------------------------------------------------------- helpers ---
def _today():
    return datetime.date.today()


def _parse_month(value):
    """'YYYY-MM' -> date on the first of that month, or None."""
    m = re.match(r"^(\d{4})-(\d{2})", str(value or ""))
    if not m:
        return None
    year, month = int(m.group(1)), int(m.group(2))
    if not (1950 <= year <= 2100 and 1 <= month <= 12):
        return None
    return datetime.date(year, month, 1)


def _months_between(start, end):
    return max(0, (end.year - start.year) * 12 + (end.month - start.month))


def _duration_words(months):
    if months < 12:
        return "%d month%s" % (months, "" if months == 1 else "s")
    years = months // 12
    rest = months % 12
    if rest >= 9:
        return "almost %d years" % (years + 1)
    if rest >= 3:
        return "%d and a half years" % years if 5 <= rest <= 7 else "over %d year%s" % (years, "" if years == 1 else "s")
    return "%d year%s" % (years, "" if years == 1 else "s")


def _split_list(text):
    parts = re.split(r"[,;\n]|\band\b", str(text or ""))
    return [p.strip(" .").capitalize() for p in parts if len(p.strip(" .")) > 1][:6]


def field_of(profile):
    """The person's field. The questionnaire no longer asks for it, so when it
    is missing, infer it from words in their most recent job title."""
    key = profile.get("field")
    if key in FIELDS:
        return key
    words = set(re.findall(r"[a-z]+", str(profile.get("lastRole") or "").lower()))
    best, hits = "other", 0
    for name, field in FIELDS.items():
        score = sum(1 for t in field["titles"] if (" " in t and t in str(profile.get("lastRole") or "").lower()) or t in words)
        if score > hits:
            best, hits = name, score
    return best


def target_role(profile):
    return (profile.get("targetRole") or profile.get("lastRole") or FIELDS[field_of(profile)]["roles"][0]).strip()


def away_months(profile):
    left = _parse_month(profile.get("awayDate"))
    return _months_between(left, _today()) if left else None


def weeks_to_start(profile):
    start = _parse_month(profile.get("startDate"))
    if not start:
        return 8
    weeks = (start - _today()).days // 7
    return max(4, min(12, weeks))


def hours_per_week(profile):
    try:
        return max(1, min(40, int(profile.get("hoursPerWeek") or 5)))
    except (TypeError, ValueError):
        return 5


def gap_line(profile):
    """One confident sentence that explains the break on a resume."""
    reasons = [BREAK_REASONS[r] for r in profile.get("breakReasons") or [] if r in BREAK_REASONS]
    left = _parse_month(profile.get("awayDate"))
    span = "%d to %d" % (left.year, _today().year) if left else "Recent years"
    why = " and ".join(reasons[:2]) if reasons else "family commitments"
    skills = [BREAK_SKILLS[s]["skill"].lower() for s in profile.get("breakSkills") or [] if s in BREAK_SKILLS][:2]
    line = "Career break, %s: took planned time away for %s." % (span, why)
    if skills:
        line += " Kept building %s." % " and ".join(skills)
    line += " Now returning to %s work with fresh training." % FIELDS[field_of(profile)]["label"].lower()
    return line


# ----------------------------------------------------------------- summary ---
def build_summary(profile):
    name = (profile.get("name") or "").strip()
    months = away_months(profile)
    role = target_role(profile)

    strengths = [{"text": s, "from": "career"} for s in _split_list(profile.get("strengths"))]
    for key in profile.get("breakSkills") or []:
        if key in BREAK_SKILLS:
            strengths.append({"text": BREAK_SKILLS[key]["skill"], "from": "break"})

    try:
        confidence = max(1, min(10, int(profile.get("confidence") or 5)))
    except (TypeError, ValueError):
        confidence = 5
    prep_hours = weeks_to_start(profile) * hours_per_week(profile)

    if confidence >= 7:
        confidence_note = "You already feel fairly ready. The plan keeps that momentum and fills the gaps."
    elif confidence >= 4:
        confidence_note = "Most returners start about where you are. Small weekly wins move this number quickly."
    else:
        confidence_note = "Starting low is normal and it is the number that changes fastest. The first two weeks are designed to be easy wins."

    worries = []
    for key in profile.get("worries") or []:
        if key in WORRIES:
            w = WORRIES[key]
            worries.append({"label": w["label"], "reply": w["reply"], "step": w["step"]})

    headline = "%syou have more to offer than when you left." % (name + ", " if name else "")
    if months is not None:
        away_note = "You have been away for %s. That is time spent building judgement, not losing it." % _duration_words(months)
    else:
        away_note = "Time away builds judgement, and employers are short of it."

    return {
        "headline": headline,
        "awayNote": away_note,
        "strengths": strengths[:9],
        "target": {
            "role": role,
            "schedule": profile.get("schedule") or "",
            "workStyle": profile.get("workStyle") or "",
            "location": (profile.get("location") or "").strip(),
            "priorities": profile.get("priorities") or [],
        },
        "confidence": confidence,
        "confidenceNote": confidence_note,
        "prepHours": prep_hours,
        "weeks": weeks_to_start(profile),
        "worries": worries,
        "gapLine": gap_line(profile),
        "firstSteps": [
            {"step": "interview", "text": "Do the skills interview so your roadmap fits your real life."},
            {"step": "courses", "text": "Pick one course from your list and start it this week."},
            {"step": "resume", "text": "Upload your resume and apply the top three edits."},
        ],
    }


# ----------------------------------------------------------------- courses ---
def pick_courses(profile):
    field = field_of(profile)
    worries = set(profile.get("worries") or [])
    try:
        confidence = int(profile.get("confidence") or 5)
    except (TypeError, ValueError):
        confidence = 5

    scored = []
    for index, course in enumerate(COURSES):
        tags = course["tags"]
        score = 0
        if field in tags:
            score += 10
        if "ai" in tags:
            score += 6 if ("tech" in worries or "skills" in worries) else 4
        if "digital" in tags and ("tech" in worries or field in ("admin", "other")):
            score += 5
        if "confidence" in tags and confidence <= 4:
            score += 5
        if "general" in tags:
            score += 1
        if course["cost"] == "Free":
            score += 1
        if score >= 4:
            scored.append((score, -index, course))
    scored.sort(reverse=True)

    budget = weeks_to_start(profile) * hours_per_week(profile)
    out = []
    for score, _, course in scored[:7]:
        item = dict(course)
        item["fieldMatch"] = field in course["tags"]
        item["fits"] = course["hours"] <= budget * 0.6
        out.append(item)
    return out


# ----------------------------------------------------------------- roadmap ---
_PHASES = [
    ("Find your footing", "Easy wins that get you moving again."),
    ("Rebuild", "Refresh skills and reconnect with people."),
    ("Go to market", "Apply, talk to recruiters and practise interviews."),
    ("Land well", "Set up the first weeks so the return sticks."),
]

_CAREER = {
    0: ["Write your gap line and add it to your resume (it is drafted in the Resume step).",
        "Run your resume through the Resume step and apply the top three edits.",
        "Add your career break to LinkedIn and update your headline to your target role."],
    1: ["Message three former colleagues to say you are returning. Ask how their team has changed.",
        "Have one informal chat with someone doing your target role today.",
        "Add your new course or certificate to the top of your resume and LinkedIn.",
        "Ask two people for a reference or a LinkedIn recommendation.",
        "Shortlist ten employers known for flexible or returner-friendly roles."],
    2: ["Open the Jobs step and apply to your five strongest matches.",
        "Message two recruiters at companies you applied to, using the drafted note.",
        "Apply to five more roles and follow up on last week's applications.",
        "Tailor your resume keywords to each posting before you send it.",
        "Look up the salary range for your target role and decide your number."],
    3: ["Agree your start plan: hours, a phased first month if you want one, and who your contact is.",
        "Ask your new manager what the first two weeks will look like."],
}

_CONFIDENCE = {
    0: ["Tell one person you trust that you are going back to work.",
        "Write down five hard things you handled during your break.",
        "Set up a quiet place and a regular time for your preparation hours."],
    1: ["Say your gap answer aloud three times until it sounds like you.",
        "Do one practice video call with a friend and check your setup.",
        "Write three stories from your career using situation, action and result.",
        "Talk through who will cover what at home once you start.",
        "Do something you used to be good at for an hour, purely to remember how it feels."],
    2: ["Do a full mock interview with a friend, including the gap question.",
        "Plan what you will wear and how you will get there for an interview.",
        "After each interview, write down one thing that went well.",
        "Do a trial run of the new routine for two days: childcare, commute, hours.",
        "Prepare three questions you will ask every employer about flexibility."],
    3: ["Run the full work-day routine for three days before you start.",
        "Plan something to look forward to at the end of your first week."],
}


def build_roadmap(profile):
    weeks = weeks_to_start(profile)
    hours = hours_per_week(profile)
    courses = pick_courses(profile)
    # Short, relevant courses first so there is an early finish to celebrate.
    study = sorted([c for c in courses if c["fits"]] or courses[:2], key=lambda c: c["hours"])[:3]

    # Phase lengths: roughly 25% / 40% / 25% / last week.
    last = 1
    first = max(1, round(weeks * 0.25))
    third = max(1, round(weeks * 0.25))
    second = max(1, weeks - first - third - last)
    lengths = [first, second, third, last]

    counters = {"career": [0, 0, 0, 0], "confidence": [0, 0, 0, 0]}
    learn_hours = max(1, round(hours * 0.5))
    remaining = [c["hours"] for c in study]
    course_index = 0

    def take(kind, phase):
        pool = (_CAREER if kind == "career" else _CONFIDENCE)[phase]
        i = counters[kind][phase]
        counters[kind][phase] += 1
        return pool[i % len(pool)]

    out = []
    start = _today()
    week_no = 0
    for phase, length in enumerate(lengths):
        for _ in range(length):
            week_no += 1
            if week_no == 1:
                learn = {"text": "Look through your course list and choose the one to start first.", "step": "courses"}
            elif course_index < len(study):
                course = study[course_index]
                finishing = remaining[course_index] <= learn_hours
                verb = "Finish" if finishing else ("Start" if remaining[course_index] == course["hours"] else "Continue")
                learn = {"text": "%s %s (%s)." % (verb, course["title"], course["provider"]), "url": course["url"]}
                remaining[course_index] -= learn_hours
                if finishing:
                    course_index += 1
            elif phase == 3:
                learn = {"text": "Read up on your new employer: their product, recent news and the tools they use."}
            else:
                learn = {"text": "Spend your learning time practising one tool your target roles ask for.", "step": "courses"}

            career_text = take("career", phase)
            career = {"text": career_text}
            if "Resume step" in career_text:
                career["step"] = "resume"
            elif "Jobs step" in career_text or "recruiters" in career_text:
                career["step"] = "jobs"

            out.append({
                "week": week_no,
                "starts": (start + datetime.timedelta(weeks=week_no - 1)).isoformat(),
                "phase": _PHASES[phase][0],
                "phaseNote": _PHASES[phase][1],
                "tasks": [
                    dict(learn, kind="Learn", hours=learn_hours),
                    dict(career, kind="Career", hours=max(1, round(hours * 0.35))),
                    {"kind": "Confidence", "text": take("confidence", phase), "hours": max(1, round(hours * 0.15))},
                ],
            })
    return {"weeks": out, "hoursPerWeek": hours, "totalWeeks": weeks}


# --------------------------------------------------------------- refresher ---
def build_refresher(profile):
    field = field_of(profile)
    left = _parse_month(profile.get("awayDate"))
    cutoff = "%04d-%02d" % (left.year, left.month) if left else "0000-00"
    items = []
    for scope, key in (("Your field", field), ("Every workplace", "general")):
        for item in REFRESHER.get(key, []):
            # Field items dated before the break still matter if they are checks to make.
            if item["date"] >= cutoff or item["title"].startswith("Check your"):
                items.append(dict(item, scope=scope))
    items.sort(key=lambda i: i["date"])
    return {
        "mode": "starter",
        "field": FIELDS[field]["label"],
        "since": cutoff if left else None,
        "items": items,
        "sources": [],
    }


# ------------------------------------------------------------------ resume ---
_OUTDATED = [
    (r"references?\s+(are\s+)?available\s+(up)?on\s+request", "Remove \"References available on request\"",
     "Employers assume this. The line takes space and dates the document."),
    (r"^\s*(career\s+)?objective\b", "Replace the objective with a summary",
     "Objective statements say what you want. A two or three line summary says what you offer."),
    (r"\b(date of birth|d\.?o\.?b\.?|marital status|nationality)\b", "Remove personal details",
     "Date of birth, marital status and similar details are not expected and can invite bias."),
    (r"\b(windows (xp|vista|7)|lotus notes|internet explorer|ms[- ]dos|flash|office (2003|2007|2010)|fax)\b",
     "Remove outdated tools", "Naming old software versions signals a gap. List current tools or leave versions out."),
    (r"\b(curriculum vitae|resume)\b\s*$", "Remove the document title",
     "The page does not need to be labelled. Lead with your name."),
]

_WEAK = [
    ("responsible for", "Led / Managed / Delivered"),
    ("duties included", "start with what you achieved"),
    ("helped with", "Supported / Contributed to, then say the result"),
    ("worked on", "Built / Improved / Delivered"),
    ("assisted in", "Supported, then say the result"),
]


def review_resume(profile, text):
    text = str(text or "")
    lower = text.lower()
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    words = len(re.findall(r"\w+", text))
    field = field_of(profile)
    role = target_role(profile)
    edits = []

    def add(severity, title, detail, before=None, after=None):
        edit = {"severity": severity, "title": title, "detail": detail}
        if before:
            edit["before"] = before[:220]
        if after:
            edit["after"] = after[:400]
        edits.append(edit)

    # 1. The gap.
    gap = gap_line(profile)
    if not re.search(r"career break|sabbatical|caregiv|parental leave|maternity|paternity|family leave|planned break", lower):
        add("high", "Name your career break",
            "An unexplained gap raises more questions than a stated one. Add it as its own entry in your experience section.",
            after=gap)

    # 2. Summary at the top.
    top = " ".join(lines[:6]).lower()
    has_summary = bool(re.search(r"\b(summary|profile|about me)\b", top))
    strengths = _split_list(profile.get("strengths"))[:3]
    summary = "%s returning to %s work, with strengths in %s. Recently refreshed skills through current training and ready to contribute from day one." % (
        (profile.get("lastRole") or role).strip().capitalize(),
        FIELDS[field]["label"].lower(),
        ", ".join(s.lower() for s in strengths) if strengths else "delivery, communication and problem solving",
    )
    if not has_summary:
        add("high", "Open with a short summary",
            "Recruiters spend seconds on a first read. Three lines at the top should say who you are, what you are good at and what you want next.",
            after=summary)

    # 3. Keywords for the target role.
    keywords = FIELDS[field]["keywords"]
    def has(word):
        return re.search(r"(?<![a-z])%s(?![a-z])" % re.escape(word), lower) is not None

    present = [k for k in keywords if has(k)]
    missing = [k for k in keywords if not has(k)]
    coverage = round(100 * len(present) / len(keywords)) if keywords else 100
    if missing and coverage < 70:
        add("high" if coverage < 40 else "medium", "Add the words current postings use",
            "Screening software ranks resumes by overlap with the job description. Add the ones that are true for you, in the context of real work: %s." % ", ".join(missing[:8]))

    # 4. Outdated content.
    for pattern, title, detail in _OUTDATED:
        m = re.search(pattern, text, flags=re.I | re.M)
        if m:
            line = next((l for l in lines if m.group(0).lower() in l.lower()), m.group(0))
            add("medium", title, detail, before=line)

    # 5. Weak phrasing.
    for phrase, better in _WEAK:
        line = next((l for l in lines if phrase in l.lower()), None)
        if line:
            add("medium", "Replace \"%s\"" % phrase,
                "This describes a duty. Start the line with a strong verb and end with a result. Try: %s." % better,
                before=line)

    # 6. Numbers.
    bullets = [l for l in lines if re.match(r"^[-•*·–]", l) or len(l.split()) > 6]
    with_numbers = [l for l in bullets if re.search(r"\d", l)]
    if bullets and len(with_numbers) < max(2, len(bullets) // 4):
        add("medium", "Add numbers to your achievements",
            "Only %d of about %d lines include a figure. Team size, budget, percentages and time saved make achievements believable." % (len(with_numbers), len(bullets)))

    # 7. Recent learning.
    this_year = _today().year
    if not re.search(r"\b(%d|%d)\b" % (this_year, this_year - 1), text):
        add("medium", "Show something recent",
            "Nothing on the page is dated %d or %d. Add a course, certificate or project from your plan near the top so the first thing a reader sees is current." % (this_year - 1, this_year))

    # 8. Transferable experience from the break.
    for key in profile.get("breakSkills") or []:
        if key in BREAK_SKILLS and BREAK_SKILLS[key]["skill"].split()[0].lower() not in lower:
            add("low", "Include %s" % BREAK_SKILLS[key]["skill"].lower(),
                "You said you did this regularly during your break. It can sit under the career break entry.",
                after=BREAK_SKILLS[key]["line"])
            if sum(1 for e in edits if e["severity"] == "low") >= 3:
                break

    # 9. Contact details and length.
    if not re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text):
        add("medium", "Add an email address", "There is no email address on the page.")
    if "linkedin.com" not in lower:
        add("low", "Add your LinkedIn profile link", "Recruiters look you up. Put the link beside your email.")
    if words > 900:
        add("low", "Shorten it", "At about %d words this runs past two pages. Trim roles older than 15 years to a single line each." % words)
    elif 0 < words < 150:
        add("medium", "Add more detail", "At about %d words there is not enough here to judge. Aim for three to five achievement lines per recent role." % words)

    order = {"high": 0, "medium": 1, "low": 2}
    edits.sort(key=lambda e: order[e["severity"]])
    penalty = sum({"high": 9, "medium": 4, "low": 1}[e["severity"]] for e in edits)
    return {
        "mode": "starter",
        "score": max(35, 100 - penalty),
        "targetRole": role,
        "coverage": coverage,
        "present": present,
        "missing": missing,
        "edits": edits,
        "gapLine": gap,
        "summary": summary,
    }
