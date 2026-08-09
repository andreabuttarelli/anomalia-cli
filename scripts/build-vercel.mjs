#!/usr/bin/env node
/**
 * Bundle MCP HTTP handlers into self-contained ESM under api/.
 * Uses Node + esbuild so Vercel does not need Bun for vercel-build.
 *
 * Underscore-prefixed bundles are ignored as routes by Vercel; thin wrappers
 * re-export default + config.
 */
import { mkdirSync, unlinkSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = join(ROOT, 'api');
mkdirSync(API, { recursive: true });

const targets = [
  {
    entry: join(ROOT, 'mcp/entries/mcp.ts'),
    bundle: '_mcp.bundle.js',
    wrapper: 'mcp.js',
    maxDuration: 60,
  },
  {
    entry: join(ROOT, 'mcp/entries/oauth-protected-resource.ts'),
    bundle: '_oauth.bundle.js',
    wrapper: 'oauth-protected-resource.js',
    maxDuration: 30,
  },
];

for (const t of targets) {
  const bundlePath = join(API, t.bundle);
  await esbuild.build({
    entryPoints: [t.entry],
    outfile: bundlePath,
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    sourcemap: false,
    logLevel: 'info',
    banner: {
      js: `import { createRequire as __anomaCreateRequire } from 'module'; const require = __anomaCreateRequire(import.meta.url);`,
    },
  });

  writeFileSync(
    join(API, t.wrapper),
    `import handler from './${t.bundle}';
export default handler;
export const config = { api: { bodyParser: false }, maxDuration: ${t.maxDuration} };
`,
  );
  console.log('wrote', bundlePath, '→', t.wrapper);
}

const healthPath = join(API, 'health.js');
if (!existsSync(healthPath)) {
  writeFileSync(
    healthPath,
    `export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, name: 'anomalia-mcp', mcp: '/mcp' }));
}
export const config = { maxDuration: 10 };
`,
  );
  console.log('wrote fallback', healthPath);
}

for (const stale of [
  '_vercel.ts',
  '_bundle.cjs',
  '_bundle.cjs.map',
  'health.ts',
  'health.cjs',
  'mcp.ts',
  'mcp.cjs',
  'oauth-protected-resource.ts',
  'oauth-protected-resource.cjs',
]) {
  const p = join(API, stale);
  if (existsSync(p)) {
    unlinkSync(p);
    console.log('removed', p);
  }
}

console.log('Done. api/health.js + api/mcp.js + api/oauth-protected-resource.js');
