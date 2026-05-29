import React from "react";
import ReactDOM from "react-dom/client";
import "./utils/installWebElectronShim";
import {
  flushCloudStorageSync,
  initializeCloudStorageSync,
} from "./utils/storage";
import "./styles/global.css";

async function bootstrap() {
  await initializeCloudStorageSync();
  const { default: App } = await import("./App");

  window.addEventListener("beforeunload", () => {
    flushCloudStorageSync();
  });

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();
