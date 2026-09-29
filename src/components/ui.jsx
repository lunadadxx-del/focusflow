// Small shared UI primitives.

export function Button({ variant = "primary", size, block, ...props }) {
  const cls = ["ff-btn", variant, size, block ? "block" : ""].filter(Boolean).join(" ");
  return <button className={cls} {...props} />;
}

export function Card({ tight, style, children, ...props }) {
  return (
    <div className={`ff-card${tight ? " tight" : ""}`} style={style} {...props}>
      {children}
    </div>
  );
}

export function Badge({ kind, children }) {
  return <span className={`ff-badge ${kind || "neutral"}`}>{children}</span>;
}

export function ProgressBar({ value, max = 100 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="ff-progress">
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ProgressRing({ value, max = 100, size = 92, label }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f4eddc" strokeWidth="10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#3f7a52"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px" }}>
          {Math.round(pct * 100)}%
        </div>
        {label && <div style={{ fontSize: 11, color: "#8a8171", fontWeight: 600 }}>{label}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <div className="ff-field">
      {label && <label className="ff-label">{label}</label>}
      {children}
      {hint && <div className="ff-hint">{hint}</div>}
      {error && <div className="ff-error">{error}</div>}
    </div>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="ff-empty">
      <div style={{ fontWeight: 700, fontSize: 16, color: "#57503f", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, marginBottom: action ? 16 : 0 }}>{body}</div>
      {action}
    </div>
  );
}
