import type { MapPoint, TileCell } from "../state/game-state";
import { loadTileInfoBundle, type TileInfoModule } from "./amd-tileinfo";

type TileImages = Record<string, HTMLImageElement>;

export type TileRenderer = {
  draw: (
    canvas: HTMLCanvasElement,
    cells: Record<string, TileCell>,
    center: MapPoint,
    cursor: MapPoint | null,
    revision: number
  ) => void;
};

const CELL_SIZE = 32;
const VIEW_COLS = 31;
const VIEW_ROWS = 21;
const TILE_VALUE_MASK = 0xffff;

export async function createTileRenderer(gameDataVersion: string): Promise<TileRenderer> {
  const baseUrl = `/gamedata/${encodeURIComponent(gameDataVersion)}`;
  const [tileInfo, images] = await Promise.all([
    loadTileInfoBundle(baseUrl),
    loadTileImages(baseUrl)
  ]);

  const drawTile = (
    ctx: CanvasRenderingContext2D,
    module: TileInfoModule,
    idx: number,
    x: number,
    y: number,
    options: { ofsx?: number; ofsy?: number; yMax?: number } = {}
  ) => {
    const info = module.get_tile_info(idx);
    if (!info) {
      return;
    }

    const image = images[module.get_img(idx)];
    if (!image) {
      return;
    }

    const sizeOffsetX = CELL_SIZE / 2 - info.w / 2;
    const sizeOffsetY = CELL_SIZE - info.h;
    const targetX = x + (options.ofsx ?? 0) + info.ox + sizeOffsetX;
    const sourceWidth = info.ex - info.sx;

    const unclippedTargetY = (options.ofsy ?? 0) + info.oy + sizeOffsetY;
    const unclippedBottom = unclippedTargetY + info.ey - info.sy;
    const clippedBottom = options.yMax && options.yMax < unclippedBottom ? options.yMax : unclippedBottom;
    if (unclippedTargetY >= clippedBottom) {
      return;
    }

    const sourceY = info.sy;
    const sourceHeight = clippedBottom - unclippedTargetY;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      image,
      info.sx,
      sourceY,
      sourceWidth,
      sourceHeight,
      Math.floor(targetX),
      Math.floor(y + unclippedTargetY),
      sourceWidth,
      sourceHeight
    );
  };

  const drawDngn = (ctx: CanvasRenderingContext2D, idx: number, x: number, y: number) => {
    drawTile(ctx, tileInfo.dngn, tileValue(idx), x, y);
  };

  const drawMain = (ctx: CanvasRenderingContext2D, idx: number, x: number, y: number) => {
    drawTile(ctx, tileInfo.main, tileValue(idx), x, y);
  };

  const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    idx: number,
    x: number,
    y: number,
    ofsx = 0,
    ofsy = 0,
    yMax?: number
  ) => {
    drawTile(ctx, tileInfo.player, tileValue(idx), x, y, { ofsx, ofsy, yMax });
  };

  const drawCell = (ctx: CanvasRenderingContext2D, cell: TileCell | undefined, x: number, y: number) => {
    ctx.fillStyle = "black";
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    if (!cell?.t) {
      drawGlyphFallback(ctx, cell, x, y);
      return;
    }

    const tile = cell.t;
    const flavour = objectField(tile.flv);
    const flavourFloor = numberField(flavour?.f);
    if (flavourFloor) {
      drawDngn(ctx, flavourFloor, x, y);
    }

    const background = numberField(tile.bg);
    if (background !== undefined) {
      drawDngn(ctx, background, x, y);
    }

    const overlays = arrayField(tile.ov);
    for (const overlay of overlays) {
      const overlayTile = numberField(overlay);
      if (overlayTile) {
        drawDngn(ctx, overlayTile, x, y);
      }
    }

    const foreground = numberField(tile.fg);
    const foregroundValue = foreground === undefined ? 0 : tileValue(foreground);
    const mainMax = numberField(tileInfo.main.MAIN_MAX) ?? Number.MAX_SAFE_INTEGER;
    if (foregroundValue && foregroundValue <= mainMax) {
      drawMain(ctx, foregroundValue, x, y);
    }

    for (const dollPart of arrayField(tile.doll)) {
      if (Array.isArray(dollPart)) {
        const idx = numberField(dollPart[0]);
        if (idx !== undefined) {
          drawPlayer(ctx, idx, x, y, 0, 0, numberField(dollPart[1]));
        }
      }
    }

    for (const cachePart of arrayField(tile.mcache)) {
      if (Array.isArray(cachePart)) {
        const idx = numberField(cachePart[0]);
        if (idx !== undefined) {
          drawPlayer(ctx, idx, x, y, numberField(cachePart[1]) ?? 0, numberField(cachePart[2]) ?? 0);
        }
      }
    }
  };

  return {
    draw: (canvas, cells, center, cursor) => {
      const dpr = window.devicePixelRatio || 1;
      const width = VIEW_COLS * CELL_SIZE;
      const height = VIEW_ROWS * CELL_SIZE;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);

      const originX = center.x - Math.floor(VIEW_COLS / 2);
      const originY = center.y - Math.floor(VIEW_ROWS / 2);
      for (let row = 0; row < VIEW_ROWS; row++) {
        for (let col = 0; col < VIEW_COLS; col++) {
          const mapX = originX + col;
          const mapY = originY + row;
          drawCell(ctx, cells[`${mapX},${mapY}`], col * CELL_SIZE, row * CELL_SIZE);
        }
      }

      if (cursor) {
        const cursorCol = cursor.x - originX;
        const cursorRow = cursor.y - originY;
        if (cursorCol >= 0 && cursorCol < VIEW_COLS && cursorRow >= 0 && cursorRow < VIEW_ROWS) {
          drawCursor(ctx, cursorCol * CELL_SIZE, cursorRow * CELL_SIZE);
        }
      }
    }
  };
}

function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.strokeStyle = "#f7ff6a";
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 5, y + 5, CELL_SIZE - 10, CELL_SIZE - 10);
  ctx.restore();
}

function drawGlyphFallback(ctx: CanvasRenderingContext2D, cell: TileCell | undefined, x: number, y: number) {
  if (!cell?.glyph.trim()) {
    return;
  }
  ctx.fillStyle = glyphColour(cell.colour);
  ctx.font = "22px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(cell.glyph, x + CELL_SIZE / 2, y + CELL_SIZE / 2);
}

async function loadTileImages(baseUrl: string): Promise<TileImages> {
  const names = ["floor", "wall", "feat", "main", "player", "icons", "gui"];
  const entries = await Promise.all(names.map(async (name) => [name, await loadImage(`${baseUrl}/${name}.png`)] as const));
  return Object.fromEntries(entries);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load tile image ${src}`));
    image.src = src;
  });
}

function tileValue(value: number): number {
  return value & TILE_VALUE_MASK;
}

function objectField(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function arrayField(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberField(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function glyphColour(colour: number | null): string {
  const colours = [
    "#000000",
    "#0000aa",
    "#00aa00",
    "#00aaaa",
    "#aa0000",
    "#aa00aa",
    "#aa5500",
    "#aaaaaa",
    "#555555",
    "#5555ff",
    "#55ff55",
    "#55ffff",
    "#ff5555",
    "#ff55ff",
    "#ffff55",
    "#ffffff"
  ];
  return colours[Math.abs(colour ?? 7) % colours.length] ?? "#ffffff";
}
