import { decodeCrawlMessages, type CrawlMessage, type OutgoingMessage } from "./messages";

export type CrawlSocket = {
  close: () => void;
  send: (message: OutgoingMessage) => void;
};

export type CrawlSocketHandlers = {
  onOpen: () => void;
  onMessage: (message: CrawlMessage) => void;
  onStatus: (status: string) => void;
  onError: (message: string) => void;
};

export function connectCrawlSocket(
  url: string,
  handlers: CrawlSocketHandlers
): CrawlSocket {
  const socket = new WebSocket(url, "no-compression");

  socket.addEventListener("open", () => {
    handlers.onStatus("Connected");
    handlers.onOpen();
  });

  socket.addEventListener("message", (event) => {
    if (typeof event.data !== "string") {
      handlers.onError("Received unsupported binary WebSocket frame.");
      return;
    }

    try {
      for (const message of decodeCrawlMessages(event.data)) {
        handlers.onMessage(message);
      }
    } catch (error) {
      handlers.onError(error instanceof Error ? error.message : "Unable to decode message.");
    }
  });

  socket.addEventListener("error", () => {
    handlers.onError("The WebSocket connection failed.");
  });

  socket.addEventListener("close", (event) => {
    const reason = event.reason ? `: ${event.reason}` : "";
    handlers.onStatus(`Disconnected${reason}`);
  });

  return {
    close: () => socket.close(),
    send: (message) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    }
  };
}
