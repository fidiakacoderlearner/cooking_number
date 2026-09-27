import fs from 'node:fs';

/**
 * Every module the gate is supposed to cover. The UI used to be missing from
 * this list entirely, which is how two dead imports survived in src/ui.
 */
const files = [
  'src/core/rational.js',
  'src/core/operators.js',
  'src/core/evaluate.js',
  'src/core/difficulty.js',
  'src/core/generator.js',
  'src/ui/progress.js',
  'src/ui/i18n.js',
  'src/ui/assets.js',
  'src/ui/state.js',
  'src/ui/view.js',
  'src/ui/drag.js',
  'src/ui/controller.js',
  'src/ui/app.js',
  'scripts/inspect-puzzles.js',
  'test/rational.test.js',
  'test/evaluate.test.js',
  'test/generator.test.js',
  'test/difficulty.test.js',
  'test/progress.test.js',
  'test/state.test.js',
];

let problems = 0;

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const importBlocks = [...source.matchAll(/^import[\s\S]*?from\s+'[^']+';$/gm)];
  const imported = [];
  for (const block of importBlocks) {
    const text = block[0];
    const namespace = text.match(/^import\s+\*\s+as\s+(\w+)/);
    if (namespace) {
      imported.push(namespace[1]);
      continue;
    }
    const named = text.match(/\{([\s\S]*?)\}/);
    if (named) {
      for (const part of named[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop();
        if (name) imported.push(name);
      }
    }
  }

  const body = source.replace(/^import[\s\S]*?from\s+'[^']+';$/gm, '');
  const unused = imported.filter((name) => {
    const pattern = new RegExp(`\\b${name}\\b`);
    return !pattern.test(body);
  });

  if (unused.length) {
    problems += 1;
    console.log(`${file.padEnd(28)} UNUSED: ${unused.join(', ')}`);
  } else {
    console.log(`${file.padEnd(28)} clean (${imported.length} imports)`);
  }
}

console.log(problems === 0 ? '\nNo unused imports.' : `\n${problems} file(s) with unused imports.`);
