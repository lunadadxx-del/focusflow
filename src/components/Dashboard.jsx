import { useMemo } from "react";
import { Button, Card, Badge, ProgressRing, ProgressBar, EmptyState } from "./ui.jsx";
import { todayISO, diffDays, formatLong, addDays } from "../lib/dateUtils.js";

function computeStreak(plan) {
  const doneByDate = new Map();
  for (const t of plan) {
    if (t.completed) doneByDate.set(t.date, (doneByDate.get(t.date) || 0) + 1);
  }
  let streak = 0;
  let day = todayISO();
  // allow the streak to be "alive" if yesterday was the last active day
  if (!doneByDate.has(day)) day = addDays(day, -1);
  while (doneByDate.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

export default function Dashboard({ plan, profile, onToggleTask, onGoPlan, onFallingBehind }) {
  const today = todayISO();

  const stats = useMemo(() => {
    const total = plan.length;
    const done = plan.filter((t) => t.completed);
    const doneMin = done.reduce((s, t) => s + t.durationMin, 0);
    const plannedMin = plan.reduce((s, t) => s + t.durationMin, 0);

    const topicState = new Map(); // topicId -> { name, subjectName, total, done }
    for (const t of plan) {
      if (!topicState.has(t.topicId))
        topicState.set(t.topicId, { name: t.topicName, subjectName: t.subjectName, total: 0, done: 0 });
      const s = topicState.get(t.topicId);
      s.total += 1;
      if (t.completed) s.done += 1;
    }
    const topics = [...topicState.values()];
    const topicsDone = topics.filter((t) => t.done === t.total).length;

    const todayTasks = plan.filter((t) => t.date === today);
    const upcoming = plan
      .filter((t) => t.date > today && !t.completed)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(0, 5);

    const daysLeft = Math.max(0, diffDays(today, profile.examDate));

    return { total, doneCount: done.length, doneMin, plannedMin, topicsDone, topicsTotal: topics.length, todayTasks, upcoming, daysLeft, streak: computeStreak(plan) };
  }, [plan, profile, today]);

  if (!plan || plan.length === 0) {
    return (
      <EmptyState
        title="No data yet"
        body="Generate a study plan first — your dashboard will come alive here."
        action={<Button onClick={onGoPlan}>Create a plan</Button>}
      />
    );
  }

  const hours = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;

  return (
    <div>
      <h2 className="ff-section-title">Dashboard</h2>
      <p className="ff-section-sub">
        {stats.daysLeft === 0
          ? "Your exam is today. Good luck — you've got this. 🍀"
          : `${stats.daysLeft} day${stats.daysLeft === 1 ? "" : "s"} left until your exam (${formatLong(profile.examDate)}).`}
      </p>

      <div className="ff-stats">
        <div className="ff-stat">
          <div className="ff-stat-value">{stats.streak} 🔥</div>
          <div className="ff-stat-label">day streak</div>
        </div>
        <div className="ff-stat">
          <div className="ff-stat-value">{hours(stats.doneMin)}</div>
          <div className="ff-stat-label">studied ({hours(stats.plannedMin)} planned)</div>
        </div>
        <div className="ff-stat">
          <div className="ff-stat-value">{stats.topicsDone}/{stats.topicsTotal}</div>
          <div className="ff-stat-label">topics completed</div>
        </div>
        <div className="ff-stat">
          <div className="ff-stat-value">{stats.total - stats.doneCount}</div>
          <div className="ff-stat-label">sessions remaining</div>
        </div>
      </div>

      <div className="ff-dash-grid">
        <Card>
          <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Today's sessions</h3>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "#8a8171" }}>
            {stats.todayTasks.length === 0
              ? "Nothing scheduled for today — enjoy the breather, or get ahead."
              : `${stats.todayTasks.filter((t) => t.completed).length}/${stats.todayTasks.length} done`}
          </p>
          {stats.todayTasks.map((t) => (
            <div className="ff-today-task" key={t.id}>
              <button
                className={`ff-check${t.completed ? " done" : ""}`}
                onClick={() => onToggleTask(t.id)}
                title={t.completed ? "Mark as not done" : "Mark as complete"}
              >
                {t.completed ? "✓" : ""}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, textDecoration: t.completed ? "line-through" : "none", opacity: t.completed ? 0.6 : 1 }}>
                  {t.topicName}
                </div>
                <div style={{ fontSize: 12.5, color: "#8a8171" }}>
                  {t.subjectName} · {t.sessionLabel} · {t.durationMin} min
                </div>
              </div>
              <Badge kind={t.activity.toLowerCase()}>{t.activity}</Badge>
            </div>
          ))}
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button size="small" variant="secondary" onClick={onGoPlan}>View full plan</Button>
            <Button size="small" variant="ghost" onClick={onFallingBehind}>I'm Falling Behind</Button>
          </div>
        </Card>

        <div>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Overall progress</h3>
            <div className="ff-ring-wrap">
              <ProgressRing value={stats.doneCount} max={Math.max(1, stats.total)} label="sessions" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 650, marginBottom: 6 }}>
                  {stats.doneCount} of {stats.total} sessions complete
                </div>
                <ProgressBar value={stats.doneCount} max={Math.max(1, stats.total)} />
                <div style={{ fontSize: 12.5, color: "#8a8171", marginTop: 8 }}>
                  {stats.topicsTotal - stats.topicsDone} of {stats.topicsTotal} topics still in progress
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Coming up</h3>
            {stats.upcoming.length === 0 ? (
              <p style={{ fontSize: 13.5, color: "#8a8171", margin: 0 }}>
                Nothing left scheduled — you're done! 🎉
              </p>
            ) : (
              stats.upcoming.map((t) => (
                <div className="ff-today-task" key={t.id}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 650, fontSize: 13.5 }}>{t.topicName}</div>
                    <div style={{ fontSize: 12.5, color: "#8a8171" }}>
                      {t.subjectName} · {t.sessionLabel} · {t.durationMin} min
                    </div>
                  </div>
                  <Badge kind="neutral">{t.date === addDays(today, 1) ? "Tomorrow" : t.date.slice(5)}</Badge>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
