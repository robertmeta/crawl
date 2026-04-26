export type GameLink = {
  id: string;
  label: string;
  rcEditable: boolean;
};

export function parseGameLinks(html: string): GameLink[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rcIds = new Set(
    Array.from(doc.querySelectorAll<HTMLElement>(".edit_rc_link"))
      .map((element) => element.dataset.game_id)
      .filter((id): id is string => Boolean(id))
  );

  return Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href^="#play-"]'))
    .map((anchor) => {
      const id = decodeURIComponent(anchor.getAttribute("href")?.replace("#play-", "") ?? "");
      return {
        id,
        label: anchor.textContent?.trim() || id,
        rcEditable: rcIds.has(id)
      };
    })
    .filter((link) => link.id.length > 0);
}
