# 2-Minute Demo

The demo replays a real interview that was recorded with Gemini ahead of time. On stage it makes no Gemini calls, so every screen is instant and it does not use the free-tier limit.

## Setup (5 minutes before you go on stage)

Open two terminal windows in the `entry-back-into-workforce` folder.

**Once, if the interface is not built yet:**
```
cd web && npm install && npm run build && cd ..
```

**Terminal 1 — the interview API, in demo mode:**
```
INTERVIEW_DEMO=1 .venv/bin/python -m uvicorn app.main:app --port 8001
```

**Terminal 2 — the web app, in demo mode:**
```
INTERVIEW_DEMO=1 .venv/bin/python server.py
```

Then open `http://localhost:8000/#/demo` in the browser. It loads Melissa's onboarding answers and opens her summary. Zoom to about 125%.

In demo mode nothing calls Gemini: the questions come from `demo/recording.json`, and the courses and week-by-week plan use the app's built-in rules.

To run it again, open `http://localhost:8000/#/demo` again. It resets the interview.

## How the demo moves

- The interview has 10 screens. Melissa's answer is already selected on each one. You click **Continue** to move on.
- **Build my roadmap and courses** opens the roadmap: her skill profile and pathways, then a week-by-week plan.

## Timeline

| Time | Screen | You click | You say |
|---|---|---|---|
| 0:00–0:15 | Summary | Nothing | "This is Melissa. 38, Lehi, four kids. She taught second grade, then stayed home for twelve years. Her youngest just started kindergarten. She has opened LinkedIn twice and closed it twice." |
| 0:15–0:30 | 1. Activity checklist | **Skills interview**, then **Start conversation** | "It already knows her teaching background from onboarding, so it never asks twice. And we never ask 'what are your skills?' We ask what she *did*: PTA, the soccer schedule, the family budget." **Continue** |
| 0:30–0:40 | 2. PTA follow-up | **Continue** | "PTA vice president. $18,000 raised with 60 volunteers." |
| 0:40–0:50 | 3. Soccer schedule | **Continue** | Point at the intro: "Fundraising, volunteer coordination, event planning. Each answer becomes a professional skill." |
| 0:50–1:00 | 4. Family budget | **Continue** | "A 12-team league for 140 families. That is logistics work." |
| 1:00–1:05 | 5. Schedule | **Continue** | "A $95,000 budget, and the car paid off two years early." |
| 1:05–1:10 | 6. Childcare | **Continue** | "School hours only. That is a fixed input, not a problem to argue with." |
| 1:10–1:25 | 7. Day-to-day appeal | Pause, then **Continue** | Read the top of the intro: "You translated your time at home into 8 professional skills." "This is where she stops saying 'I have no skills.'" |
| 1:25–1:30 | 8. Pay | **Continue** | "What a job needs to pay to make sense for her family." |
| 1:30–1:35 | 9. Ranking | **Continue** | "She ranks what matters most: a flexible schedule first. Her number one never breaks." |
| 1:35–1:40 | 10. Closing | **Build my roadmap and courses** | "It sums up her evidence." |
| 1:40–1:55 | The plan | Scroll to **Pathways to explore** | "Three pathways. Each says why it fits *her*, what it takes, a first step with a Utah resource, and what it could not verify." |
| 1:55–2:00 | The plan | Nothing | "Every claim comes from her own answers. Melissa leaves with a plan, not a reading list." |

Each screen's intro comments on the answer before it. So when you say a line, you talk about the screen that just appeared.

## If something goes wrong

- **"Conversation server unavailable":** Terminal 1 is not running. Start it again.
- **A real Gemini error, or a question that is not Melissa's:** Terminal 1 runs without `INTERVIEW_DEMO=1`. Stop it and start it again with the command above.
- **Port 8000 is already in use:** another copy of `server.py` runs. Stop it, or start with `PORT=8010 .venv/bin/python server.py` and open `http://localhost:8010/#/demo`.
- **Old answers show:** open `#/demo` again.

## How the recording works

- `demo/user.json` holds Melissa's onboarding answers and her answer bank.
- `demo/record.py` ran the interview against real Gemini, one step at a time, and saved each response with her answer to `demo/recording.json`. The recording keeps 10 of the 18 recorded screens; the cut questions are left out of the demo.
- In demo mode, `app/interview.py` returns recorded step N when the conversation has N answers, and the recorded roadmap for the plan.
- To record again: `python demo/record.py reset`, then `python demo/record.py answer --start` and `answer "<her answer>"` for each step, then `python demo/record.py roadmap`. It needs about 19 Gemini calls.
