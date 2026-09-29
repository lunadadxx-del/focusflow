// SSR smoke test: renders every FocusFlow view to a string in Node and asserts
// key content is present. Catches JSX/runtime errors in render paths.
// Bundle first with esbuild, then run: node /tmp/ff-smoke/bundle.cjs

import React from "react";
import { renderToString } from "react-dom/server";

// ---- browser stubs ----
global.localStorage = {
  _s: {},
  getItem(k) { return this._s[k] ?? null; },
  setItem(k, v) { this._s[k] = String(v); },
  removeItem(k) { delete this._s[k]; },
};
global.window = { confirm: () => true };

import App from "/home/hatch/workspace/projects/focusflow/src/App.jsx";
import Landing from "/home/hatch/workspace/projects/focusflow/src/components/Landing.jsx";
import SetupForm from "/home/hatch/workspace/projects/focusflow/src/components/SetupForm.jsx";
import PlanView from "/home/hatch/workspace/projects/focusflow/src/components/PlanView.jsx";
import Dashboard from "/home/hatch/workspace/projects/focusflow/src/components/Dashboard.jsx";
import FallingBehindModal from "/home/hatch/workspace/projects/focusflow/src/components/FallingBehindModal.jsx";
import { generatePlan } from "/home/hatch/workspace/projects/focusflow/src/lib/scheduler.js";
import { getDemoSetup } from "/home/hatch/workspace/projects/focusflow/src/data/demoData.js";
import { todayISO } from "/home/hatch/workspace/projects/focusflow/src/lib/dateUtils.js";

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
}

const noop = () => {};
const demo = getDemoSetup();
const { tasks } = generatePlan({ ...demo, ...demo.profile });
const profile = demo.profile;

console.log("\n— component render smoke test —");
{
  const html = renderToString(<App />);
  check("App renders", html.includes("FocusFlow"));
  check("App shows landing by default", html.includes("Create Study Plan") && html.includes("Try Demo"));
}
{
  const html = renderToString(<Landing onCreate={noop} onDemo={noop} hasSavedPlan={true} onResume={noop} />);
  check("Landing renders hero + CTAs", html.includes("Turn your syllabus") && html.includes("Resume my plan"));
}
{
  const html = renderToString(<SetupForm initial={null} onGenerate={noop} generating={false} error="" />);
  check("SetupForm renders fields", html.includes("Exam date") && html.includes("Daily study hours") && html.includes("Add subject"));
  const html2 = renderToString(<SetupForm initial={null} onGenerate={noop} generating={false} error="Boom" />);
  check("SetupForm shows errors", html2.includes("Boom"));
}
{
  const html = renderToString(
    <PlanView plan={tasks} planMeta={{ providerLabel: "Smart Scheduler (on-device)", stats: { tight: false } }}
      dailyHours={3} onToggleTask={noop} onFallingBehind={noop} onEditSetup={noop} onReset={noop} />
  );
  check("PlanView renders tasks", html.includes("Linked Lists") && html.includes("Normalization"));
  check("PlanView shows reasons", html.includes("Spaced revision") || html.includes("Practice right after"));
  check("PlanView has Falling Behind button", html.includes("I&#x27;m Falling Behind") || html.includes("Falling Behind"));
  check("PlanView shows provider label", html.includes("Smart Scheduler"));
  const empty = renderToString(
    <PlanView plan={[]} planMeta={null} dailyHours={3} onToggleTask={noop} onFallingBehind={noop} onEditSetup={noop} onReset={noop} />
  );
  check("PlanView empty state", empty.includes("No study plan yet"));
}
{
  // mark a couple of tasks done to exercise dashboard states
  const plan2 = tasks.map((t, i) => ({ ...t, completed: i < 3 }));
  const html = renderToString(
    <Dashboard plan={plan2} profile={profile} onToggleTask={noop} onGoPlan={noop} onFallingBehind={noop} />
  );
  check("Dashboard renders stats", html.includes("day streak") && html.includes("topics completed") && html.includes("sessions remaining"));
  check("Dashboard shows today's sessions", html.includes("Today&#x27;s sessions") || html.includes("Today's sessions"));
  check("Dashboard shows exam countdown", html.includes("until your exam"));
  const empty = renderToString(
    <Dashboard plan={[]} profile={profile} onToggleTask={noop} onGoPlan={noop} onFallingBehind={noop} />
  );
  check("Dashboard empty state", empty.includes("No data yet"));
}
{
  const html = renderToString(
    <FallingBehindModal plan={tasks} subjects={demo.subjects} onClose={noop} onRegenerate={noop} regenerating={false} resultNote="" />
  );
  check("FallingBehindModal renders", html.includes("falling behind") && html.includes("How many days did you miss"));
  const html2 = renderToString(
    <FallingBehindModal plan={tasks} subjects={demo.subjects} onClose={noop} onRegenerate={noop} regenerating={false} resultNote="redistributed 10 sessions" />
  );
  check("FallingBehindModal shows result note", html2.includes("redistributed 10 sessions"));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
