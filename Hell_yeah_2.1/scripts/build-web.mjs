import {
  cp,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
const root = path.resolve(import.meta.dirname, ".."),
  source = path.join(root, "web"),
  output = path.join(root, "dist");
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
const manifest = JSON.parse(
  await readFile(path.join(root, ".openai/hosting.json"), "utf8"),
);
if (manifest.static?.directory !== "dist")
  throw new Error("Static hosting directory must be dist.");
const html = await readFile(path.join(output, "index.html"), "utf8");
for (const asset of [...html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)].map(
  (m) => m[1],
))
  await stat(path.join(output, asset));
const files = await readdir(path.join(output, "js"));
if (!files.includes("app.mjs"))
  throw new Error("Application entrypoint missing.");
await writeFile(
  path.join(output, "_headers"),
  `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n`,
);
console.log(
  JSON.stringify({
    build: "success",
    entry: "dist/index.html",
    modules: files.length,
    mode: "fixture",
    externalRuntimeDependencies: 0,
  }),
);
