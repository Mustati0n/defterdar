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
const performanceBudgets = {
  firstLoadGzip: 280_000,
  routeOnlyGzip: 35_000,
  loginRouteOnlyGzip: 85_000,
  globalCss: 140_000,
};
const shouldCheckBudgets = process.argv.includes('--check');

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

const routeMeasurements = {};
for (const [route, chunks] of Object.entries(chunkSets)) {
  const total = size(chunks);
  const routeOnly = size(chunks.filter((chunk) => !common.includes(chunk)));
  routeMeasurements[route] = { total, routeOnly };
  console.log(
    `${route}: first-load=${total.gzip} gzip bytes; route-only=${routeOnly.gzip} gzip bytes`,
  );
}

const cssPath = join(process.cwd(), 'app/globals.css');
const globalCssBytes = cssSourceSize(cssPath);
console.log(`global-css=${globalCssBytes} bytes`);
const components = sourceMetrics(process.cwd());
console.log(`client-tsx=${components.client}/${components.total}`);

if (shouldCheckBudgets) {
  const failures = [];
  for (const [route, measurement] of Object.entries(routeMeasurements)) {
    if (measurement.total.gzip > performanceBudgets.firstLoadGzip) {
      failures.push(
        `${route} first-load bütçeyi aşıyor: ${measurement.total.gzip} > ${performanceBudgets.firstLoadGzip}`,
      );
    }
    const routeBudget =
      route === 'login'
        ? performanceBudgets.loginRouteOnlyGzip
        : performanceBudgets.routeOnlyGzip;
    if (measurement.routeOnly.gzip > routeBudget) {
      failures.push(
        `${route} route-only bütçeyi aşıyor: ${measurement.routeOnly.gzip} > ${routeBudget}`,
      );
    }
  }
  if (globalCssBytes > performanceBudgets.globalCss) {
    failures.push(
      `global CSS bütçeyi aşıyor: ${globalCssBytes} > ${performanceBudgets.globalCss}`,
    );
  }
  if (failures.length) {
    for (const failure of failures) console.error(`BÜTÇE HATASI: ${failure}`);
    process.exitCode = 1;
  } else {
    console.log('performance-budgets=passed');
  }
}
