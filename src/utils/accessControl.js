import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export const DEFAULT_SITE_PASSWORD = "Tintable@965";
export const DEFAULT_ADMIN_PASSWORD = "Tintable@8140760999";

const ACCESS_DOC_REF = doc(db, "config", "accessControl");
const SESSION_COLLECTION = collection(db, "sessions");
const DEVICE_ID_KEY = "streambert_device_id";

function getDeviceId() {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `device_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return `device_${Math.random().toString(36).slice(2, 12)}`;
  }
}

function buildDeviceLabel() {
  const ua = navigator.userAgent || "Unknown device";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS Device";
  if (/android/i.test(ua)) return "Android Device";
  if (/mac os x/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows PC";
  if (/linux/i.test(ua)) return "Linux PC";
  return "Unknown Device";
}

export async function ensureAccessControlDoc() {
  try {
    const snap = await getDoc(ACCESS_DOC_REF);
    if (snap.exists()) {
      const data = snap.data() || {};
      if (data.sitePassword && data.adminPassword) return data;
    }
    const defaults = {
      sitePassword: DEFAULT_SITE_PASSWORD,
      adminPassword: DEFAULT_ADMIN_PASSWORD,
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(ACCESS_DOC_REF, defaults, { merge: true });
    } catch {
      // Firestore might be read-only or locked by rules; fall back to defaults.
    }
    return {
      sitePassword: DEFAULT_SITE_PASSWORD,
      adminPassword: DEFAULT_ADMIN_PASSWORD,
    };
  } catch {
    return {
      sitePassword: DEFAULT_SITE_PASSWORD,
      adminPassword: DEFAULT_ADMIN_PASSWORD,
    };
  }
}

export async function verifyAccessPassword(password, { admin = false } = {}) {
  const data = await ensureAccessControlDoc();
  const expected = admin ? data.adminPassword : data.sitePassword;
  return String(password || "") === String(expected || "");
}

export async function getAccessPasswords() {
  const data = await ensureAccessControlDoc();
  return {
    sitePassword: data.sitePassword || DEFAULT_SITE_PASSWORD,
    adminPassword: data.adminPassword || DEFAULT_ADMIN_PASSWORD,
  };
}

export async function updateAccessPasswords({ sitePassword, adminPassword }) {
  const payload = {
    updatedAt: serverTimestamp(),
  };
  if (typeof sitePassword === "string" && sitePassword.trim()) {
    payload.sitePassword = sitePassword.trim();
  }
  if (typeof adminPassword === "string" && adminPassword.trim()) {
    payload.adminPassword = adminPassword.trim();
  }
  await setDoc(ACCESS_DOC_REF, payload, { merge: true });
}

export async function updateDeviceSession({ role = "site" } = {}) {
  const deviceId = getDeviceId();
  const sessionRef = doc(SESSION_COLLECTION, deviceId);
  await setDoc(
    sessionRef,
    {
      deviceId,
      role,
      deviceLabel: buildDeviceLabel(),
      userAgent: navigator.userAgent || "",
      language: navigator.language || "",
      platform: navigator.platform || "",
      lastSeen: serverTimestamp(),
      active: true,
    },
    { merge: true },
  );
}

export function startSessionHeartbeat({ role = "site", intervalMs = 30000 } = {}) {
  let cancelled = false;

  const sendBeat = async () => {
    if (cancelled) return;
    try {
      await updateDeviceSession({ role });
    } catch {}
  };

  sendBeat();
  const timer = setInterval(sendBeat, intervalMs);

  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}

export function subscribeDeviceSessions(onChange) {
  const q = query(SESSION_COLLECTION, orderBy("lastSeen", "desc"), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onChange(rows);
    },
    () => {
      onChange([]);
    },
  );
}
