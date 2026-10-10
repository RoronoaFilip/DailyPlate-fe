// Guards the colour palette copied from the desktop app. Run: npm run check:theme
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

// Source of truth: the desktop app's main window stylesheet (presentation/main_window.py) and review colours.
const EXPECTED = {
  '--bg': '#edf2f9', '--bg-dialog': '#e8eef7', '--surface': '#f1f5fb', '--surface-header': '#dfe8f5',
  '--text': '#243041', '--text-strong': '#172538', '--text-muted': '#536175', '--border': '#c2cede',
  '--btn-bg': '#ffffff', '--btn-text': '#243b61', '--btn-border': '#9db0cf', '--btn-hover': '#eef3fc',
  '--btn-pressed': '#dbe5f6', '--primary': '#3f5bbf', '--primary-border': '#334c9f',
  '--primary-hover': '#324ba6', '--primary-pressed': '#2a3f8c', '--focus': '#4f68c5',
  '--rail': '#263752', '--rail-border': '#1e2c43', '--rail-text': '#d6e0ef', '--rail-active': '#506da4',
  '--rail-active-edge': '#b9d0ff', '--ok': '#1f7a4d', '--ok-bg': '#e1f3e8', '--danger': '#b53d48',
  '--danger-bg': '#fbe1e4', '--warn': '#9a6700', '--warn-bg': '#fff0d2',
};

const problems = [];
const css = read('src/styles.css');
const rootBlock = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
for (const [token, value] of Object.entries(EXPECTED)) {
  const found = new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(rootBlock)?.[1]?.toLowerCase();
  if (found !== value) {
    problems.push(`${token} should be ${value} but is ${found ?? 'missing'}`);
  }
}
if (/prefers-color-scheme\s*:\s*dark/.test(css)) {
  problems.push('there must be no dark theme (the desktop app has none)');
}
if (!/font-size:\s*16px/.test(css)) {
  problems.push('the base font size must stay 16px so iOS does not zoom into fields');
}
if (!read('src/index.html').includes(`name="theme-color" content="${EXPECTED['--rail']}"`)) {
  problems.push('index.html theme-color must be the navigation rail colour');
}
const manifest = JSON.parse(read('public/manifest.webmanifest'));
if (manifest.theme_color !== EXPECTED['--rail'] || manifest.background_color !== EXPECTED['--bg']) {
  problems.push('manifest theme_color/background_color must be the rail and background colours');
}

if (problems.length > 0) {
  console.error('Palette problems:\n' + problems.map((line) => `  - ${line}`).join('\n'));
  process.exit(1);
}
console.log(`Theme OK: ${Object.keys(EXPECTED).length} palette tokens match the desktop app.`);
