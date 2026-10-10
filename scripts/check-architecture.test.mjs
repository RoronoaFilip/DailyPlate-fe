import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { checkArchitecture, importsOf } from './check-architecture.mjs';

const roots = [];
function project(files) {
  const root = mkdtempSync(join(tmpdir(), 'arch-'));
  roots.push(root);
  for (const [name, content] of Object.entries(files)) {
    const full = join(root, name);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}
after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

describe('check-architecture', () => {
  it('accepts imports that follow the layers', () => {
    const root = project({
      'domain/a.ts': "import { b } from './b';\nexport const a = b;",
      'domain/b.ts': 'export const b = 1;',
      'domain/a.spec.ts': "import { it } from 'vitest';\nimport { a } from './a';",
      'data/store.ts': "import { Injectable } from '@angular/core';\nimport { a } from '../domain/a';",
      'ui/button.ts': "import { Component } from '@angular/core';\nimport type { a } from '../domain/a';",
      'features/meal/meal-page.ts':
        "import { a } from '../../domain/a';\nimport { s } from '../../data/store';\nimport { u } from '../../ui/button';\nimport { h } from './helper';",
      'features/meal/helper.ts': 'export const h = 1;',
      'app.config.ts': "import { s } from './data/store';\nconst x = () => import('./features/meal/meal-page');",
    });
    assert.deepEqual(checkArchitecture(root), []);
  });

  it('keeps the domain free of frameworks', () => {
    const root = project({ 'domain/a.ts': "import { signal } from '@angular/core';" });
    assert.match(checkArchitecture(root).join('\n'), /domain must stay framework-free/);
  });

  it('allows the domain specs to use the test framework only', () => {
    const root = project({ 'domain/a.spec.ts': "import { it } from 'vitest';\nimport x from 'rxjs';" });
    const found = checkArchitecture(root);
    assert.equal(found.length, 1);
    assert.match(found[0], /rxjs/);
  });

  it('stops lower layers reaching up', () => {
    const root = project({
      'domain/a.ts': "import { s } from '../data/store';",
      'data/store.ts': "import { b } from '../ui/button';",
      'ui/button.ts': "import { s } from '../data/store';",
      'features/x/x.ts': 'export const x = 1;',
      'data/y.ts': "import { x } from '../features/x/x';",
    });
    const text = checkArchitecture(root).join('\n');
    assert.match(text, /domain must not import data/);
    assert.match(text, /data must not import ui/);
    assert.match(text, /ui must not import data/);
    assert.match(text, /data must not import features\/x/);
  });

  it('stops one feature importing another', () => {
    const root = project({
      'features/a/a.ts': "import { b } from '../b/b';",
      'features/b/b.ts': 'export const b = 1;',
    });
    assert.match(checkArchitecture(root).join('\n'), /features\/a must not import features\/b/);
  });

  it('finds multi-line, export-from, side-effect and dynamic imports and ignores comments', () => {
    const found = importsOf(`
      import {
        a,
        b,
      } from './multi';
      export { c } from './reexport';
      import './side-effect';
      const lazy = () => import('./lazy');
      // import { nope } from './commented';
      /* import { nope2 } from './block'; */
    `);
    assert.deepEqual(found.sort(), ['./lazy', './multi', './reexport', './side-effect']);
  });
});
