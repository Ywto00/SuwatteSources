import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(ROOT, "..");

const readJson = async (filePath, fallback) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const removeDirIfExists = async (dirPath) => {
  await fs.rm(dirPath, { recursive: true, force: true });
};

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "runner";

  const escapeString = (value) => String(value ?? "").replace(/"/g, '\\"');

const buildTranslationLine = () => {
  return [
    {
      from: "popularMangaRequest/popularMangaFromElement",
      to: "getDirectory(request)",
      status: "todo",
    },
    {
      from: "searchMangaRequest",
      to: "getDirectory(request.query)",
      status: "todo",
    },
    {
      from: "mangaDetailsRequest/mangaDetailsParse",
      to: "getContent(contentId)",
      status: "todo",
    },
    {
      from: "chapterListRequest/chapterFromElement",
      to: "getChapters(contentId)",
      status: "todo",
    },
    {
      from: "pageListRequest/pageListParse",
      to: "getChapterData(contentId, chapterId)",
      status: "todo",
    },
  ];
};

const buildIndexTs = (pilot) => {
  const runnerName = pilot.name.replace(/^Tachi\//, "");
  const infoId = `pilot.${slugify(pilot.id)}`;
  const website = escapeString(pilot.upstream?.website ?? "");
  const lang = escapeString(pilot.language ?? "UNIVERSAL");
  return `import { CatalogRating, ContentSource, RunnerInfo, SourceConfig } from "@suwatte/daisuke";
import {
  PilotContentSource,
  PilotDirectoryHandler,
  PilotPreferenceProvider,
  PilotSetupProvider,
} from "./impl";

type PilotRunner = ContentSource;

const info: RunnerInfo = {
  id: "${infoId}",
  name: "${escapeString(runnerName)} (Pilot)",
  version: 0.1,
  minSupportedAppVersion: "6.0.0",
  thumbnail: "suwayomi.png",
  website: "${website}",
  supportedLanguages: ["${lang}"],
  rating: CatalogRating.SAFE,
};

const config: SourceConfig = {
  allowsMultipleInstances: true,
  disableLibraryActions: false,
  disableTrackerLinking: true,
};

export const Target: PilotRunner = {
  info,
  config,
  ...PilotContentSource,
  ...PilotDirectoryHandler,
  ...PilotPreferenceProvider,
  ...PilotSetupProvider,
};
`;
};

const buildImplIndexTs = () => `export * from "./contentSource";
export * from "./directoryHandler";
export * from "./preference";
export * from "./setup";
`;

const buildSetupTs = (pilot) => {
  const website = escapeString(pilot.upstream?.website ?? "");
  return `import { BooleanState, Form, RunnerSetupProvider, UITextField } from "@suwatte/daisuke";
import { PilotStore } from "../store";

type SetupForm = {
  baseUrl: string;
};

export const PilotSetupProvider: RunnerSetupProvider = {
  getSetupMenu: async function (): Promise<Form> {
    return {
      sections: [
        {
          header: "Pilot Source",
          children: [
            UITextField({
              id: "baseUrl",
              title: "Base URL",
              value: await PilotStore.baseUrl(),
              placeholder: "${website}",
            }),
          ],
        },
      ],
    };
  },
  validateSetupForm: async function (form: SetupForm): Promise<void> {
    const url = form.baseUrl.trim();
    if (!url) {
      throw new Error("Base URL is required");
    }
    await PilotStore.setBaseUrl(url);
  },
  isRunnerSetup: async function (): Promise<BooleanState> {
    return {
      state: !!(await PilotStore.baseUrl()),
    };
  },
};
`;
};

const buildPreferenceTs = () => `import { Form, RunnerPreferenceProvider, UITextField } from "@suwatte/daisuke";
import { PilotStore } from "../store";

export const PilotPreferenceProvider: RunnerPreferenceProvider = {
  getPreferenceMenu: async function (): Promise<Form> {
    return {
      sections: [
        {
          header: "Pilot Translation",
          footer: "Experimental runner scaffold generated from Tachiyomi metadata.",
          children: [
            UITextField({
              id: "baseUrl",
              title: "Base URL",
              value: await PilotStore.baseUrl(),
              placeholder: "https://example.com",
              async didChange(value: string) {
                await PilotStore.setBaseUrl(value);
              },
            }),
          ],
        },
      ],
    };
  },
};
`;

const buildStoreTs = (pilot) => {
  const website = escapeString(pilot.upstream?.website ?? "");
  return `export const PilotStore = {
  baseUrl: async (): Promise<string> => {
    const value = await ObjectStore.string("baseUrl");
    return (value ?? "${website}").trim();
  },
  setBaseUrl: async (url: string): Promise<void> => {
    await ObjectStore.set("baseUrl", url.trim());
  },
};
`;
};

const buildTypesTs = () => `export type PilotDirectoryItem = {
  id: string;
  title: string;
  subtitle?: string;
  cover?: string;
};
`;

const buildUtilsTs = () => `import * as Cheerio from "cheerio";

export const parseHtmlDirectory = (html: string): Array<{ id: string; title: string; cover?: string }> => {
  const $ = Cheerio.load(html);
  const anchors = $("a[href]").toArray();
  const out: Array<{ id: string; title: string; cover?: string }> = [];

  for (const node of anchors) {
    const href = $(node).attr("href") || "";
    const title = $(node).text().trim();
    if (!href || !title) continue;

    if (!/manga|comic|series|webtoon/i.test(href)) {
      continue;
    }

    const image = $(node).find("img").attr("src") || undefined;
    out.push({ id: href, title, cover: image });
    if (out.length >= 30) break;
  }

  return out;
};
`;

const buildDirectoryHandlerTs = () => `import {
  DirectoryConfig,
  DirectoryHandler,
  DirectoryRequest,
  PagedResult,
} from "@suwatte/daisuke";
import { PilotStore } from "../store";
import { parseHtmlDirectory } from "../utils";

export const PilotDirectoryHandler: DirectoryHandler = {
  getDirectory: async function (request: DirectoryRequest): Promise<PagedResult> {
    const baseUrl = await PilotStore.baseUrl();
    if (!baseUrl) {
      throw new Error("Set Base URL in setup/preferences.");
    }

    const query = request.query?.trim();
    const target = query
      ? baseUrl + (baseUrl.includes("?") ? "&" : "?") + "s=" + encodeURIComponent(query)
      : baseUrl;

    const response = await new NetworkClient().get(target);
    const html = typeof response.data === "string" ? response.data : JSON.stringify(response.data);

    const items = parseHtmlDirectory(html).map((item) => ({
      id: item.id,
      title: item.title,
      cover: item.cover ?? "",
      subtitle: query ? "search: " + query : "pilot directory",
    }));

    return {
      results: items,
      isLastPage: true,
    };
  },
  getDirectoryConfig: async function (): Promise<DirectoryConfig> {
    return {
      searchable: true,
    };
  },
};
`;

const buildContentSourceTs = () => `import {
  Chapter,
  ChapterData,
  Content,
  ContentSource,
} from "@suwatte/daisuke";

type OmittedKeys = "info" | "getDirectory" | "getDirectoryConfig";

export const PilotContentSource: Omit<ContentSource, OmittedKeys> = {
  getContent: async function (contentId: string): Promise<Content> {
    return {
      title: "Pilot Content " + contentId,
      cover: "",
      summary:
        "Scaffold generated from Tachiyomi metadata. Implement source-specific parser in this file.",
    };
  },
  getChapters: async function (): Promise<Chapter[]> {
    return [];
  },
  getChapterData: async function (): Promise<ChapterData> {
    throw new Error("Not implemented: translate page parser to getChapterData");
  },
};
`;

const buildChecklistMd = (pilot) => {
  const website = pilot?.upstream?.website || "(unknown)";
  const pkg = pilot?.upstream?.packageName || "(unknown)";
  const sourceId = pilot?.upstream?.sourceId || "(unknown)";
  const version = pilot?.upstream?.version || "(unknown)";

  const rows = buildTranslationLine()
    .map((item) => `| ${item.from} | ${item.to} | ${item.status} |`)
    .join("\n");

  return `# Translation Checklist\n\n## Source\n\n- Name: ${pilot.name}\n- Package: ${pkg}\n- Source ID: ${sourceId}\n- Version: ${version}\n- Website: ${website}\n\n## Translation Line\n\n| Tachiyomi/Kotlin | Suwatte/Daisuke | Status |\n|---|---|---|\n${rows}\n\n## Notes\n\n- Objective: implement and test this source end-to-end before moving to the next one.\n- Keep parsing deterministic and avoid site-global assumptions.\n- Add auth/image headers only if this source requires them.\n`;
};

const run = async () => {
  const config = await readJson(path.join(ROOT, "config.json"), null);
  if (!config) {
    throw new Error("Missing config.json");
  }

  const outputDir = path.join(ROOT, config.outputDir || "output");
  const pilotsPath = path.join(outputDir, "pilots.json");
  const pilots = await readJson(pilotsPath, null);
  if (!pilots?.selected?.length) {
    throw new Error("No pilot sources found. Run: npm run pilot:select");
  }
  console.log(`[pilot:generate] selected=${pilots.selected.length}`);

  const runnersDir = path.join(outputDir, "pilot-runners");
  const sourceRunnersDir = path.join(REPO_ROOT, "src", "runners");
  await ensureDir(runnersDir);
  await ensureDir(sourceRunnersDir);

  const srcRunnerEntries = await fs.readdir(sourceRunnersDir, {
    withFileTypes: true,
  });
  for (const entry of srcRunnerEntries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith("pilot-")) continue;
    await removeDirIfExists(path.join(sourceRunnersDir, entry.name));
  }

  let generated = 0;

  for (const [index, pilot] of pilots.selected.entries()) {
    console.log(
      `[pilot:generate] ${index + 1}/${pilots.selected.length} generating ${pilot.name}`
    );
    const runnerSlug = slugify(pilot.id);
    const folder = path.join(runnersDir, runnerSlug);
    const sourceFolder = path.join(sourceRunnersDir, `pilot-${runnerSlug}`);
    const implDir = path.join(folder, "impl");
    const storeDir = path.join(folder, "store");
    const typesDir = path.join(folder, "types");
    const utilsDir = path.join(folder, "utils");
    const sourceImplDir = path.join(sourceFolder, "impl");
    const sourceStoreDir = path.join(sourceFolder, "store");
    const sourceTypesDir = path.join(sourceFolder, "types");
    const sourceUtilsDir = path.join(sourceFolder, "utils");

    await ensureDir(folder);
    await ensureDir(sourceFolder);
    await ensureDir(implDir);
    await ensureDir(storeDir);
    await ensureDir(typesDir);
    await ensureDir(utilsDir);
    await ensureDir(sourceImplDir);
    await ensureDir(sourceStoreDir);
    await ensureDir(sourceTypesDir);
    await ensureDir(sourceUtilsDir);

    const manifest = {
      id: pilot.id,
      name: pilot.name,
      language: pilot.language,
      upstream: pilot.upstream,
      translation: {
        stage: "pilot",
        status: "todo",
      },
    };

    await fs.writeFile(
      path.join(folder, "manifest.json"),
      JSON.stringify(manifest, null, 2),
      "utf8"
    );

    const indexTs = buildIndexTs(pilot);
    const implIndexTs = buildImplIndexTs();
    const setupTs = buildSetupTs(pilot);
    const preferenceTs = buildPreferenceTs();
    const directoryHandlerTs = buildDirectoryHandlerTs();
    const contentSourceTs = buildContentSourceTs();
    const storeTs = buildStoreTs(pilot);
    const typesTs = buildTypesTs();
    const utilsTs = buildUtilsTs();

    await fs.writeFile(path.join(folder, "index.ts"), indexTs, "utf8");
    await fs.writeFile(path.join(sourceFolder, "index.ts"), indexTs, "utf8");

    await fs.writeFile(path.join(implDir, "index.ts"), implIndexTs, "utf8");
    await fs.writeFile(path.join(sourceImplDir, "index.ts"), implIndexTs, "utf8");

    await fs.writeFile(path.join(implDir, "setup.ts"), setupTs, "utf8");
    await fs.writeFile(path.join(sourceImplDir, "setup.ts"), setupTs, "utf8");

    await fs.writeFile(path.join(implDir, "preference.ts"), preferenceTs, "utf8");
    await fs.writeFile(path.join(sourceImplDir, "preference.ts"), preferenceTs, "utf8");

    await fs.writeFile(path.join(implDir, "directoryHandler.ts"), directoryHandlerTs, "utf8");
    await fs.writeFile(path.join(sourceImplDir, "directoryHandler.ts"), directoryHandlerTs, "utf8");

    await fs.writeFile(path.join(implDir, "contentSource.ts"), contentSourceTs, "utf8");
    await fs.writeFile(path.join(sourceImplDir, "contentSource.ts"), contentSourceTs, "utf8");

    await fs.writeFile(path.join(storeDir, "index.ts"), storeTs, "utf8");
    await fs.writeFile(path.join(sourceStoreDir, "index.ts"), storeTs, "utf8");

    await fs.writeFile(path.join(typesDir, "index.ts"), typesTs, "utf8");
    await fs.writeFile(path.join(sourceTypesDir, "index.ts"), typesTs, "utf8");

    await fs.writeFile(path.join(utilsDir, "index.ts"), utilsTs, "utf8");
    await fs.writeFile(path.join(sourceUtilsDir, "index.ts"), utilsTs, "utf8");
    await fs.writeFile(
      path.join(folder, "TRANSLATION_CHECKLIST.md"),
      buildChecklistMd(pilot),
      "utf8"
    );
    generated += 1;
  }

  console.log(`Pilot runner scaffolds generated: ${generated}`);
  console.log(`Path: ${runnersDir}`);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
