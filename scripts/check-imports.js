/**
 * Unused import detection with directory-scan module list.
 *
 * The old version had a hand-maintained file list. `src/ui` was missing for two
 * releases, which is how two unused imports survived (CHANGELOG.md:441).
 * Reading the module list off the filesystem makes a new file covered the moment
 * it is created — the list cannot go stale.
 *
 *   node scripts/check-imports.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Directories that hold first-party modules. */
const SOURCE_DIRS = ['src', 'test', 'scripts'];

/** Every `.js` file under the source directories, sorted for a stable report. */
function sourceFiles() {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.js')) found.push(full);
    }
  };
  for (const dir of SOURCE_DIRS) {
    const full = path.join(root, dir);
    if (fs.existsSync(full)) walk(full);
  }
  return found.sort();
}

/** The `import ...` statements in a file, matched as whole lines. */
function importBlocks(source) {
  return [...source.matchAll(/^import[\s\S]*?from\s+'[^']+';$/gm)].map((match) => match[0]);
}

/** Strip the import block, leaving only the body that should reference things. */
function bodyOf(source) {
  return source.replace(/^import[\s\S]*?from\s+'[^']+';$/gm, '');
}

/**
 * The names a file pulls in.
 *
 * A namespace import is reported under its own local name, so `import * as S`
 * is checked as `S`. `check-imports` only has to prove the local name appears
 * somewhere in the body, which is the same thing the caller has to do anyway.
 */
function importedNames(source) {
  const names = [];
  for (const block of importBlocks(source)) {
    const namespace = block.match(/^import\s+\*\s+as\s+(\w+)/);
    if (namespace) {
      names.push(namespace[1]);
      continue;
    }
    const named = block.match(/\{([\s\S]*?)\}/);
    if (!named) continue;
    for (const part of named[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop();
      if (name) names.push(name.trim());
    }
  }
  return names;
}

function main() {
  const files = sourceFiles();
  if (files.length === 0) {
    console.error('no .js files found under src/, test/ or scripts/');
    process.exit(1);
  }

  let problems = 0;

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const body = bodyOf(source);
    const label = path.relative(root, file);

    const unusedImports = importedNames(source).filter(
      (name) => !new RegExp(`\\b${name}\\b`).test(body),
    );
    if (unusedImports.length) {
      problems += 1;
      console.log(`${label.padEnd(28)} UNUSED IMPORT: ${unusedImports.join(', ')}`);
    } else {
      console.log(`${label.padEnd(28)} clean`);
    }
  }

  console.log(`\n${files.length} file, ${problems} dengan import mati.`);
  if (problems) process.exit(1);
  console.log('Semua import dipakai.');
}

main();