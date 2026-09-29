// Provider selector.
//
// - If VITE_AI_BACKEND_URL is set, plans come from your AI backend
//   (see providers/aiBackend.js + README.md).
// - Otherwise the on-device Smart Scheduler is used, and the UI says so.
// We never pretend a local plan came from an AI API.

import * as smart from "./smartScheduler.js";
import * as aiBackend from "./aiBackend.js";

export async function generateStudyPlan(input) {
  if (aiBackend.isConfigured()) {
    return aiBackend.generate(input);
  }
  return smart.generate(input);
}

export function activeProviderLabel() {
  return aiBackend.isConfigured() ? aiBackend.PROVIDER_LABEL : smart.PROVIDER_LABEL;
}
