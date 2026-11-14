# 2-Minute Demo

The demo replays a real interview that was recorded with Gemini ahead of time. On stage it makes no Gemini calls, so every screen is instant and it does not use the free-tier limit.

## Setup (5 minutes before you go on stage)

Open two terminal windows in the `entry-back-into-workforce` folder.

**Terminal 1 — the interview API, in demo mode:**
```
INTERVIEW_DEMO=1 .venv/bin/python -m uvicorn app.main:app --port 8001
```

**Terminal 2 — the web app:**
```
.venv/bin/python server.py
```

Then, in the browser:

1. Open `http://localhost:8000/#/demo`. It loads Melissa's onboarding answers and opens her summary.
2. Zoom to about 125% so the room can read it.
3. Click **Skills interview** in the top bar once, to check that the **Start conversation** button shows. Then click **Summary** to go back.

To run it again, open `http://localhost:8000/#/demo` again. It resets the interview.

## How the demo moves

- Melissa's answer is already selected on every question. You only click **Continue**.
- The demo stops only on six highlights. The questions between them answer themselves in a fraction of a second.
- **Build my plan** shows the recorded plan at once.

## Timeline

| Time | Screen | You click | You say |
|---|---|---|---|
| 0:00–0:15 | Summary | Nothing | "This is Melissa. 38, Lehi, four kids. She taught second grade, then stayed home for twelve years. Her youngest just started kindergarten. She has opened LinkedIn twice and closed it twice." |
| 0:15–0:30 | **Stop 1:** first question | **Skills interview**, then **Start conversation** | Point at the first line: "Coming back to paid work after years at home is hard and very common, and you're in the right place." Then: "It already knows her last job from onboarding. It never asks her twice." |
| 0:30–0:45 | **Stop 2:** activity checklist | **Continue** | "We never ask 'what are your skills?' We ask what she *did*." Point at her picks: PTA, the soccer schedule, the family budget. |
| 0:45–0:55 | **Stop 3:** PTA follow-up | **Continue** | "Raising $18,000 with 60 volunteers. That is fundraising, event planning, and volunteer coordination." |
| 0:55–1:15 | **Stop 4:** the payoff | **Continue** | Read it: "You translated your time at home into 8 professional skills." "This is the moment she stops saying 'I have no skills.'" |
| 1:15–1:25 | **Stop 5:** the ranking | **Continue** | "She ranks what matters most: a flexible schedule first. Her number one never breaks." |
| 1:25–1:35 | **Stop 6:** closing | **Continue** | "It sums up her evidence: 22 of 26 second graders reading at grade level, a $95,000 budget, a 12-team league." |
| 1:35–1:55 | The plan | **Build my plan**, then scroll to **Pathways to explore** | "Three pathways. Each says why it fits *her*, what it takes, a first step with a Utah resource, and what it could not verify." |
| 1:55–2:00 | The plan | Nothing | "Every claim comes from her own answers. Melissa leaves with a plan, not a reading list." |

## If something goes wrong

- **"Conversation server unavailable":** Terminal 1 is not running. Start it again.
- **A real Gemini error, or a question that is not Melissa's:** Terminal 1 runs without `INTERVIEW_DEMO=1`. Stop it and start it again with the command above.
- **Port 8000 is already in use:** another copy of `server.py` runs. Stop it, or start with `PORT=8010 .venv/bin/python server.py` and open `http://localhost:8010/#/demo`.
- **Old answers show:** open `#/demo` again.

## How the recording works

- `demo/user.json` holds Melissa's onboarding answers and her answer bank.
- `demo/record.py` ran the interview against real Gemini, one step at a time, and saved each response with her answer to `demo/recording.json`. Steps with `"highlight": true` are the six stops.
- In demo mode, `app/interview.py` returns recorded step N when the conversation has N answers, and the recorded roadmap for the plan.
- To record again: `python demo/record.py reset`, then `python demo/record.py answer --start` and `answer "<her answer>"` for each step, then `python demo/record.py roadmap`. It needs about 19 Gemini calls.
