import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const run = async () => {
  const output = path.join(ROOT, "output");
  const state = path.join(ROOT, "state");

  await fs.rm(output, { recursive: true, force: true });
  await fs.rm(state, { recursive: true, force: true });
  console.log("Pipeline output cleaned");
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
