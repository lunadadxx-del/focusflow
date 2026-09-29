// Default plan provider: the on-device Smart Scheduler.
//
// This is a real, deterministic scheduling engine (see ../lib/scheduler.js) —
// it weighs difficulty x priority, spaces practice and revision, and balances
// subjects. It is NOT an LLM call, and the UI labels it honestly as such.

import { generatePlan } from "../lib/scheduler.js";

export const PROVIDER_ID = "smart-scheduler";
export const PROVIDER_LABEL = "Smart Scheduler (on-device)";

export async function generate(input) {
  // async for interface parity with the AI backend provider
  const result = generatePlan(input);
  return {
    tasks: result.tasks,
    provider: PROVIDER_ID,
    providerLabel: PROVIDER_LABEL,
    stats: result.stats,
    note: "Plan built on-device by the Smart Scheduler. No AI API call was made.",
  };
}
