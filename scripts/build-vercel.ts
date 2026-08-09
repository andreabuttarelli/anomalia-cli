#!/usr/bin/env bun
/**
 * Bundle MCP HTTP handlers into self-contained CJS (.cjs) under api/.
 * package.json has "type":"module", so .js would be treated as ESM and crash.
 */
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import * as esbuild from 'esbuild';

const ROOT = join(import.meta.dir, '..');
const API = join(ROOT, 'api');
mkdirSync(API, { recursive: true });

const entry = join(ROOT, 'mcp/vercel-handler.ts');
const bundlePath = join(API, '_bundle.cjs');

await esbuild.build({
  entryPoints: [entry],
  outfile: bundlePath,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  logLevel: 'info',
});

const targets: { file: string; exportName: string; maxDuration: number }[] = [
  { file: 'mcp.cjs', exportName: 'mcp', maxDuration: 60 },
  { file: 'oauth-protected-resource.cjs', exportName: 'oauthProtectedResource', maxDuration: 30 },
];

for (const t of targets) {
  const out = join(API, t.file);
  writeFileSync(
    out,
    `"use strict";
const handlers = require("./_bundle.cjs");
module.exports = handlers.${t.exportName};
module.exports.config = { api: { bodyParser: false }, maxDuration: ${t.maxDuration} };
`,
  );
  console.log('wrote', out);
}

for (const stale of [
  '_vercel.ts',
  'health.ts',
  'mcp.ts',
  'oauth-protected-resource.ts',
  'health.js',
  'mcp.js',
  'oauth-protected-resource.js',
]) {
  const p = join(API, stale);
  if (existsSync(p)) {
    unlinkSync(p);
    console.log('removed', p);
  }
}

console.log('Done. api/health.cjs (zero-dep) + api/mcp.cjs + api/oauth-protected-resource.cjs');
