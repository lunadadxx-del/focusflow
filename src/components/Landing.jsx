import { Button } from "./ui.jsx";

export default function Landing({ onCreate, onDemo, hasSavedPlan, onResume }) {
  return (
    <div>
      <section className="ff-hero">
        <div className="ff-kicker">FocusFlow</div>
        <h1>
          Turn your syllabus into a <em>study plan</em> that adapts.
        </h1>
        <p>
          Enter your subjects, topics, and exam date. FocusFlow builds a realistic
          day-by-day schedule — weighted by difficulty and priority, with practice
          and revision baked in. Fall behind? It rebuilds the plan around the days
          you have left.
        </p>
        <div className="ff-hero-actions">
          <Button onClick={onCreate}>Create Study Plan</Button>
          <Button variant="secondary" onClick={onDemo}>Try Demo</Button>
          {hasSavedPlan && (
            <Button variant="ghost" onClick={onResume}>Resume my plan →</Button>
          )}
        </div>
      </section>

      <section className="ff-features">
        <div className="ff-feature">
          <div className="ff-feature-icon">🗓️</div>
          <h3>Realistic day-by-day plans</h3>
          <p>
            Sessions are distributed across your available days and daily hours —
            hard, high-priority topics get more time and earlier slots.
          </p>
        </div>
        <div className="ff-feature">
          <div className="ff-feature-icon">🔁</div>
          <h3>Practice + spaced revision</h3>
          <p>
            Every topic gets practice sessions after learning, and revision
            sessions spaced out so you actually remember things.
          </p>
        </div>
        <div className="ff-feature">
          <div className="ff-feature-icon">🧭</div>
          <h3>Adapts when life happens</h3>
          <p>
            Missed a few days? Tell FocusFlow what slipped and it regenerates the
            remaining plan around the days you still have.
          </p>
        </div>
      </section>

      <section className="ff-how">
        <h2 className="ff-section-title">How it works</h2>
        <p className="ff-section-sub">Three steps. No sign-up, everything stays in your browser.</p>
        <div className="ff-steps">
          <div className="ff-card ff-step">
            <div className="ff-step-num">1</div>
            <h3 style={{ margin: "0 0 6px", fontSize: 15.5 }}>Add your syllabus</h3>
            <p style={{ margin: 0, fontSize: 13.5, color: "#8a8171" }}>
              Subjects, topics, difficulty, priority, exam date, and how many
              hours you can study each day.
            </p>
          </div>
          <div className="ff-card ff-step">
            <div className="ff-step-num">2</div>
            <h3 style={{ margin: "0 0 6px", fontSize: 15.5 }}>Get your plan</h3>
            <p style={{ margin: 0, fontSize: 13.5, color: "#8a8171" }}>
              A day-by-day schedule with learn, practice, and revision sessions —
              each with a reason explaining why it's placed there.
            </p>
          </div>
          <div className="ff-card ff-step">
            <div className="ff-step-num">3</div>
            <h3 style={{ margin: "0 0 6px", fontSize: 15.5 }}>Track & adapt</h3>
            <p style={{ margin: 0, fontSize: 13.5, color: "#8a8171" }}>
              Check off sessions, watch your progress, and hit "I'm Falling
              Behind" to rebuild the plan whenever needed.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
