# FocusFlow

**Turn your syllabus into a study plan that adapts.**

An AI-powered study planner for students. Enter your subjects, topics, exam date,
and daily study hours — FocusFlow generates a realistic day-by-day study plan with
learn / practice / revision sessions, tracks your progress, and rebuilds the plan
when you fall behind.

## Quick start

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
```

```bash
npm run build    # production build -> dist/
npm run preview  # serve the production build locally
npm test         # 24 scheduler tests + 16 UI render smoke tests
```

No backend, no sign-up, no database. Everything is stored in the browser's
`localStorage` (`focusflow:v1`), so the plan survives refreshes.

## How the plan generation works (honest version)

Out of the box, FocusFlow uses the **on-device Smart Scheduler**
(`src/providers/smartScheduler.js` + `src/lib/scheduler.js`) — a deterministic
scheduling engine, **not** an LLM call. The UI labels it as such. It:

- weighs every topic by **difficulty × priority** (hard + high-priority topics get
  more sessions and earlier slots — it never just divides topics equally),
- schedules **practice sessions after learning** and **spaced revision** with a
  final pass near the exam,
- balances subjects within each day and respects your daily hour budget,
- attaches a short **reason** to every session explaining its placement,
- warns honestly when the plan needs more hours than you have (days marked
  "over budget") instead of silently overloading you.

### Plugging in a real AI backend (optional)

If you want plans from an actual AI API, run a small secure backend and point the
app at it — your API key stays on the server and is never in frontend code:

```bash
# .env
VITE_AI_BACKEND_URL=http://localhost:8000
```

The backend must implement:

```
POST /api/generate-plan
Body: { subjects, startDate, examDate, dailyHours }
Response: { tasks: [ { date, subjectId, subjectName, topicId, topicName,
                       difficulty, priority, durationMin, activity,
                       sessionLabel, reason } ] }
```

Minimal FastAPI example:

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class PlanRequest(BaseModel):
    subjects: list
    startDate: str
    examDate: str
    dailyHours: float

@app.post("/api/generate-plan")
def generate_plan(req: PlanRequest):
    # call your AI API here (OpenAI / Gemini / etc.) with req.model_dump(),
    # parse its output into the task schema above, and return {"tasks": [...]}
    raise NotImplementedError("Wire your AI API call here")
```

See `src/providers/aiBackend.js` for the exact contract the frontend validates.

## Features

- **Landing page** — hero, feature cards, how-it-works, Create Study Plan / Try Demo.
- **Study plan setup** — dynamic subjects & topics (name, difficulty Easy/Medium/Hard,
  priority Low/Medium/High), exam date, daily hours. Inline validation.
- **Day-by-day plan** — date, subject, topic, duration, activity badge
  (Learn / Practice / Revision), priority, and a reason per session.
- **"I'm Falling Behind"** — enter missed days + incomplete topics; the remaining
  work is redistributed across your remaining days (never dumped on tomorrow).
  Completed sessions are preserved untouched.
- **Dashboard** — today's sessions, overall progress ring, topics completed,
  study hours done vs planned, exam countdown, day streak, upcoming sessions.
- **Task completion** — checkboxes everywhere update progress instantly and persist.
- **Demo mode** — one click loads a sample DSA / DBMS / Computer Networks schedule.
- **Persistence** — full state in `localStorage`; "Start over" clears it.

## Project structure

```
src/
  App.jsx                  # view state machine + persistence wiring
  index.css                # design system (cream/badam + pista green)
  components/
    Landing.jsx            # marketing/landing page
    SetupForm.jsx          # dynamic subjects/topics + schedule inputs
    PlanView.jsx           # day-by-day schedule
    Dashboard.jsx          # progress, streak, today's tasks
    FallingBehindModal.jsx # adaptive replanning dialog
    ui.jsx                 # buttons, cards, badges, progress
  lib/
    scheduler.js           # plan generation engine (tested)
    rescheduler.js         # "falling behind" redistribution (tested)
    dateUtils.js           # date helpers
    storage.js             # localStorage wrapper
  providers/
    index.js               # selects AI backend vs on-device scheduler
    smartScheduler.js      # default on-device provider
    aiBackend.js           # optional AI backend client (needs VITE_AI_BACKEND_URL)
  data/demoData.js         # sample schedule for demo mode
scripts/
  test-scheduler.mjs       # 24 unit tests for scheduler + rescheduler
  smoke-ssr.jsx            # 16 render smoke tests for all views
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `VITE_AI_BACKEND_URL` | No | Origin of your AI backend (e.g. `http://localhost:8000`). When unset, the on-device Smart Scheduler is used. |

Copy `.env.example` to `.env` to set it.

## Limitations / still to work on

- The default planner is algorithmic, not an LLM — genuinely useful, but it won't
  write you custom explanations or adapt to free-text constraints. That's what the
  AI-backend hook is for.
- No multi-device sync (localStorage only) and no accounts by design for the MVP.
- Streaks and "today" are calendar-day based in the browser's timezone.
- The rescheduler keeps completed sessions fixed; it doesn't yet let you
  reprioritize topics during replanning beyond the incomplete-topics picker.
- UI text is English-only for now.
