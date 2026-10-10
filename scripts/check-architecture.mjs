// Enforces the dependency rules in .claude/architecture.md. Run: npm run check:arch
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Which layers a layer may import (besides itself). `*` means anything. */
const ALLOWED = {
  domain: [],
  data: ['domain'],
  ui: ['domain'],
  feature: ['domain', 'data', 'ui'], // plus its own folder; never another feature
  app: ['*'],
};

export function layerOf(pathFromApp) {
  const parts = pathFromApp.split('/');
  if (parts[0] === 'domain' || parts[0] === 'data' || parts[0] === 'ui') {
    return { layer: parts[0], id: parts[0] };
  }
  if (parts[0] === 'features' && parts.length > 2) {
    return { layer: 'feature', id: `features/${parts[1]}` };
  }
  return { layer: 'app', id: 'app' };
}

function* typescriptFiles(directory) {
  for (const name of readdirSync(directory)) {
    const full = join(directory, name);
    if (statSync(full).isDirectory()) {
      yield* typescriptFiles(full);
    } else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) {
      yield full;
    }
  }
}

export function importsOf(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const found = [];
  const patterns = [
    /\b(?:import|export)\s[^'";]*?\sfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) {
      found.push(match[1]);
    }
  }
  return found;
}

/** Returns a list of human-readable violations (empty when the architecture is respected). */
export function checkArchitecture(appDirectory) {
  const root = resolve(appDirectory);
  const violations = [];
  for (const file of typescriptFiles(root)) {
    const fromPath = relative(root, file).split(sep).join('/');
    const from = layerOf(fromPath);
    const isSpec = fromPath.endsWith('.spec.ts');
    for (const specifier of importsOf(readFileSync(file, 'utf8'))) {
      if (!specifier.startsWith('.')) {
        if (from.layer === 'domain' && !(isSpec && specifier === 'vitest')) {
          violations.push(`${fromPath}: domain must stay framework-free, but imports "${specifier}"`);
        }
        continue;
      }
      const target = relative(root, resolve(dirname(file), specifier)).split(sep).join('/');
      if (target.startsWith('..')) {
        continue; // leaves src/app (for example ../main); only the app root may do that
      }
      const to = layerOf(target + '.ts');
      if (to.id === from.id || ALLOWED[from.layer].includes('*') || ALLOWED[from.layer].includes(to.layer)) {
        continue;
      }
      violations.push(`${fromPath}: ${from.id} must not import ${to.id} ("${specifier}")`);
    }
  }
  return violations;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const appDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
  const violations = checkArchitecture(appDirectory);
  if (violations.length > 0) {
    console.error('Architecture violations:\n' + violations.map((line) => `  - ${line}`).join('\n'));
    process.exit(1);
  }
  console.log('Architecture OK: layer dependencies respected.');
}
