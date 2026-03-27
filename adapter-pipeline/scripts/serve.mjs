import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const loadConfig = async () => {
  const raw = await fs.readFile(path.join(ROOT, "config.json"), "utf8");
  return JSON.parse(raw);
};

const getContentType = (filePath) => {
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
};

const run = async () => {
  const config = await loadConfig();
  const rootDir = path.join(ROOT, config.outputDir || "output");
  const port = Number(config.port || 4177);

  const server = http.createServer(async (req, res) => {
    try {
      const requestPath = req.url === "/" ? "/index.json" : (req.url || "/index.json");
      const safe = path.normalize(requestPath).replace(/^([.][.][/\\])+/, "");
      const filePath = path.join(rootDir, safe);

      const data = await fs.readFile(filePath);
      res.writeHead(200, { "Content-Type": getContentType(filePath) });
      res.end(data);
    } catch {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Not Found" }));
    }
  });

  server.listen(port, () => {
    console.log(`Local translated repo running at http://localhost:${port}`);
    console.log(`Serving directory: ${rootDir}`);
  });
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
