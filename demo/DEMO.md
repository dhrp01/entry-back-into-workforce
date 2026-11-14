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

- The interview has 6 screens, all about what Melissa did as a mom. Her answer is already filled in: buttons on some screens, a short typed answer on others. You click **Continue** to move on.
- **Build my roadmap and courses** opens the roadmap: her skill profile and pathways, then a week-by-week plan with up to 4 courses.

## Timeline

| Time | Screen | You click | You say |
|---|---|---|---|
| 0:00–0:20 | Summary | Nothing | "This is Melissa. 38, Lehi, four kids. She taught second grade, then stayed home for twelve years. Her youngest just started kindergarten. She has opened LinkedIn twice and closed it twice." |
| 0:20–0:40 | 1. What she did at home | **Skills interview**, then **Start conversation** | "We never ask a mom 'what are your skills?' She says 'nothing.' We ask what she *did*: PTA, the soccer schedule, the family budget." **Continue** |
| 0:40–0:55 | 2. PTA | **Continue** | "PTA vice president. Her fun run raised $18,000 with 60 volunteers. That is fundraising and volunteer management." |
| 0:55–1:10 | 3. Soccer league | **Continue** | "She ran the league schedule: 12 teams, 140 families. That is logistics work companies pay for." |
| 1:10–1:20 | 4. School hours | **Continue** | "School hours only. For a mom, that is a fixed input, not a problem to argue with." |
| 1:20–1:40 | 5. The payoff | Pause on the intro, then **Continue** | Read it: "You translated your time at home into 8 professional skills." "This is the moment she stops saying 'I have no skills.'" |
| 1:40–1:45 | 6. Closing | **Build my roadmap and courses** | "It sums up her evidence." |
| 1:45–2:00 | Roadmap | Scroll to the pathways | "Real pathways that fit school hours, each with why it fits *her*. Melissa leaves with a plan, not a reading list." |

## If something goes wrong

- **"Conversation server unavailable":** Terminal 1 is not running. Start it again.
- **A real Gemini error, or a question that is not Melissa's:** Terminal 1 runs without `INTERVIEW_DEMO=1`. Stop it and start it again with the command above.
- **Port 8000 is already in use:** another copy of `server.py` runs. Stop it, or start with `PORT=8010 .venv/bin/python server.py` and open `http://localhost:8010/#/demo`.
- **Old answers show:** open `#/demo` again.

## How the recording works

- `demo/user.json` holds Melissa's onboarding answers and her answer bank.
- `demo/record.py` ran the interview against real Gemini, one step at a time, and saved each response with her answer to `demo/recording.json`. The demo keeps 6 of the 18 recorded screens, the ones about her time as a mom.
- In demo mode, `app/interview.py` returns recorded step N when the conversation has N answers, and the recorded roadmap for the plan.
- To record again: `python demo/record.py reset`, then `python demo/record.py answer --start` and `answer "<her answer>"` for each step, then `python demo/record.py roadmap`. It needs about 19 Gemini calls.
