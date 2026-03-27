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

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const tabsBlock = (isExperimental) => {
  const sourceClass = isExperimental
    ? "px-3 py-2 text-md font-bold bg-purple-100 text-purple-700 rounded-full"
    : "px-3 py-2 text-md font-bold bg-purple-200 text-purple-600 rounded-full";
  const experimentalClass = isExperimental
    ? "px-3 py-2 text-md font-bold bg-purple-200 text-purple-600 rounded-full"
    : "px-3 py-2 text-md font-bold bg-purple-100 text-purple-700 rounded-full";

  return `\n    <div class="py-4 flex gap-3">\n      <a href="${isExperimental ? "../" : "./"}" class="${sourceClass}">Sources</a>\n      <a href="${isExperimental ? "./" : "./experimental/"}" class="${experimentalClass}">Experimental</a>\n    </div>\n`;
};

const buildRunnerCard = (runner) => {
  const runnerPath = escapeHtml(runner.path);
  const name = escapeHtml(runner.name);
  const version = escapeHtml(runner.version);
  const website = escapeHtml(runner.website || "");
  const thumb = escapeHtml(runner.thumbnail || "suwayomi.png");

  return `          <div class="runner flex justify-between items-center">
            <div class="flex gap-2">
              <img
                src="/assets/${thumb}"
                alt="${name}"
                height="44px"
                width="44px"
                class="object-cover rounded-lg"
              />

              <div class="flex flex-col">
                <div class="flex gap-1 items-center font-medium">
                  <h2 class="text-md">${name}</h2>
                  <p class="text-sm text-gray-400">v${version}</p>
                </div>
                <a
                  href="${website}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm font-light text-gray-400"
                  >${website}</a
                >
              </div>
            </div>

            <div>
              <a
                href="javascript:redirectToSuwatte('${runnerPath}')"
                class="px-3 py-2 text-md font-bold bg-purple-200 text-purple-600 rounded-full"
                >GET</a
              >
            </div>
          </div>`;
};

const buildIndexPage = ({ listName, runners, isExperimental }) => {
  const safeListName = escapeHtml(listName || "List");
  const cards = runners.map(buildRunnerCard).join("\n");
  const titleSuffix = isExperimental ? " - Experimental" : "";
  const cssPath = isExperimental ? "../main.css" : "main.css";

  return `<!DOCTYPE html>
<html>
  <head>
    <title>${safeListName}${titleSuffix}</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="${cssPath}" rel="stylesheet" />
    <link
      rel="icon"
      type="image/svg+xml"
      href="https://suwatte.mantton.com/favicon.svg"
    />
    <script>
      function redirectToSuwatte(runner) {
        var currentLocation = window.location.href;
${
  isExperimental
    ? "        currentLocation = currentLocation.replace(/\\/experimental\\/?$/, \"\");\n"
    : ""
}
        if (currentLocation.endsWith("/")) {
          currentLocation = currentLocation.slice(0, -1);
        }

        var url = currentLocation;
        if (runner) {
          url = "suwatte://runner?url=" + currentLocation + "&runner=" + runner;
        } else {
          url = "suwatte://list?url=" + currentLocation;
        }
        window.location.href = url;
      }
    </script>
  </head>
  <body class="container mx-auto p-8 flex-col gap-8">
    <div class="flex gap-4 items-center">
      <h1 class="text-4xl py-4 font-bold">${safeListName}</h1>
      <a
        href="javascript:redirectToSuwatte()"
        class="px-3 py-2 text-md font-bold bg-purple-200 text-purple-600 rounded-full hidden sm:flex"
        >Add To Suwatte</a
      >
    </div>
    <div class="py-4">
      <a
        href="javascript:redirectToSuwatte()"
        class="px-3 py-2 text-md font-bold bg-purple-200 text-purple-600 rounded-full sm:hidden"
        >Add To Suwatte</a
      >
    </div>

${tabsBlock(isExperimental)}

    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <p class="text-xl font-medium">Sources</p>
        <div class="flex flex-col gap-2">
${cards}
        </div>
      </div>
    </div>
  </body>
</html>`;
};

const run = async () => {
  const config = await readJson(path.join(ROOT, "config.json"), null);
  if (!config) {
    throw new Error("Missing config.json");
  }

  const outputDir = path.join(ROOT, config.outputDir || "output");
  const sttDir = path.join(REPO_ROOT, "stt");
  const experimentalDir = path.join(sttDir, "experimental");
  const runnersListPath = path.join(sttDir, "runners.json");

  await ensureDir(experimentalDir);

  const runnersList = await readJson(runnersListPath, { runners: [], listName: "List" });
  const allRunners = runnersList.runners ?? [];
  const pilotRunners = allRunners.filter((runner) =>
    String(runner?.id ?? "").startsWith("pilot.")
  );
  const mainRunners = allRunners.filter(
    (runner) => !String(runner?.id ?? "").startsWith("pilot.")
  );

  const filesToCopy = [
    [path.join(outputDir, "catalog.json"), path.join(experimentalDir, "catalog.json")],
    [path.join(outputDir, "pilots.json"), path.join(experimentalDir, "pilots.json")],
  ];

  for (const [src, dest] of filesToCopy) {
    await fs.copyFile(src, dest);
  }

  const experimentalIndex = buildIndexPage({
    listName: runnersList.listName,
    runners: pilotRunners,
    isExperimental: true,
  });
  await fs.writeFile(path.join(experimentalDir, "index.html"), experimentalIndex, "utf8");

  const mainIndexPath = path.join(sttDir, "index.html");
  const mainIndex = buildIndexPage({
    listName: runnersList.listName,
    runners: mainRunners,
    isExperimental: false,
  });
  await fs.writeFile(mainIndexPath, mainIndex, "utf8");

  console.log(
    `Exported main/experimental indexes (main=${mainRunners.length}, experimental=${pilotRunners.length})`
  );
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
