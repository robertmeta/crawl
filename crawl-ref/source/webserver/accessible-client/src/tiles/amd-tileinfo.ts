export type TileInfo = {
  w: number;
  h: number;
  ox: number;
  oy: number;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
};

export type TileInfoModule = {
  [key: string]: unknown;
  get_tile_info: (idx: number) => TileInfo | undefined;
  get_img: (idx: number) => string;
};

export type TileInfoBundle = {
  dngn: TileInfoModule;
  main: TileInfoModule;
  player: TileInfoModule;
  icons: TileInfoModule;
};

type ModuleDefinition = {
  deps: string[];
  factory: (...args: unknown[]) => unknown;
};

const bundleCache = new Map<string, Promise<TileInfoBundle>>();

export function loadTileInfoBundle(baseUrl: string): Promise<TileInfoBundle> {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const cached = bundleCache.get(normalizedBase);
  if (cached) {
    return cached;
  }

  const loader = new AmdTileInfoLoader(normalizedBase);
  const promise = Promise.all([
    loader.load("tileinfo-dngn"),
    loader.load("tileinfo-main"),
    loader.load("tileinfo-player"),
    loader.load("tileinfo-icons")
  ]).then(([dngn, main, player, icons]) => ({
    dngn: dngn as TileInfoModule,
    main: main as TileInfoModule,
    player: player as TileInfoModule,
    icons: icons as TileInfoModule
  }));
  bundleCache.set(normalizedBase, promise);
  return promise;
}

class AmdTileInfoLoader {
  private readonly modules = new Map<string, Promise<unknown>>();

  constructor(private readonly baseUrl: string) {}

  load(id: string): Promise<unknown> {
    const normalized = normalizeModuleId(id);
    const cached = this.modules.get(normalized);
    if (cached) {
      return cached;
    }

    const promise = this.fetchDefinition(normalized).then(async (definition) => {
      const deps = await Promise.all(definition.deps.map((dep) => this.resolveDependency(normalized, dep)));
      return definition.factory(...deps);
    });
    this.modules.set(normalized, promise);
    return promise;
  }

  private async resolveDependency(parent: string, dependency: string): Promise<unknown> {
    if (dependency === "jquery") {
      return { extend: Object.assign };
    }
    return this.load(resolveRelativeModuleId(parent, dependency));
  }

  private async fetchDefinition(id: string): Promise<ModuleDefinition> {
    const response = await fetch(`${this.baseUrl}/${id}.js`);
    if (!response.ok) {
      throw new Error(`Unable to load tile metadata ${id}: ${response.status}`);
    }

    const source = await response.text();
    let definition: ModuleDefinition | undefined;
    const define = (depsOrFactory: string[] | ((...args: unknown[]) => unknown), maybeFactory?: (...args: unknown[]) => unknown) => {
      if (typeof depsOrFactory === "function") {
        definition = { deps: [], factory: depsOrFactory };
      } else if (maybeFactory) {
        definition = { deps: depsOrFactory, factory: maybeFactory };
      }
    };

    window.assert = window.assert || (() => {});
    new Function("define", `${source}\n//# sourceURL=${this.baseUrl}/${id}.js`)(define);

    if (!definition) {
      throw new Error(`Tile metadata ${id} did not call define().`);
    }
    return definition;
  }
}

function resolveRelativeModuleId(parent: string, dependency: string): string {
  if (!dependency.startsWith(".")) {
    return normalizeModuleId(dependency);
  }
  const parentParts = parent.split("/");
  parentParts.pop();
  for (const part of dependency.split("/")) {
    if (part === "." || part === "") {
      continue;
    }
    if (part === "..") {
      parentParts.pop();
    } else {
      parentParts.push(part);
    }
  }
  return normalizeModuleId(parentParts.join("/"));
}

function normalizeModuleId(id: string): string {
  return id.replace(/^\.\//, "").replace(/\.js$/, "");
}

declare global {
  interface Window {
    assert?: () => void;
  }
}
