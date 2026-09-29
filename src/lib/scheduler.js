// FocusFlow scheduling engine.
//
// A deterministic, explainable study-plan generator. It does NOT just divide
// topics equally: sessions are weighted by difficulty x priority, hard topics
// get more (and earlier) sessions, practice follows learning, and revision is
// spaced out with a final pass near the exam.
//
// Input:  { subjects, startDate, examDate, dailyHours }
// Output: { tasks, days, dailyMin, stats }
//
// Task: { id, date, subjectId, subjectName, topicId, topicName, difficulty,
//         priority, durationMin, activity, sessionLabel, reason, completed }

import { addDays, dateRange } from "./dateUtils.js";

const DIFF = {
  Easy: { learn: 1, practice: 1, sessionMin: 40, weight: 1.0 },
  Medium: { learn: 2, practice: 1, sessionMin: 50, weight: 1.6 },
  Hard: { learn: 3, practice: 2, sessionMin: 60, weight: 2.3 },
};
const PRI_WEIGHT = { Low: 0.8, Medium: 1.0, High: 1.35 };

let seq = 0;
function newId(prefix = "t") {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}`;
}

function scoreOf(topic) {
  return DIFF[topic.difficulty].weight * PRI_WEIGHT[topic.priority];
}

function flattenTopics(subjects) {
  const out = [];
  for (const s of subjects) {
    for (const t of s.topics || []) {
      out.push({ ...t, subjectId: s.id, subjectName: s.name });
    }
  }
  return out;
}

function validateInput({ subjects, startDate, examDate, dailyHours }) {
  if (!subjects || subjects.length === 0) throw new Error("Add at least one subject.");
  const topics = flattenTopics(subjects);
  if (topics.length === 0) throw new Error("Add at least one topic.");
  for (const s of subjects) {
    if (!s.name || !s.name.trim()) throw new Error("Every subject needs a name.");
    if (!s.topics || s.topics.length === 0) throw new Error(`"${s.name}" needs at least one topic.`);
    for (const t of s.topics) {
      if (!t.name || !t.name.trim()) throw new Error(`A topic in "${s.name}" is missing a name.`);
    }
  }
  if (!startDate || !examDate) throw new Error("Start date and exam date are required.");
  if (examDate < startDate) throw new Error("Exam date must be after the start date.");
  if (!dailyHours || dailyHours < 0.5 || dailyHours > 14)
    throw new Error("Daily study hours must be between 0.5 and 14.");
}

/** Per-topic session counts for a fresh plan. */
function fullSessionSpec(topic) {
  const d = DIFF[topic.difficulty];
  return { topic, learn: d.learn, practice: d.practice, revision: 2 };
}

function makeReason({ topic, activity, part, totalParts, dayIdx, totalDays }) {
  const t = topic.name;
  const pos = totalDays <= 1 ? "only" : dayIdx < Math.ceil(totalDays / 3) ? "early" : dayIdx >= Math.ceil((totalDays * 2) / 3) ? "late" : "mid";
  if (activity === "Learn") {
    const partTxt = totalParts > 1 ? ` (part ${part} of ${totalParts})` : "";
    if (topic.difficulty === "Hard" && topic.priority === "High")
      return `Hard, high-priority topic — learning it ${pos} in the plan${partTxt} leaves room for practice and revision later.`;
    if (topic.difficulty === "Hard")
      return `Hard topic${partTxt} — split into smaller sessions and placed ${pos} so it never piles up.`;
    if (topic.priority === "High")
      return `High-priority topic${partTxt} — scheduled ${pos} while your schedule still has slack.`;
    return `Learning session for ${t}${partTxt}, placed ${pos} in the plan.`;
  }
  if (activity === "Practice")
    return `Practice right after learning ${t} — solving problems now cements it far better than re-reading.`;
  return `Spaced revision of ${t} — recalling it after a gap is what moves it into long-term memory before the exam.`;
}

/**
 * Core scheduler. spec = [{ topic, learn, practice, revision }], days = [iso...].
 * Returns { tasks, overflowDays }.
 */
export function scheduleSessions(spec, days, dailyMin) {
  const n = days.length;
  const budget = days.map(() => dailyMin);
  const overflowDays = new Set();
  const tasks = [];

  const place = (job, earliestIdx, latestIdx = n - 1) => {
    // find the day with the most remaining budget in [earliestIdx, latestIdx]
    let best = -1;
    for (let i = earliestIdx; i <= Math.min(latestIdx, n - 1); i++) {
      if (budget[i] >= job.durationMin) {
        best = i;
        break; // earliest day with room — keeps things compact and chronological
      }
    }
    if (best === -1) {
      // nowhere fits: put it on the earliest allowed day with the most room left
      best = earliestIdx;
      for (let i = earliestIdx + 1; i <= Math.min(latestIdx, n - 1); i++) {
        if (budget[i] > budget[best]) best = i;
      }
      overflowDays.add(days[best]);
    }
    budget[best] -= job.durationMin;
    tasks.push({ ...job, date: days[best], dayIdx: best });
    return best;
  };

  // ---- Pass 1: Learn sessions, dealt round-robin across days ----
  // Sort by priority x difficulty so important/hard topics land on earlier days.
  const learnJobs = [];
  for (const { topic, learn } of spec) {
    const d = DIFF[topic.difficulty];
    for (let p = 1; p <= learn; p++) {
      learnJobs.push({ topic, activity: "Learn", durationMin: d.sessionMin, part: p, totalParts: learn, score: scoreOf(topic) });
    }
  }
  learnJobs.sort((a, b) => b.score - a.score); // stable in modern JS

  const learnDayOf = new Map(); // topicId -> [dayIdx...] (chronological)
  learnJobs.forEach((job, order) => {
    const startDay = order % n; // round-robin spreads load and interleaves subjects
    const dayIdx = place(job, startDay, n - 1);
    if (!learnDayOf.has(job.topic.id)) learnDayOf.set(job.topic.id, []);
    learnDayOf.get(job.topic.id).push(dayIdx);
  });
  for (const arr of learnDayOf.values()) arr.sort((a, b) => a - b);
  const lastLearnDay = (topicId) => {
    const arr = learnDayOf.get(topicId);
    return arr && arr.length ? arr[arr.length - 1] : 0;
  };

  // ---- Pass 2: Practice sessions, at least a day after learning ----
  for (const { topic, practice } of spec) {
    const d = DIFF[topic.difficulty];
    const earliest = Math.min(lastLearnDay(topic.id) + 1, n - 1);
    for (let p = 1; p <= practice; p++) {
      const dur = Math.max(30, d.sessionMin - 10);
      place({ topic, activity: "Practice", durationMin: dur, part: p, totalParts: practice }, earliest, n - 1);
    }
  }

  // ---- Pass 3: Revision sessions, spaced out, final one near the exam ----
  for (const { topic, revision } of spec) {
    const base = lastLearnDay(topic.id);
    for (let p = 1; p <= revision; p++) {
      const earliest = p === 1 ? Math.min(base + 2, n - 1) : Math.min(Math.max(base + 4, n - 3), n - 1);
      place({ topic, activity: "Revision", durationMin: 30, part: p, totalParts: revision }, earliest, n - 1);
    }
  }

  // Finalize task objects
  const finalTasks = tasks.map((j) => ({
    id: newId(),
    date: j.date,
    subjectId: j.topic.subjectId,
    subjectName: j.topic.subjectName,
    topicId: j.topic.id,
    topicName: j.topic.name,
    difficulty: j.topic.difficulty,
    priority: j.topic.priority,
    durationMin: j.durationMin,
    activity: j.activity,
    sessionLabel:
      j.totalParts > 1 ? `${j.activity} · Part ${j.part} of ${j.totalParts}` : j.activity,
    reason: makeReason({ topic: j.topic, activity: j.activity, part: j.part, totalParts: j.totalParts, dayIdx: j.dayIdx, totalDays: n }),
    completed: false,
  }));

  finalTasks.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { tasks: finalTasks, overflowDays: [...overflowDays].sort() };
}

export function generatePlan({ subjects, startDate, examDate, dailyHours }) {
  validateInput({ subjects, startDate, examDate, dailyHours });

  // Study days run from startDate up to (but not including) the exam day.
  let days = dateRange(startDate, addDays(examDate, -1));
  if (days.length === 0) days = [startDate]; // exam is today: single-day crunch plan

  const dailyMin = Math.max(30, Math.round(dailyHours * 60));
  const topics = flattenTopics(subjects);
  const spec = topics.map(fullSessionSpec);

  const { tasks, overflowDays } = scheduleSessions(spec, days, dailyMin);

  const totalMin = tasks.reduce((s, t) => s + t.durationMin, 0);
  const budgetMin = days.length * dailyMin;

  return {
    tasks,
    days,
    dailyMin,
    stats: {
      totalMin,
      budgetMin,
      overflowDays,
      topicCount: topics.length,
      subjectCount: subjects.length,
      tight: totalMin > budgetMin,
    },
  };
}

// Re-exported for tests
export { DIFF, PRI_WEIGHT, flattenTopics };
