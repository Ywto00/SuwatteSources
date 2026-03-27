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

const sourceKeyFromPackage = (packageName) => {
  if (!packageName) return "unknown";
  const parts = packageName.split(".");
  return parts[parts.length - 1] || packageName;
};

const sourceTitleFromPackage = (packageName) => {
  const key = sourceKeyFromPackage(packageName);
  return key
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

const normalizeStatus = (value) => {
  if (!value) return undefined;
  const text = String(value).trim().toLowerCase();
  if (["functional", "experimental", "non-functional"].includes(text)) {
    return text;
  }
  return undefined;
};

const toStatus = (descriptor, pilotPackageSet, overrides = {}) => {
  const id = descriptor?.id;
  const pkg = descriptor?.upstream?.packageName;
  const sourceKey = sourceKeyFromPackage(pkg);

  const overridden =
    normalizeStatus(overrides?.byId?.[id]) ||
    normalizeStatus(overrides?.byPackage?.[pkg]) ||
    normalizeStatus(overrides?.bySourceKey?.[sourceKey]);
  if (overridden) return overridden;

  const translationStatus = descriptor?.translation?.status;
  if (translationStatus === "functional") return "functional";

  if (pkg && pilotPackageSet.has(pkg)) {
    return "experimental";
  }

  return "non-functional";
};

const statusWeight = (status) => {
  if (status === "functional") return 3;
  if (status === "experimental") return 2;
  return 1;
};

const statusPrefix = (status) => {
  if (status === "functional") return "[FUNCTIONAL]";
  if (status === "experimental") return "[EXPERIMENTAL]";
  return "[INCOMPATIBLE]";
};

const buildHtml = (repoName, catalogJsonPath) => {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${repoName} - Experimental Catalog</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: #f5f7fb; color: #1f2937; }
      .wrap { max-width: 1120px; margin: 0 auto; padding: 24px; }
      .card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
      h1 { margin: 0 0 12px; }
      .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
      input { flex: 1; min-width: 220px; border: 1px solid #d1d5db; border-radius: 10px; padding: 10px 12px; }
      select { border: 1px solid #d1d5db; border-radius: 10px; padding: 10px 12px; }
      .muted { color: #6b7280; font-size: 13px; }
      .group { margin-top: 14px; }
      .group h3 { margin: 0 0 8px; }
      .badge { border-radius: 999px; padding: 2px 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
      .functional { background: #dcfce7; color: #166534; }
      .experimental { background: #fef9c3; color: #854d0e; }
      .non-functional { background: #fee2e2; color: #991b1b; }
      .item { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
      .item-top { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
      .item-name { font-weight: 700; }
      .meta { font-size: 12px; color: #6b7280; margin-top: 4px; word-break: break-word; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>Experimental Translation Catalog</h1>
        <p class="muted">Functional, experimental and non-functional translated sources. Search and filter are in English.</p>
        <p class="muted">Only <strong>functional</strong> entries are expected to work end-to-end. Experimental and incompatible are for testing and translation progress tracking.</p>
        <div class="row" style="margin-top:12px">
          <input id="search" placeholder="Search by source, package, language..." />
          <select id="status">
            <option value="all">All statuses</option>
            <option value="functional">Functional</option>
            <option value="experimental">Experimental</option>
            <option value="non-functional">Non-functional</option>
          </select>
        </div>
        <p id="summary" class="muted" style="margin-top:10px"></p>
      </div>
      <div id="content" class="group"></div>
    </div>
    <script>
      const content = document.getElementById('content');
      const summary = document.getElementById('summary');
      const searchEl = document.getElementById('search');
      const statusEl = document.getElementById('status');

      const statusClass = (s) => {
        if (s === 'functional') return 'functional';
        if (s === 'experimental') return 'experimental';
        return 'non-functional';
      };

      const render = (groups, query, status) => {
        const q = query.trim().toLowerCase();
        let shownGroups = 0;
        let shownItems = 0;

        const html = groups.map((group) => {
          const filteredItems = group.items.filter((item) => {
            if (status !== 'all' && item.status !== status) return false;
            if (!q) return true;
            const blob = [
              group.title,
              item.name,
              item.language,
              item.packageName,
              item.website,
              item.version,
            ].join(' ').toLowerCase();
            return blob.includes(q);
          });

          if (filteredItems.length === 0) return '';

          shownGroups += 1;
          shownItems += filteredItems.length;

          const langs = Array.from(new Set(filteredItems.map((v) => v.language))).join(', ');

          return 
            '<div class="card group">' +
              '<h3>' + group.title + '</h3>' +
              '<p class="muted">Languages: ' + langs + ' • Sources: ' + filteredItems.length + '</p>' +
              '<div style="margin-top:10px">' +
                filteredItems.map((item) =>
                  '<div class="item">' +
                    '<div class="item-top">' +
                      '<div class="item-name">' + item.displayName + '</div>' +
                      '<span class="badge ' + statusClass(item.status) + '">' + item.status + '</span>' +
                    '</div>' +
                    '<div class="meta">' + item.packageName + ' • ' + item.language + ' • v' + item.version + '</div>' +
                    '<div class="meta">' + (item.website || 'No website') + '</div>' +
                  '</div>'
                ).join('') +
              '</div>' +
            '</div>';
        }).join('');

        content.innerHTML = html || '<div class="card"><p class="muted">No results found.</p></div>';
        summary.textContent = shownItems + ' source(s) in ' + shownGroups + ' group(s)';
      };

      fetch('${catalogJsonPath}')
        .then((r) => r.json())
        .then((data) => {
          const groups = data.groups || [];
          const rerender = () => render(groups, searchEl.value, statusEl.value);
          searchEl.addEventListener('input', rerender);
          statusEl.addEventListener('change', rerender);
          rerender();
        })
        .catch(() => {
          content.innerHTML = '<div class="card"><p class="muted">Failed to load catalog.</p></div>';
        });
    </script>
  </body>
</html>`;
};

const run = async () => {
  const config = await readJson(path.join(ROOT, "config.json"), null);
  if (!config) {
    throw new Error("Missing config.json");
  }

  const outputDir = path.join(ROOT, config.outputDir || "output");
  const translatedDir = path.join(outputDir, "translated");
  const pilotsFile = path.join(outputDir, "pilots.json");
  const overridesFile = path.join(ROOT, "state", "status-overrides.json");

  const pilots = await readJson(pilotsFile, { selected: [] });
  const overrides = await readJson(overridesFile, {});
  const pilotPackageSet = new Set(
    (pilots.selected ?? [])
      .map((v) => v?.upstream?.packageName)
      .filter(Boolean)
  );

  const files = await fs.readdir(translatedDir);
  const items = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const descriptor = await readJson(path.join(translatedDir, file), null);
    if (!descriptor?.upstream?.packageName) continue;

    items.push({
      id: descriptor.id,
      name: descriptor.name,
      language: descriptor.language,
      version: descriptor?.upstream?.version ?? "0",
      website: descriptor?.upstream?.website ?? "",
      packageName: descriptor.upstream.packageName,
      status: toStatus(descriptor, pilotPackageSet, overrides),
      descriptorFile: file,
    });
  }

  for (const item of items) {
    item.displayName = `${statusPrefix(item.status)} ${item.name}`;
  }

  const groupedMap = new Map();
  for (const item of items) {
    const key = sourceKeyFromPackage(item.packageName);
    const current = groupedMap.get(key) ?? {
      key,
      title: sourceTitleFromPackage(item.packageName),
      items: [],
      maxStatusWeight: 0,
    };
    current.items.push(item);
    current.maxStatusWeight = Math.max(current.maxStatusWeight, statusWeight(item.status));
    groupedMap.set(key, current);
  }

  const groups = Array.from(groupedMap.values())
    .map((group) => {
      group.items.sort((a, b) => {
        const sw = statusWeight(b.status) - statusWeight(a.status);
        if (sw !== 0) return sw;
        return a.language.localeCompare(b.language) || a.name.localeCompare(b.name);
      });
      return group;
    })
    .sort((a, b) => {
      const sw = b.maxStatusWeight - a.maxStatusWeight;
      if (sw !== 0) return sw;
      return a.title.localeCompare(b.title);
    });

  const functional = items.filter((v) => v.status === "functional").length;
  const experimental = items.filter((v) => v.status === "experimental").length;
  const nonFunctional = items.filter((v) => v.status === "non-functional").length;

  const catalog = {
    generatedAt: new Date().toISOString(),
    stats: {
      total: items.length,
      functional,
      experimental,
      nonFunctional,
      groups: groups.length,
    },
    groups,
  };

  await ensureDir(outputDir);
  await fs.writeFile(path.join(outputDir, "catalog.json"), JSON.stringify(catalog, null, 2), "utf8");
  await fs.writeFile(
    path.join(outputDir, "catalog.html"),
    buildHtml(config.repoName || "Translated Repo", "./catalog.json"),
    "utf8"
  );

  console.log("Catalog generated");
  console.log(`Total: ${items.length}`);
  console.log(`Functional: ${functional}`);
  console.log(`Experimental: ${experimental}`);
  console.log(`Non-functional: ${nonFunctional}`);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
