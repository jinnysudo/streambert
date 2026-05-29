// localStorage-based persistence (works in both Vite dev and prod)

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

const PREFIX = "streambert_";
const WEB_SECURE_PREFIX = "secure_";
const HARDCODED_TMDB_API_KEY =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5MjIwMGRhZTM1ZjE1NmY3YmJhN2QwOTFmMzgwOTI1ZiIsIm5iZiI6MTcyMjM4MjM1MS42MTIsInN1YiI6IjY2YTk3ODBmZDFiNTE4MjU5ZGUwYzAzOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.rIPCgnUEViw6esLXsh1y9w3roo1hodond0KdUCcqey4";
const CLOUD_SYNC_FLAG = "streambert_cloud_sync_enabled";
const DEVICE_ID_KEY = "streambert_device_id";
const CLOUD_COLLECTION = "clientState";

let cloudSyncEnabled = false;
let cloudSyncTimer = null;
let cloudSyncInFlight = null;

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

function cloudDocRef() {
  return doc(db, CLOUD_COLLECTION, getDeviceId());
}

function readAllLocalStreambertData() {
  const out = {};
  try {
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(PREFIX)) continue;
      const raw = localStorage.getItem(k);
      const shortKey = k.slice(PREFIX.length);
      out[shortKey] = raw ? JSON.parse(raw) : null;
    }
  } catch {}
  return out;
}

function writeAllLocalStreambertData(data) {
  if (!data || typeof data !== "object") return;
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));

    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    }
  } catch {}
}

async function pushCloudSnapshot() {
  if (!cloudSyncEnabled) return;
  const payload = {
    data: readAllLocalStreambertData(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(cloudDocRef(), payload, { merge: true });
}

function scheduleCloudSync() {
  if (!cloudSyncEnabled) return;
  if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    cloudSyncTimer = null;
    cloudSyncInFlight = pushCloudSnapshot().catch(() => null);
  }, 220);
}

export async function initializeCloudStorageSync() {
  try {
    cloudSyncEnabled = true;
    const snap = await getDoc(cloudDocRef());
    if (snap.exists()) {
      const remoteData = snap.data()?.data;
      if (remoteData && typeof remoteData === "object") {
        writeAllLocalStreambertData(remoteData);
      }
    } else {
      await pushCloudSnapshot();
    }
    localStorage.setItem(CLOUD_SYNC_FLAG, "1");
  } catch {
    cloudSyncEnabled = false;
    try {
      localStorage.setItem(CLOUD_SYNC_FLAG, "0");
    } catch {}
  }
}

export async function flushCloudStorageSync() {
  if (cloudSyncTimer) {
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = null;
  }
  if (!cloudSyncEnabled) return;
  try {
    if (cloudSyncInFlight) await cloudSyncInFlight;
    await pushCloudSnapshot();
  } catch {}
}

export const storage = {
  get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {}
    scheduleCloudSync();
  },
  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {}
    scheduleCloudSync();
  },
  // Remove all streambert_ keys (used by reset)
  clearAll() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    scheduleCloudSync();
  },
};

// Centralised storage key registry
export const STORAGE_KEYS = {
  API_KEY: "apikey",
  PLAYER_SOURCE: "playerSource",
  ALLMANGA_DUB_MODE: "allmangaDubMode",
  WATCH_PROGRESS: "progress",
  WATCHED: "watched",
  HISTORY: "history",
  SAVED: "saved",
  SAVED_ORDER: "savedOrder",
  LOCAL_FILES: "localFiles",
  DOWNLOAD_PATH: "downloadPath",
  DOWNLOADER_FOLDER: "downloaderFolder",
  START_PAGE: "startPage",
  AGE_LIMIT: "ageLimit",
  RATING_COUNTRY: "ratingCountry",
  WATCHED_THRESHOLD: "watchedThreshold",
  HOME_ROW_ORDER: "homeRowOrder",
  HOME_ROW_VISIBLE: "homeRowVisible",
  HOME_VIEW_MODE: "homeViewMode",
  INVIDIOUS_BASE: "invidiousBase",
  // Subtitle settings
  SUBTITLE_ENABLED: "subtitleDownload",
  SUBTITLE_LANG: "subtitleLang",
  // NOTE: SUBDL_API_KEY, WYZIE_API_KEY and API_KEY are stored encrypted via secureStorage
  SUBDL_API_KEY: "subdlApiKey",
  WYZIE_API_KEY: "wyzieApiKey",
  // Appearance & behaviour
  ACCENT_COLOR: "accentColor",
  FONT_SIZE: "fontSize",
  COMPACT_MODE: "compactMode",
  REDUCE_ANIMATIONS: "reduceAnimations",
  LIBRARY_SORT: "librarySort",
  HISTORY_ENABLED: "historyEnabled",
  // Notification preferences
  NOTIFY_DOWNLOAD_COMPLETE: "notifyDownloadComplete",
  NOTIFY_NEW_EPISODE: "notifyNewEpisode",
  // TMDB metadata lang (BCP-47 locale, e.g. "de-DE")
  TMDB_LANG: "tmdbLang",
  // Intro skip (anime only, allmanga source)
  // Values: "off" | "auto" | "manual"
  INTRO_SKIP_MODE: "introSkipMode",
  // Download page UI preferences
  DL_SORT_BY: "dlSortBy",
  DL_SORT_DIR: "dlSortDir",
  DL_SHOW_UNTRACKED: "dlShowUntracked",
  // Cache for new-episode startup check
  EPISODE_RELEASE_CACHE: "episodeReleaseCache",
  CURRENT_MEDIA_STATE: "currentMediaState",
};

export const getApiKey = () => storage.get(STORAGE_KEYS.API_KEY);

// ── Shared helpers ────────────────────────────────────────────────────────────

/** True when running inside Electron (contextBridge exposed). */
export const isElectron = typeof window !== "undefined" && !!window.electron;

/** Format a byte count into a human-readable string. */
export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return "…";
  if (bytes === -1) return null; // unavailable
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

// ── Secure storage for sensitive keys ────────────────────────────────────────
// Uses Electron safeStorage (OS keychain / DPAPI / libsecret).
// All methods are async. Non-Electron environments silently fall back to no-op.
//
// Sensitive keys managed here (NOT stored in localStorage):
//   "apikey"      - TMDB API key
//   "subdlApiKey" - SubDL API key
//   "wyzieApiKey" - Wyzie API key

const _isElectronSecure =
  typeof window !== "undefined" && !!window.electron?.secureGet;

export const secureStorage = {
  /** Read an encrypted value. Returns null if not set. */
  async get(key) {
    if (_isElectronSecure) return window.electron.secureGet(key);
    try {
      const raw = localStorage.getItem(PREFIX + WEB_SECURE_PREFIX + key);
      if (raw !== null) return JSON.parse(raw);
    } catch {}
    if (key === STORAGE_KEYS.API_KEY) return HARDCODED_TMDB_API_KEY;
    return null;
  },

  /** Write an encrypted value. Pass null/empty to delete. */
  async set(key, value) {
    if (_isElectronSecure) return window.electron.secureSet(key, value ?? "");
    try {
      if (value === null || value === undefined || value === "") {
        localStorage.removeItem(PREFIX + WEB_SECURE_PREFIX + key);
      } else {
        localStorage.setItem(
          PREFIX + WEB_SECURE_PREFIX + key,
          JSON.stringify(value),
        );
      }
    } catch {}
  },
};

/**
 * Clears all app caches, Electron browser cache, AniList, EpisodeGroup,
 * AniSkip, and dlDur_ keys. Single source of truth used by Settings
 * "Clear Cache" button and post-update cache clearing in App.jsx.
 */
export async function clearAppCaches() {
  if (isElectron) {
    try {
      await window.electron.clearAppCache();
    } catch {}
  }
  localStorage.removeItem("streambert_anilistCache");
  localStorage.removeItem("streambert_episodeGroupCache");
  localStorage.removeItem("streambert_aniskipCache");
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("dlDur_")) localStorage.removeItem(key);
  }
}
