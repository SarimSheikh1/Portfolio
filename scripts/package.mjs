import archiver from "archiver";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
await mkdir("delivery", { recursive: true });
const output = createWriteStream("delivery/sarim-idea-universe.zip");
const archive = archiver("zip", { zlib: { level: 9 } });
archive.pipe(output);
const completed = new Promise((resolve, reject) => {
  output.on("close", resolve);
  output.on("error", reject);
  archive.on("error", reject);
});
for (const name of [
  "client",
  "server",
  "shared",
  "scripts",
  "tests",
  "evidence",
  "docs",
])
  archive.glob(`${name}/**/*`, {
    ignore: ["**/dist/**", "**/node_modules/**", "**/*.log"],
  });
for (const file of [
  "package.json",
  "package-lock.json",
  "README.md",
  ".env.example",
  ".gitignore",
  "compose.yaml",
  "playwright.config.ts",
  "vercel.json",
  "netlify.toml",
])
  archive.file(file, { name: file });
await archive.finalize();
await completed;
console.log(
  `Clean source ZIP: delivery/sarim-idea-universe.zip (${archive.pointer()} bytes)`,
);
