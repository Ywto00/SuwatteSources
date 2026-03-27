import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const readJson = async (filePath, fallback) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const BAD_KEYWORDS = [
  "hentai",
  "porn",
  "doujin",
  "18+",
  "xxx",
  "nsfw",
  "adult",
];

const hasBadKeyword = (value) => {
  if (!value) return false;
  const text = value.toLowerCase();
  return BAD_KEYWORDS.some((keyword) => text.includes(keyword));
};

const scoreEntry = (entry, pilotCfg) => {
  const pkg = (entry?.upstream?.packageName ?? "").toLowerCase();
  const name = (entry?.name ?? "").toLowerCase();
  const website = (entry?.upstream?.website ?? "").toLowerCase();
  const language = (entry?.language ?? "").toLowerCase();

  if (hasBadKeyword(pkg) || hasBadKeyword(name) || hasBadKeyword(website)) {
    return -1000;
  }

  let score = 0;

  if (website.startsWith("https://")) {
    score += 3;
  }

  if ((pilotCfg.preferredLanguages ?? []).includes(language)) {
    score += 2;
  }

  for (const preferred of pilotCfg.preferredPackages ?? []) {
    if (pkg.includes(preferred.toLowerCase())) {
      score += 6;
    }
  }

  if (entry?.translation?.status === "pending") {
    score += 1;
  }

  return score;
};

const run = async () => {
  const config = await readJson(path.join(ROOT, "config.json"), null);
  if (!config) {
    throw new Error("Missing config.json");
  }

  const outputDir = path.join(ROOT, config.outputDir || "output");
  const translatedDir = path.join(outputDir, "translated");
  const pilotCfg = config.pilot ?? {};
  const limit = Number(pilotCfg.limit || 10);
  const requiredPackages = (pilotCfg.requiredPackages ?? []).map((v) =>
    String(v).toLowerCase()
  );

  console.log(`[pilot:select] reading translated sources from ${translatedDir}`);

  const files = await fs.readdir(translatedDir);
  const candidates = [];
  const progressEvery = 200;

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    if (!file.endsWith(".json")) continue;
    const entry = await readJson(path.join(translatedDir, file), null);
    if (!entry?.upstream?.packageName) continue;

    const score = scoreEntry(entry, pilotCfg);
    if (score < 0) continue;

    candidates.push({
      score,
      file,
      entry,
    });

    if ((i + 1) % progressEvery === 0 || i + 1 === files.length) {
      process.stdout.write(`\r[pilot:select] scanned ${i + 1}/${files.length}`);
    }
  }

  process.stdout.write("\n");

  const bestByPackage = new Map();
  for (const row of candidates) {
    const key = row.entry.upstream.packageName;
    const current = bestByPackage.get(key);
    if (!current || row.score > current.score) {
      bestByPackage.set(key, row);
    }
  }

  console.log(
    `[pilot:select] candidates=${candidates.length}, uniquePackages=${bestByPackage.size}, limit=${limit}`
  );

  const sorted = Array.from(bestByPackage.values()).sort(
    (a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name)
  );

  const selectedRows = [];
  const seenPackages = new Set();

  for (const requiredPkg of requiredPackages) {
    const match = sorted.find((row) =>
      row.entry.upstream.packageName.toLowerCase().includes(requiredPkg)
    );
    if (!match) continue;

    const pkg = match.entry.upstream.packageName;
    if (seenPackages.has(pkg)) continue;

    selectedRows.push(match);
    seenPackages.add(pkg);
    if (selectedRows.length >= limit) break;
  }

  for (const row of sorted) {
    if (selectedRows.length >= limit) break;
    const pkg = row.entry.upstream.packageName;
    if (seenPackages.has(pkg)) continue;

    selectedRows.push(row);
    seenPackages.add(pkg);
  }

  const selected = selectedRows.map((row) => ({
      score: row.score,
      descriptorFile: row.file,
      ...row.entry,
    }));

  const payload = {
    generatedAt: new Date().toISOString(),
    totalCandidates: candidates.length,
    selectedCount: selected.length,
    selected,
  };

  await fs.writeFile(
    path.join(outputDir, "pilots.json"),
    JSON.stringify(payload, null, 2),
    "utf8"
  );

  console.log(`[pilot:select] complete: ${selected.length} sources`);
  selected.forEach((item, index) => {
    console.log(
      `[pilot:select] ${index + 1}/${selected.length} ${item.name} [${item.language}] score=${item.score}`
    );
  });

  if (requiredPackages.length) {
    const selectedPkgs = selected
      .map((v) => v?.upstream?.packageName?.toLowerCase() ?? "")
      .join(" | ");
    console.log(
      `[pilot:select] required packages requested: ${requiredPackages.join(", ")} | selected packages: ${selectedPkgs}`
    );
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
