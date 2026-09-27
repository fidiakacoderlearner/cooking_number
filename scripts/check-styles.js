/**
 * Catches `var(--name)` references that nothing defines.
 *
 * A missing custom property does not fail loudly. The declaration using it is
 * dropped at computed-value time, the property falls back to its initial value,
 * and the result is a colour that quietly disappears: the patience bar went grey
 * because it had been given `var(--butter-deep)` while the stylesheet defines
 * `butter-dark`. Nothing else in the project looked at CSS, so nothing else
 * could have said so.
 *
 *   node scripts/check-styles.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const stylesDir = path.join(root, 'styles');

/** Custom properties a browser provides on its own, so they are not ours to define. */
const BUILT_IN = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);

function readStyles() {
  if (!fs.existsSync(stylesDir)) return [];
  return fs
    .readdirSync(stylesDir)
    .filter((name) => name.endsWith('.css'))
    .map((name) => ({
      name,
      lines: fs.readFileSync(path.join(stylesDir, name), 'utf8').split(/\r?\n/),
    }));
}

function collect(files) {
  const defined = new Map();
  const used = [];

  for (const file of files) {
    file.lines.forEach((line, index) => {
      // Strip a trailing comment so a `--name` mentioned in prose is not counted
      // as a definition.
      const code = line.replace(/\/\*.*?\*\//g, '');
      // A definition always starts its line. Anchoring there keeps BEM
      // modifiers like `.btn--serve:disabled` and `.tile--unary::after` from
      // being mistaken for custom properties.
      for (const match of code.matchAll(/^\s*(--[A-Za-z0-9-]+)\s*:/g)) {
        if (!defined.has(match[1])) defined.set(match[1], []);
        defined.get(match[1]).push(`${file.name}:${index + 1}`);
      }
      for (const match of code.matchAll(/var\(\s*(--[A-Za-z0-9-]+)/g)) {
        if (!BUILT_IN.has(match[1])) used.push({ name: match[1], where: `${file.name}:${index + 1}` });
      }
    });
  }
  return { defined, used };
}

function main() {
  const files = readStyles();
  if (files.length === 0) {
    console.error(`no stylesheets found in ${stylesDir}`);
    process.exit(1);
  }

  const { defined, used } = collect(files);
  const missing = used.filter((use) => !defined.has(use.name));

  for (const file of files) {
    console.log(`${file.name.padEnd(18)} ${file.lines.length} baris`);
  }

  const unused = [...defined.keys()].filter(
    (name) => !used.some((use) => use.name === name),
  );

  console.log(`\n${defined.size} variabel didefinisikan, ${used.length} rujukan, ${missing.length} hilang.`);
  if (unused.length > 0) {
    console.log(`Tidak dipakai: ${unused.join(', ')}`);
  }

  if (missing.length > 0) {
    for (const use of missing) {
      console.error(`  MISSING ${use.name} dipakai di ${use.where} tapi tidak didefinisikan`);
    }
    console.error(`\n${missing.length} variabel hilang.`);
    process.exit(1);
  }
  console.log('Semua variabel CSS yang dipakai ada definisinya.');
}

main();
