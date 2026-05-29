// Browser fallback for Electron preload API.
// This allows the renderer to run as a pure web app without rewriting feature code.

function installWebElectronShim() {
  if (typeof window === "undefined" || window.electron) return;

  const securePrefix = "streambert_secure_";
  const noop = () => {};
  const asHandler = (cb) => (typeof cb === "function" ? cb : noop);
  const unsupported = (feature) => ({
    ok: false,
    error: `${feature} is only available in the desktop app.`,
  });

  const secureGet = async (key) => {
    try {
      const raw = localStorage.getItem(securePrefix + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const secureSet = async (key, value) => {
    try {
      if (value === null || value === undefined || value === "") {
        localStorage.removeItem(securePrefix + key);
      } else {
        localStorage.setItem(securePrefix + key, JSON.stringify(value));
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || "Failed to save value" };
    }
  };

  const openExternal = async (url) => {
    try {
      window.open(String(url), "_blank", "noopener,noreferrer");
      return { ok: true };
    } catch {
      return { ok: false };
    }
  };

  window.electron = {
    runtime: "web",

    onM3u8Found: (cb) => asHandler(cb),
    offM3u8Found: noop,
    onSubtitleFound: (cb) => asHandler(cb),
    offSubtitleFound: noop,
    onDownloadProgress: (cb) => asHandler(cb),
    offDownloadProgress: noop,

    checkDownloader: async () => ({ exists: false, reason: "web" }),
    runDownload: async () => unsupported("Downloads"),
    getDownloads: async () => [],
    deleteDownload: async () => ({ ok: false }),
    showInFolder: async () => ({ ok: false }),
    fileExists: async () => false,
    scanDirectory: async () => [],

    pickFolder: async () => null,
    openExternal,
    openPath: async () => unsupported("Opening local files"),
    getInstallPath: async () => "",
    openPathAtTime: async () => unsupported("External player handoff"),
    pruneSubtitlePaths: async () => ({ ok: false }),

    onConfirmClose: (cb) => asHandler(cb),
    offConfirmClose: noop,
    respondClose: noop,

    resolveAllManga: async () => ({ ok: false, error: "Not available on web" }),
    setPlayerVideo: async ({ url }) => ({ ok: true, playerUrl: url || "about:blank" }),
    debugAllManga: async () => ({ ok: false }),

    getAppVersion: async () => "web",

    onWebviewEnterFullscreen: (cb) => asHandler(cb),
    offWebviewEnterFullscreen: noop,
    onWebviewLeaveFullscreen: (cb) => asHandler(cb),
    offWebviewLeaveFullscreen: noop,

    onBlockedUpdate: (cb) => asHandler(cb),
    offBlockedUpdate: noop,
    getBlockStats: async () => ({ total: 0, domains: {} }),

    showNotification: async ({ title, body }) => {
      if (typeof Notification === "undefined") return;
      try {
        if (Notification.permission === "granted") {
          new Notification(String(title || "Streambert"), {
            body: String(body || ""),
          });
          return;
        }
        if (Notification.permission !== "denied") {
          await Notification.requestPermission();
        }
      } catch {}
    },

    quitApp: async () => ({ ok: false }),
    playerStopped: noop,

    getCacheSize: async () => ({ bytes: 0 }),
    getDownloadsSize: async () => ({ bytes: 0 }),
    clearAppCache: async () => ({ ok: true }),
    queryVideoProgress: async () => null,
    clearWatchData: async () => ({ ok: true }),
    deleteAllDownloads: async () => ({ ok: false }),
    resetApp: async () => ({ ok: false }),

    searchSubtitles: async () => ({ ok: false, error: "Not available on web" }),
    getSubtitleUrl: async () => ({ ok: false, error: "Not available on web" }),
    downloadSubtitlesForFile: async () => ({ ok: false, error: "Not available on web" }),
    deleteSubtitleFile: async () => ({ ok: false, error: "Not available on web" }),

    wyzieOpenRedeem: async () => ({ ok: false, cancelled: true }),
    wyzieValidateKey: async () => ({ ok: false, error: "Not available on web" }),

    secureGet,
    secureSet,

    openPipWindow: async () => ({ ok: false, reason: "web" }),
    closePipWindow: async () => ({ ok: true }),
    getPipWebContentsId: async () => null,
    onPipOpened: (cb) => asHandler(cb),
    offPipOpened: noop,
    onPipClosed: (cb) => asHandler(cb),
    offPipClosed: noop,

    windowMinimize: async () => ({ ok: false }),
    windowToggleMaximize: async () => ({ ok: false }),
    windowClose: async () => ({ ok: false }),
    windowIsMaximized: async () => false,
    getPlatform: async () => "web",
    onWindowMaximize: (cb) => asHandler(cb),
    offWindowMaximize: noop,

    getVideoDuration: async () => ({ ok: false }),
    setZoomFactor: noop,

    getScheduledBackupSettings: async () => ({
      enabled: false,
      path: "",
      keepCount: 5,
      frequency: "startup",
      lastRun: null,
    }),
    setScheduledBackupSettings: async () => ({ ok: false }),
    performScheduledBackup: async () => unsupported("Scheduled backups"),
    onScheduledBackupRequested: (cb) => asHandler(cb),
    offScheduledBackupRequested: noop,
  };
}

installWebElectronShim();
