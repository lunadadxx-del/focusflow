// Sample data for "Try Demo" — matches the example in the project brief.

import { addDays, todayISO } from "../lib/dateUtils.js";

let n = 0;
const id = (p) => `${p}_demo_${n++}`;

function topic(name, difficulty, priority) {
  return { id: id("topic"), name, difficulty, priority };
}

export function getDemoSetup() {
  const startDate = todayISO();
  const examDate = addDays(startDate, 14);
  return {
    profile: { startDate, examDate, dailyHours: 3 },
    subjects: [
      {
        id: id("subj"),
        name: "DSA",
        topics: [
          topic("Arrays", "Medium", "High"),
          topic("Linked Lists", "Hard", "High"),
          topic("Trees", "Hard", "High"),
        ],
      },
      {
        id: id("subj"),
        name: "DBMS",
        topics: [
          topic("SQL", "Medium", "High"),
          topic("Normalization", "Hard", "Medium"),
          topic("Transactions", "Medium", "Medium"),
        ],
      },
      {
        id: id("subj"),
        name: "Computer Networks",
        topics: [
          topic("OSI Model", "Easy", "Medium"),
          topic("TCP/IP", "Medium", "High"),
          topic("Routing", "Hard", "Medium"),
        ],
      },
    ],
  };
}
