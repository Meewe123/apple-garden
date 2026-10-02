// Serves the built site (_site) the way GitHub Pages does: under a path prefix,
// with 404.html for unknown paths. Zero dependencies; used by e2e tests and Lighthouse.
//
//   node scripts/serve.mjs [--port 4173] [--prefix /apple-garden/]

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    port: { type: "string", default: process.env.PORT ?? "4173" },
    prefix: { type: "string", default: process.env.PATH_PREFIX ?? "/apple-garden/" },
    root: { type: "string", default: "_site" },
  },
});

const root = path.resolve(values.root);
const prefix = `/${values.prefix.replace(/^\/+|\/+$/g, "")}/`.replace("//", "/");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

/** @param {string} file */
async function isFile(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

/** Maps a URL path to a file inside `root`, or null. Never escapes `root`. */
async function resolveFile(urlPath) {
  if (!urlPath.startsWith(prefix)) return null;
  const relative = decodeURIComponent(urlPath.slice(prefix.length));
  const candidate = path.resolve(root, relative);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) return null;
  for (const file of [candidate, path.join(candidate, "index.html"), `${candidate}.html`]) {
    if (await isFile(file)) return file;
  }
  return null;
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  if (pathname === prefix.slice(0, -1)) {
    res.writeHead(301, { location: prefix }).end();
    return;
  }
  const file = await resolveFile(pathname);
  const status = file ? 200 : 404;
  const body = file ?? path.join(root, "404.html");
  const type = TYPES[path.extname(body)] ?? "application/octet-stream";
  res.writeHead(status, { "content-type": type });
  createReadStream(body).pipe(res);
});

server.listen(Number(values.port), () => {
  console.log(`Serving ${path.relative(process.cwd(), root)} at http://localhost:${values.port}${prefix}`);
});
