import { useEffect, useMemo, useState } from "react";
import {
  getAccessPasswords,
  subscribeDeviceSessions,
  updateAccessPasswords,
} from "../utils/accessControl";

function formatSeen(ts) {
  const ms = ts?.seconds ? ts.seconds * 1000 : Date.now();
  const delta = Math.floor((Date.now() - ms) / 1000);
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

export default function AdminPage({ onLogout }) {
  const [sitePassword, setSitePassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    let mounted = true;
    getAccessPasswords()
      .then((p) => {
        if (!mounted) return;
        setSitePassword(p.sitePassword || "");
        setAdminPassword(p.adminPassword || "");
      })
      .catch(() => {
        if (!mounted) return;
        setSaveStatus("Unable to load passwords from Firebase.");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeDeviceSessions((rows) => setDevices(rows));
    return () => unsub();
  }, []);

  const sortedDevices = useMemo(
    () =>
      [...devices].sort((a, b) => {
        const aSec = a.lastSeen?.seconds || 0;
        const bSec = b.lastSeen?.seconds || 0;
        return bSec - aSec;
      }),
    [devices],
  );

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveStatus("Saving...");
    try {
      await updateAccessPasswords({ sitePassword, adminPassword });
      setSaveStatus("Passwords updated.");
    } catch {
      setSaveStatus("Failed to save passwords. Check Firebase rules.");
    }
  };

  return (
    <div className="admin-root">
      <div className="admin-wrap">
        <div className="admin-header">
          <h1>Admin Panel</h1>
          <button className="btn btn-ghost" onClick={onLogout}>
            Log Out
          </button>
        </div>

        <form className="admin-card" onSubmit={handleSave}>
          <h2>Access Passwords</h2>
          <label className="admin-label">Site Password</label>
          <input
            className="apikey-input"
            type="text"
            value={sitePassword}
            onChange={(e) => setSitePassword(e.target.value)}
          />

          <label className="admin-label">Admin Password</label>
          <input
            className="apikey-input"
            type="text"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
          />

          <div className="admin-actions">
            <button className="btn btn-primary" type="submit">
              Save Passwords
            </button>
            <span className="admin-status">{saveStatus}</span>
          </div>
        </form>

        <div className="admin-card">
          <h2>Realtime Logged Devices</h2>
          <div className="admin-devices">
            {sortedDevices.length === 0 && (
              <div className="admin-empty">No logged devices yet.</div>
            )}
            {sortedDevices.map((d) => (
              <div className="admin-device" key={d.id}>
                <div>
                  <div className="admin-device-title">
                    {d.deviceLabel || "Unknown Device"}
                  </div>
                  <div className="admin-device-meta">
                    {d.role || "site"} | {d.platform || "unknown"} | {d.language || "-"}
                  </div>
                </div>
                <div className="admin-device-seen">{formatSeen(d.lastSeen)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
