# 2-Minute Demo

The demo replays a real interview that was recorded with Gemini ahead of time. On stage it makes no Gemini calls, so it is instant and does not use the free-tier limit.

## Setup (before you go on stage)

1. Start both servers in demo mode:
   ```
   INTERVIEW_DEMO=1 uvicorn app.main:app --port 8001
   python3 server.py
   ```
2. Open `http://localhost:8000/#/demo`. This loads Melissa's onboarding answers and opens her summary.
3. Zoom the browser to about 125% so the room can read it.

In demo mode, each question arrives with Melissa's answer already selected. Click **Continue** to move on. You can also tap a different option; the next screen is still the recorded one.

## Timeline

| Time | Screen | What you do | What you say |
|---|---|---|---|
| 0:00–0:15 | Landing page | Nothing | "This is Melissa. 38, Lehi, four kids. She taught second grade for five years, then stayed home for twelve. Her youngest just started kindergarten. She has opened LinkedIn twice and closed it twice." |
| 0:15–0:25 | Summary | Show the onboarding summary | "She answered eight quick questions. Now she meets the coach." |
| 0:25–0:40 | Skills interview, first question | Click **Start conversation** | Read the first line out loud: it says going back is hard and very common. "It never asks her again what onboarding already told it." |
| 0:40–1:05 | Activity checklist and follow-ups | **Continue** through the checklist and its follow-ups | "We never ask 'what are your skills?' We ask what she *did*. PTA, the soccer league, the family budget. Each answer becomes a professional skill." Pause on the Part 2 payoff: "She just found N professional skills." |
| 1:05–1:20 | Part 3 and the ranking | **Continue** quickly; slow down on the ranking | "She ranks what matters most. Her number one never breaks." |
| 1:20–1:45 | Roadmap | Click **Build my plan**; scroll to **Pathways to explore** | "Three real pathways, each with why it fits *her*, what it takes, and a first step with a Utah resource. And it tells her what it could not verify." |
| 1:45–2:00 | Roadmap | Stop scrolling | "Every claim comes from her own answers. Melissa leaves with a plan, not a reading list." |

## If something goes wrong

- **A screen shows an error:** the API server is not in demo mode or is not running. Restart it with `INTERVIEW_DEMO=1`.
- **The interview shows old answers:** open `#/demo` again. It resets the interview.

## How the recording works

- `demo/user.json` holds Melissa's onboarding answers and her answer bank for the interview.
- `demo/record.py` runs the interview against real Gemini, one step at a time, and saves each Gemini response with the answer Melissa gave to `demo/recording.json`.
- In demo mode, `app/interview.py` returns step N of the recording when the conversation has N answers, and the recorded roadmap for the plan.
