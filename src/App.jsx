import { useEffect, useState } from "react";
import Landing from "./components/Landing.jsx";
import SetupForm from "./components/SetupForm.jsx";
import PlanView from "./components/PlanView.jsx";
import Dashboard from "./components/Dashboard.jsx";
import FallingBehindModal from "./components/FallingBehindModal.jsx";
import { generateStudyPlan } from "./providers/index.js";
import { regenerateAfterSetback } from "./lib/rescheduler.js";
import { saveState, loadState, clearState } from "./lib/storage.js";
import { getDemoSetup } from "./data/demoData.js";

const initialState = () => ({
  version: 1,
  profile: null,
  subjects: [],
  plan: [],
  planMeta: null,
});

export default function App() {
  const [state, setState] = useState(() => loadState() || initialState());
  const [view, setView] = useState(() => {
    const s = loadState();
    return s && s.plan && s.plan.length ? "plan" : "landing";
  });
  const [generating, setGenerating] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [showBehind, setShowBehind] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [behindNote, setBehindNote] = useState("");

  // Persist everything on change.
  useEffect(() => {
    saveState(state);
  }, [state]);

  const hasPlan = state.plan && state.plan.length > 0;

  const runGeneration = async ({ profile, subjects }) => {
    setGenerating(true);
    setSetupError("");
    // small delay so the loading state is visible and feels deliberate
    await new Promise((r) => setTimeout(r, 350));
    try {
      const result = await generateStudyPlan({
        subjects,
        startDate: profile.startDate,
        examDate: profile.examDate,
        dailyHours: profile.dailyHours,
      });
      setState((s) => ({
        ...s,
        profile,
        subjects,
        plan: result.tasks,
        planMeta: {
          provider: result.provider,
          providerLabel: result.providerLabel,
          generatedAt: new Date().toISOString(),
          stats: result.stats || null,
          note: result.note,
        },
      }));
      setView("plan");
    } catch (e) {
      setSetupError(e.message || "Something went wrong while generating your plan.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDemo = () => {
    const demo = getDemoSetup();
    runGeneration(demo);
  };

  const toggleTask = (id) => {
    setState((s) => ({
      ...s,
      plan: s.plan.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    }));
  };

  const handleRegenerate = async ({ missedDays, incompleteTopicIds }) => {
    setRegenerating(true);
    await new Promise((r) => setTimeout(r, 350));
    try {
      const { tasks, summary } = regenerateAfterSetback({
        plan: state.plan,
        subjects: state.subjects,
        profile: state.profile,
        missedDays,
        incompleteTopicIds,
      });
      setState((s) => ({
        ...s,
        plan: tasks,
        planMeta: s.planMeta
          ? { ...s.planMeta, generatedAt: new Date().toISOString() }
          : s.planMeta,
      }));
      setBehindNote(summary.note);
    } catch (e) {
      setBehindNote(e.message || "Could not rebuild the plan.");
    } finally {
      setRegenerating(false);
    }
  };

  const closeBehind = () => {
    setShowBehind(false);
    setBehindNote("");
    if (behindNote) setView("plan");
  };

  const handleReset = () => {
    if (window.confirm("Start over? This will delete your current plan from this browser.")) {
      clearState();
      setState(initialState());
      setView("landing");
    }
  };

  const navTo = (v) => {
    setSetupError("");
    setView(v);
  };

  return (
    <div className="ff-shell">
      <header className="ff-topbar">
        <div className="ff-topbar-inner">
          <div className="ff-brand" onClick={() => navTo(hasPlan ? "plan" : "landing")}>
            <div className="ff-logo">F</div>
            <div className="ff-brand-name">Focus<span>Flow</span></div>
          </div>
          <nav className="ff-nav">
            {hasPlan && (
              <>
                <button className={view === "plan" ? "active" : ""} onClick={() => navTo("plan")}>
                  My Plan
                </button>
                <button className={view === "dashboard" ? "active" : ""} onClick={() => navTo("dashboard")}>
                  Dashboard
                </button>
              </>
            )}
            <button className={view === "setup" ? "active" : ""} onClick={() => navTo("setup")}>
              {hasPlan ? "New Plan" : "Get Started"}
            </button>
          </nav>
        </div>
      </header>

      <main className="ff-main">
        <div className="ff-container">
          {generating ? (
            <div className="ff-loading">
              <div className="ff-spinner" />
              <h3 style={{ margin: "0 0 6px" }}>Building your study plan…</h3>
              <p style={{ color: "#8a8171", fontSize: 14, margin: 0 }}>
                Weighing topics by difficulty and priority, spacing out revision.
              </p>
            </div>
          ) : view === "landing" ? (
            <Landing
              onCreate={() => navTo("setup")}
              onDemo={handleDemo}
              hasSavedPlan={hasPlan}
              onResume={() => navTo("plan")}
            />
          ) : view === "setup" ? (
            <SetupForm
              initial={state.profile ? { profile: state.profile, subjects: state.subjects } : null}
              onGenerate={runGeneration}
              generating={generating}
              error={setupError}
            />
          ) : view === "plan" ? (
            <PlanView
              plan={state.plan}
              planMeta={state.planMeta}
              dailyHours={state.profile?.dailyHours || 3}
              onToggleTask={toggleTask}
              onFallingBehind={() => { setBehindNote(""); setShowBehind(true); }}
              onEditSetup={() => navTo("setup")}
              onReset={handleReset}
            />
          ) : (
            <Dashboard
              plan={state.plan}
              profile={state.profile}
              onToggleTask={toggleTask}
              onGoPlan={() => navTo("plan")}
              onFallingBehind={() => { setBehindNote(""); setShowBehind(true); }}
            />
          )}
        </div>
      </main>

      <footer className="ff-footer">
        FocusFlow — a study planner that adapts. Your data stays in your browser.
      </footer>

      {showBehind && (
        <FallingBehindModal
          plan={state.plan}
          subjects={state.subjects}
          onClose={closeBehind}
          onRegenerate={handleRegenerate}
          regenerating={regenerating}
          resultNote={behindNote}
        />
      )}
    </div>
  );
}
