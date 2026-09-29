// "I'm Falling Behind" — adaptive replanning.
//
// The user tells us how many days they missed and which topics are incomplete.
// We keep every completed task exactly as-is, compute the *remaining* sessions
// for every topic that still has unfinished work, and redistribute that work
// across the *remaining* days (today -> day before exam). Work is spread by
// the same weighted scheduler — never just dumped onto the next day.

import { addDays, dateRange, todayISO } from "./dateUtils.js";
import { DIFF, flattenTopics, scheduleSessions } from "./scheduler.js";

/**
 * @param {Object} args
 * @param {Array}  args.plan        current task list
 * @param {Array}  args.subjects    subject/topic definitions (for difficulty/priority)
 * @param {Object} args.profile     { examDate, dailyHours }
 * @param {number} args.missedDays  how many days the user missed (for the summary)
 * @param {Array}  args.incompleteTopicIds  topic ids the user flagged as incomplete
 * @returns { tasks, summary }
 */
export function regenerateAfterSetback({ plan, subjects, profile, missedDays, incompleteTopicIds }) {
  const today = todayISO();
  const lastStudy = addDays(profile.examDate, -1);
  const remainingDays = dateRange(today, lastStudy);

  if (remainingDays.length === 0) {
    throw new Error("There are no study days left before your exam. Consider moving the exam date.");
  }

  const completed = plan.filter((t) => t.completed);
  const topicById = new Map(flattenTopics(subjects).map((t) => [t.id, t]));
  const flagged = new Set(incompleteTopicIds || []);

  // Count completed sessions per topic per activity.
  const doneCount = new Map(); // topicId -> { Learn, Practice, Revision }
  for (const t of completed) {
    if (!doneCount.has(t.topicId)) doneCount.set(t.topicId, { Learn: 0, Practice: 0, Revision: 0 });
    const c = doneCount.get(t.topicId);
    if (c[t.activity] !== undefined) c[t.activity] += 1;
  }

  // Remaining work: every topic with at least one uncompleted task,
  // OR explicitly flagged incomplete by the user.
  const remainingTopicIds = new Set();
  for (const t of plan) {
    if (!t.completed) remainingTopicIds.add(t.topicId);
  }
  for (const id of flagged) remainingTopicIds.add(id);

  const dailyMin = Math.max(30, Math.round(profile.dailyHours * 60));
  const spec = [];
  for (const topicId of remainingTopicIds) {
    const topic = topicById.get(topicId);
    if (!topic) continue; // topic was deleted from setup; skip
    const d = DIFF[topic.difficulty];
    const done = doneCount.get(topicId) || { Learn: 0, Practice: 0, Revision: 0 };
    const learn = Math.max(0, d.learn - done.Learn);
    const practice = Math.max(0, d.practice - done.Practice);
    // Revision: keep at least 1 if none done yet, so nothing is left unrevised.
    const revision = done.Revision >= 2 ? 0 : done.Revision >= 1 ? 1 : 2;
    if (learn + practice + revision === 0) continue;
    spec.push({ topic, learn, practice, revision });
  }

  if (spec.length === 0) {
    return {
      tasks: [...completed].sort((a, b) => (a.date < b.date ? -1 : 1)),
      summary: {
        missedDays,
        redistributed: 0,
        remainingDays: remainingDays.length,
        overflowDays: [],
        note: "Everything is already complete — nothing to reschedule.",
      },
    };
  }

  const { tasks: fresh, overflowDays } = scheduleSessions(spec, remainingDays, dailyMin);

  const merged = [...completed, ...fresh].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );

  const redistributed = fresh.length;
  const tight = overflowDays.length > 0;

  return {
    tasks: merged,
    summary: {
      missedDays,
      redistributed,
      remainingDays: remainingDays.length,
      overflowDays,
      note: tight
        ? `You missed ${missedDays} day(s). I redistributed ${redistributed} remaining sessions across the ${remainingDays.length} day(s) left. Heads up: ${overflowDays.length} day(s) now exceed your daily ${profile.dailyHours}h — consider adding study time or trimming topics.`
        : `You missed ${missedDays} day(s). I redistributed ${redistributed} remaining sessions across the ${remainingDays.length} day(s) left, keeping hard and high-priority topics first.`,
    },
  };
}
