import { useState } from "react";

export default function PasswordGate({
  title,
  subtitle,
  buttonLabel,
  onSubmit,
  error,
  loading,
}) {
  const [password, setPassword] = useState("");

  return (
    <div className="gate-root">
      <div className="gate-card">
        <h1 className="gate-title">{title}</h1>
        <p className="gate-subtitle">{subtitle}</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(password);
          }}
          className="gate-form"
        >
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="gate-input"
          />
          <button className="btn btn-primary gate-btn" disabled={loading}>
            {loading ? "Checking..." : buttonLabel}
          </button>
        </form>

        {error && <div className="gate-error">{error}</div>}
      </div>
    </div>
  );
}
