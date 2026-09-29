import { useMemo, useState } from "react";
import { Button, Field } from "./ui.jsx";
import { flattenTopics } from "../lib/scheduler.js";

export default function FallingBehindModal({ plan, subjects, onClose, onRegenerate, regenerating, resultNote }) {
  const [missedDays, setMissedDays] = useState(2);
  const [selected, setSelected] = useState(() => new Set());

  // Topics that still have unfinished work — these are the sensible candidates.
  const candidates = useMemo(() => {
    const remaining = new Set();
    for (const t of plan) if (!t.completed) remaining.add(t.topicId);
    const byId = new Map(flattenTopics(subjects).map((t) => [t.id, t]));
    return [...remaining]
      .map((id) => byId.get(id))
      .filter(Boolean)
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName) || a.name.localeCompare(b.name));
  }, [plan, subjects]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(candidates.map((c) => c.id)));
  const clearAll = () => setSelected(new Set());

  return (
    <div className="ff-modal-backdrop" onClick={onClose}>
      <div className="ff-modal" onClick={(e) => e.stopPropagation()}>
        <h2>I'm falling behind</h2>
        <p className="sub">
          Tell us what slipped. We'll redistribute your remaining work across the
          days you still have — not just dump it all on tomorrow.
        </p>

        <Field label="How many days did you miss?">
          <input
            type="number"
            className="ff-input"
            min="1"
            max="60"
            value={missedDays}
            onChange={(e) => setMissedDays(Math.max(1, Number(e.target.value) || 1))}
          />
        </Field>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 6px" }}>
          <span className="ff-label" style={{ margin: 0 }}>Which topics are incomplete?</span>
          <span>
            <button className="ff-add-link" onClick={selectAll} style={{ marginRight: 10 }}>Select all</button>
            <button className="ff-add-link" onClick={clearAll}>Clear</button>
          </span>
        </div>
        <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid var(--border-soft)", borderRadius: 10, padding: "4px 12px" }}>
          {candidates.length === 0 && (
            <div style={{ padding: "12px 0", color: "var(--muted)", fontSize: 14 }}>
              Nothing unfinished — you're all caught up. 🎉
            </div>
          )}
          {candidates.map((c) => (
            <label className="ff-checkline" key={c.id} style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
                style={{ width: 16, height: 16, accentColor: "#3f7a52" }}
              />
              <span><strong>{c.name}</strong> <span style={{ color: "var(--muted)" }}>· {c.subjectName}</span></span>
            </label>
          ))}
        </div>
        <p className="ff-hint">
          Unchecked topics keep their remaining scheduled sessions too — everything
          unfinished gets reshuffled across your remaining days.
        </p>

        {resultNote && <div className="ff-result-note">{resultNote}</div>}

        <div className="ff-modal-actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onRegenerate({ missedDays, incompleteTopicIds: [...selected] })} disabled={regenerating}>
            {regenerating ? "Rebuilding…" : "Rebuild my plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
