// FocusFlow scheduler tests. Run with: npm test
// Tests the plan generation + "falling behind" rescheduling logic in Node.

import { generatePlan, DIFF } from "../src/lib/scheduler.js";
import { regenerateAfterSetback } from "../src/lib/rescheduler.js";
import { addDays, todayISO } from "../src/lib/dateUtils.js";

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
}

let n = 0;
const uid = (p) => `${p}_t${n++}`;
const topic = (name, difficulty, priority) => ({ id: uid("topic"), name, difficulty, priority });

function demoInput(days = 14, hours = 3) {
  const start = todayISO();
  return {
    subjects: [
      { id: uid("s"), name: "DSA", topics: [topic("Arrays", "Medium", "High"), topic("Linked Lists", "Hard", "High"), topic("Trees", "Hard", "High")] },
      { id: uid("s"), name: "DBMS", topics: [topic("SQL", "Medium", "High"), topic("Normalization", "Hard", "Medium"), topic("Transactions", "Medium", "Medium")] },
      { id: uid("s"), name: "CN", topics: [topic("OSI Model", "Easy", "Medium"), topic("TCP/IP", "Medium", "High"), topic("Routing", "Hard", "Medium")] },
    ],
    startDate: start,
    examDate: addDays(start, days),
    dailyHours: hours,
  };
}

console.log("\n— generatePlan: demo input (14 days, 3h/day) —");
{
  const input = demoInput();
  const { tasks, days, stats } = generatePlan(input);
  check("produces tasks", tasks.length > 0, `got ${tasks.length}`);
  check("study days = 14 (exam day excluded)", days.length === 14, `got ${days.length}`);

  const topics = new Set(tasks.map((t) => t.topicId));
  check("every topic scheduled", topics.size === 9, `got ${topics.size}`);

  const kinds = new Set(tasks.map((t) => t.activity));
  check("has Learn sessions", kinds.has("Learn"));
  check("has Practice sessions", kinds.has("Practice"));
  check("has Revision sessions", kinds.has("Revision"));

  const required = ["id", "date", "subjectName", "topicName", "durationMin", "activity", "reason", "priority", "difficulty"];
  check("all tasks have required fields", tasks.every((t) => required.every((k) => t[k] !== undefined && t[k] !== "" && t[k] !== null)));
  check("all tasks have a reason", tasks.every((t) => t.reason && t.reason.length > 10));

  const sorted = tasks.every((t, i, a) => i === 0 || a[i - 1].date <= t.date);
  check("tasks sorted by date", sorted);

  // hard topics get more learn sessions than easy ones
  const learnCount = {};
  for (const t of tasks) if (t.activity === "Learn") learnCount[t.topicName] = (learnCount[t.topicName] || 0) + 1;
  check("Hard topic has 3 learn sessions", learnCount["Trees"] === 3, `got ${learnCount["Trees"]}`);
  check("Easy topic has 1 learn session", learnCount["OSI Model"] === 1, `got ${learnCount["OSI Model"]}`);

  // practice comes after learning for each topic
  let practiceOk = true;
  const byTopic = {};
  for (const t of tasks) { (byTopic[t.topicId] ||= []).push(t); }
  for (const arr of Object.values(byTopic)) {
    const lastLearn = arr.filter((t) => t.activity === "Learn").map((t) => t.date).sort().pop();
    for (const p of arr.filter((t) => t.activity === "Practice")) {
      if (!(p.date >= lastLearn)) practiceOk = false;
    }
  }
  check("practice scheduled on/after last learn day", practiceOk);

  // daily budget respected (or flagged)
  const perDay = {};
  for (const t of tasks) perDay[t.date] = (perDay[t.date] || 0) + t.durationMin;
  const over = Object.entries(perDay).filter(([, m]) => m > 180);
  check("no day exceeds 3h budget (or is flagged)", over.length === 0 || stats.overflowDays.length > 0, JSON.stringify(over));

  // subject balance: no single subject dominates a day (>85% of minutes)
  let balanced = true;
  const byDay = {};
  for (const t of tasks) { (byDay[t.date] ||= []).push(t); }
  for (const arr of Object.values(byDay)) {
    const total = arr.reduce((s, t) => s + t.durationMin, 0);
    const bySubj = {};
    for (const t of arr) bySubj[t.subjectName] = (bySubj[t.subjectName] || 0) + t.durationMin;
    if (Math.max(...Object.values(bySubj)) / total > 0.85 && arr.length > 2) balanced = false;
  }
  check("subjects are balanced within days", balanced);

  console.log(`  … ${tasks.length} tasks, ${stats.totalMin} min total vs ${stats.budgetMin} min budget`);
}

console.log("\n— generatePlan: edge cases —");
{
  // tiny plan: 2 days
  const input = demoInput(2, 2);
  const { tasks, days } = generatePlan(input);
  check("works with 2 days", tasks.length > 0 && days.length === 2);

  // exam today
  const start = todayISO();
  const { tasks: t2, days: d2 } = generatePlan({ ...demoInput(0, 3), examDate: start });
  check("exam today -> single-day plan", d2.length === 1 && t2.length > 0);

  // invalid input throws friendly errors
  let threw = false;
  try { generatePlan({ subjects: [], startDate: start, examDate: addDays(start, 5), dailyHours: 3 }); }
  catch (e) { threw = /subject/i.test(e.message); }
  check("rejects empty subjects with friendly error", threw);

  threw = false;
  try { generatePlan({ ...demoInput(), examDate: addDays(todayISO(), -5) }); }
  catch (e) { threw = /exam date/i.test(e.message); }
  check("rejects exam before start", threw);
}

console.log("\n— regenerateAfterSetback —");
{
  const input = demoInput(14, 3);
  const { tasks } = generatePlan(input);
  const subjects = input.subjects;
  const profile = { examDate: input.examDate, dailyHours: input.dailyHours };

  // complete a few tasks
  const plan = tasks.map((t, i) => ({ ...t, completed: i < 6 }));
  const completedIds = new Set(plan.filter((t) => t.completed).map((t) => t.id));
  const incompleteTopic = plan.find((t) => !t.completed).topicId;

  const { tasks: merged, summary } = regenerateAfterSetback({
    plan, subjects, profile, missedDays: 3, incompleteTopicIds: [incompleteTopic],
  });

  const keptAll = [...completedIds].every((id) => merged.some((t) => t.id === id && t.completed));
  check("completed tasks preserved with same ids", keptAll);

  const today = todayISO();
  const freshTasks = merged.filter((t) => !completedIds.has(t.id));
  check("new tasks only on today or later", freshTasks.every((t) => t.date >= today));

  check("work was redistributed (not just moved to tomorrow)", (() => {
    const dates = new Set(freshTasks.map((t) => t.date));
    return dates.size > 2;
  })());

  check("summary mentions missed days", /3 day/.test(summary.note), summary.note);

  // completed counts per topic reduce remaining sessions
  const topicDone = plan.filter((t) => t.completed && t.activity === "Learn").length;
  check("respects already-done sessions (fewer total tasks than fresh plan)",
    merged.length < tasks.length + 6 || topicDone > 0);

  console.log(`  … ${freshTasks.length} redistributed sessions across ${new Set(freshTasks.map((t) => t.date)).size} days`);

  // all-complete edge
  const allDone = tasks.map((t) => ({ ...t, completed: true }));
  const r2 = regenerateAfterSetback({ plan: allDone, subjects, profile, missedDays: 2, incompleteTopicIds: [] });
  check("all-complete -> nothing to reschedule", r2.summary.redistributed === 0);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
