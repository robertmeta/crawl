export type CrawlMessage = {
  msg: string;
  [key: string]: unknown;
};

export type CrawlTextMessage = {
  text: string;
};

export type CrawlMessageBatch = {
  msgs?: CrawlMessage[];
};

export type OutgoingMessage =
  | { msg: "pong" }
  | { msg: "login"; username: string; password: string }
  | { msg: "register"; username: string; password: string; email: string }
  | { msg: "token_login"; cookie: string }
  | { msg: "logout" }
  | { msg: "go_lobby" }
  | { msg: "play"; game_id: string }
  | { msg: "watch"; username: string }
  | { msg: "get_rc"; game_id: string }
  | { msg: "set_rc"; game_id: string; contents: string }
  | { msg: "outer_menu_focus"; hotkey: number; menu_id: string }
  | { msg: "input"; text: string }
  | { msg: "input"; data: number[] }
  | { msg: "key"; keycode: number };

export function decodeCrawlMessages(raw: string): CrawlMessage[] {
  if (!raw.trim().startsWith("{")) {
    return [{ msg: "legacy_javascript", source: raw }];
  }

  const parsed = JSON.parse(raw) as CrawlMessage | CrawlMessageBatch;
  if ("msgs" in parsed && Array.isArray(parsed.msgs)) {
    return parsed.msgs;
  }
  return [parsed as CrawlMessage];
}
