import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const nextRoot = join(process.cwd(), '.next');
const routes = {
  login: 'server/app/login.html',
  overview: 'server/app/overview.html',
  workspace: 'server/app/workspace.html',
  statistics: 'server/app/statistics.html',
  expense: 'server/app/expenses/new.html',
  income: 'server/app/incomes/new.html',
};

function routeChunks(file) {
  const html = readFileSync(join(nextRoot, file), 'utf8');
  return [
    ...new Set(
      [...html.matchAll(/src="\/_next\/(static\/chunks\/[^\"]+\.js)"/g)].map(
        (match) => match[1],
      ),
    ),
  ];
}

function size(chunks) {
  return chunks.reduce(
    (result, file) => {
      const content = readFileSync(join(nextRoot, file));
      result.raw += content.length;
      result.gzip += gzipSync(content).length;
      return result;
    },
    { raw: 0, gzip: 0 },
  );
}

function sourceMetrics(root) {
  let client = 0;
  let total = 0;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.name === '.next' || entry.name === 'node_modules') continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      const nested = sourceMetrics(path);
      client += nested.client;
      total += nested.total;
    } else if (entry.name.endsWith('.tsx')) {
      total += 1;
      if (/^(['"])use client\1;/m.test(readFileSync(path, 'utf8'))) client += 1;
    }
  }
  return { client, total };
}

function cssSourceSize(file, seen = new Set()) {
  if (seen.has(file)) return 0;
  seen.add(file);
  const content = readFileSync(file, 'utf8');
  const imports = [...content.matchAll(/@import\s+['"]([^'"]+)['"];?/g)];
  if (!imports.length) return Buffer.byteLength(content);
  const localContent = content.replace(/@import\s+['"]([^'"]+)['"];?\s*/g, '');
  return (
    Buffer.byteLength(localContent) +
    imports.reduce(
      (total, match) =>
        total + cssSourceSize(resolve(dirname(file), match[1]), seen),
      0,
    )
  );
}

const chunkSets = Object.fromEntries(
  Object.entries(routes).map(([route, file]) => [route, routeChunks(file)]),
);
const common = chunkSets.login.filter((chunk) =>
  Object.values(chunkSets).every((chunks) => chunks.includes(chunk)),
);

for (const [route, chunks] of Object.entries(chunkSets)) {
  const total = size(chunks);
  const routeOnly = size(chunks.filter((chunk) => !common.includes(chunk)));
  console.log(
    `${route}: first-load=${total.gzip} gzip bytes; route-only=${routeOnly.gzip} gzip bytes`,
  );
}

const cssPath = join(process.cwd(), 'app/globals.css');
console.log(`global-css=${cssSourceSize(cssPath)} bytes`);
const components = sourceMetrics(process.cwd());
console.log(`client-tsx=${components.client}/${components.total}`);
