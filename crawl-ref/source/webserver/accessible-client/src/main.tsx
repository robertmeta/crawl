import { render } from "solid-js/web";

import { App } from "./ui/App";
import "./main.css";

declare global {
  interface Window {
    CRAWL_ACCESSIBLE_CONFIG?: {
      socketServer: string;
      gameVersion: string;
    };
  }
}

const root = document.getElementById("accessible-root");

if (!root) {
  throw new Error("Missing #accessible-root");
}

render(() => <App config={window.CRAWL_ACCESSIBLE_CONFIG ?? defaultConfig()} />, root);

function defaultConfig() {
  const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
  return {
    socketServer: `${protocol}${window.location.host}/socket`,
    gameVersion: "dev"
  };
}
