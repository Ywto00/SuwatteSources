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

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const normalizeName = (value, fallback) => {
  const text = (value ?? "").toString().trim();
  if (!text) return fallback;
  return text;
};

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "source";

const toAbsoluteUrl = (base, value) => {
  if (!value || typeof value !== "string") return undefined;
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
};

const parsePayload = (payloadText) => {
  const trimmed = payloadText.trim();

  const tryJson = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  };

  const direct = tryJson(trimmed);
  if (Array.isArray(direct)) return direct;
  if (direct && typeof direct === "object") {
    for (const key of ["extensions", "items", "list", "sources", "data"]) {
      if (Array.isArray(direct[key])) return direct[key];
    }
  }

  const match = trimmed.match(/\[[\s\S]*\]/);
  if (match) {
    const arr = tryJson(match[0]);
    if (Array.isArray(arr)) return arr;
  }

  return [];
};

const flattenExtensions = (rows, indexUrl) => {
  const out = [];

  for (const row of rows) {
    const pkg = typeof row?.pkg === "string" ? row.pkg.trim() : "";
    const extName = normalizeName(row?.name, pkg || "Unknown Extension");
    const extVersion = normalizeName(row?.version, "0");
    const extLang = normalizeName(row?.lang, "UNIVERSAL");
    const apkUrl = toAbsoluteUrl(indexUrl, row?.apk);
    const extSources = Array.isArray(row?.sources) ? row.sources : [];

    if (extSources.length === 0) {
      out.push({
        id: pkg || slugify(extName),
        packageName: pkg || undefined,
        sourceId: undefined,
        sourceName: extName,
        language: extLang,
        version: extVersion,
        website: undefined,
        scriptUrl: apkUrl,
      });
      continue;
    }

    for (const source of extSources) {
      const sourceId = normalizeName(source?.id, "");
      const sourceName = normalizeName(source?.name, extName);
      const language = normalizeName(source?.lang, extLang);
      const website = normalizeName(source?.baseUrl, "") || undefined;

      out.push({
        id: sourceId ? `${pkg}:${sourceId}` : `${pkg}:${slugify(sourceName)}`,
        packageName: pkg,
        sourceId: sourceId || undefined,
        sourceName,
        language,
        version: extVersion,
        website,
        scriptUrl: apkUrl,
      });
    }
  }

  return out;
};

const buildRunnerDescriptor = (source) => {
  const displayName = `Tachi/${source.sourceName}`;
  return {
    id: `translated.${slugify(source.id)}`,
    name: displayName,
    language: source.language,
    upstream: {
      packageName: source.packageName,
      sourceId: source.sourceId,
      version: source.version,
      scriptUrl: source.scriptUrl,
      website: source.website,
    },
    translation: {
      status: "pending",
      lastGeneratedAt: new Date().toISOString(),
    },
  };
};

const run = async () => {
  const configPath = path.join(ROOT, "config.json");
  const config = await readJson(configPath, null);
  if (!config?.indexUrl) {
    throw new Error("Missing indexUrl in config.json");
  }

  const outputDir = path.join(ROOT, config.outputDir || "output");
  const translatedDir = path.join(outputDir, "translated");
  const statePath = path.join(ROOT, config.stateFile || "state/versions.json");

  await ensureDir(path.dirname(statePath));
  await ensureDir(translatedDir);

  console.log(`Fetching index: ${config.indexUrl}`);
  const response = await fetch(config.indexUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch index: HTTP ${response.status}`);
  }

  const payload = await response.text();
  const rows = parsePayload(payload);
  const entries = flattenExtensions(rows, config.indexUrl);

  const previous = await readJson(statePath, { versions: {} });
  const nextVersions = {};

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const progressEvery = 200;

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const key = entry.id;
    const prevVersion = previous.versions[key];
    const currVersion = entry.version;
    nextVersions[key] = currVersion;

    if (prevVersion === currVersion) {
      unchanged += 1;
      continue;
    }

    const descriptor = buildRunnerDescriptor(entry);
    const filename = `${slugify(entry.id)}.json`;
    const filePath = path.join(translatedDir, filename);
    await fs.writeFile(filePath, JSON.stringify(descriptor, null, 2), "utf8");

    if (prevVersion === undefined) {
      created += 1;
    } else {
      updated += 1;
    }

    if ((i + 1) % progressEvery === 0 || i + 1 === entries.length) {
      process.stdout.write(
        `\r[sync] processing ${i + 1}/${entries.length} (created=${created}, updated=${updated}, unchanged=${unchanged})`
      );
    }
  }

  process.stdout.write("\n");

  const state = {
    generatedAt: new Date().toISOString(),
    indexUrl: config.indexUrl,
    stats: {
      total: entries.length,
      created,
      updated,
      unchanged,
    },
    versions: nextVersions,
  };

  await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
  await fs.writeFile(
    path.join(outputDir, "index.json"),
    JSON.stringify(
      {
        name: config.repoName || "Translated Repo",
        generatedAt: state.generatedAt,
        total: entries.length,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log("Sync complete");
  console.log(`Total: ${entries.length}`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Unchanged: ${unchanged}`);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
