import { lstat, mkdir, readFile, readdir, realpath, symlink, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/link-agent-context.mjs [--target <directory>] [--claude]');
  console.log('Default target: sibling frontend. Adds relative skill links and a shared AGENTS.md reference.');
  process.exit(0);
}
let target = resolve(repo, '../frontend');
let claude = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--claude') claude = true;
  else if (args[i] === '--target' && args[i + 1]) target = resolve(process.cwd(), args[++i]);
  else throw new Error(`Unknown or incomplete option: ${args[i]}`);
}
if (await realpath(target) === await realpath(repo)) {
  throw new Error('dev-workflow already exposes its skills; choose the workspace root or frontend.');
}

async function statIfPresent(path) {
  try { return await lstat(path); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
const portable = path => path.replaceAll('\\', '/');
const skills = (await readdir(resolve(repo, 'skills'), { withFileTypes: true }))
  .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
const links = [];
for (const agentDir of claude ? ['.agents', '.claude'] : ['.agents']) {
  for (const skill of skills) {
    const source = resolve(repo, 'skills', skill);
    await readFile(resolve(source, 'SKILL.md'), 'utf8');
    const dest = resolve(target, agentDir, 'skills', skill);
    const existing = await statIfPresent(dest);
    if (existing) {
      if (!existing.isSymbolicLink() || await realpath(dest) !== await realpath(source)) {
        throw new Error(`Refusing to replace existing skill: ${dest}`);
      }
    } else links.push({ source, dest });
  }
}

const instructions = resolve(target, 'AGENTS.md');
const existing = await statIfPresent(instructions);
if (existing && !existing.isFile()) throw new Error(`Refusing to modify non-regular file: ${instructions}`);
const original = existing ? await readFile(instructions, 'utf8') : '';
const start = '<!-- vista-dev-workflow:start -->';
const end = '<!-- vista-dev-workflow:end -->';
const reference = portable(relative(target, resolve(repo, 'AGENTS.md')));
const block = `${start}\n## UI refinement\n\nRead [dev-workflow instructions](<${reference}>) before working on VISTA.\nLoad its UI refinement section for frontend changes, including pen updates before every UI change.\nRepository skills are exposed in .agents/skills; their canonical sources live in dev-workflow.\n${end}`;
const startIndex = original.indexOf(start);
const endIndex = original.indexOf(end);
if ((startIndex < 0) !== (endIndex < 0) || (startIndex >= 0 && endIndex < startIndex)
    || original.indexOf(start, startIndex + 1) >= 0 || original.indexOf(end, endIndex + 1) >= 0) {
  throw new Error('Malformed or duplicate shared instruction markers; resolve manually before linking.');
}
const updated = startIndex < 0
  ? `${original}${original && !original.endsWith('\n') ? '\n' : ''}${original ? '\n' : ''}${block}\n`
  : original.slice(0, startIndex) + block + original.slice(endIndex + end.length);

// Preflight all existing files before writing; never replace user-owned skills or instructions.
for (const { source, dest } of links) {
  await mkdir(dirname(dest), { recursive: true });
  await symlink(relative(dirname(dest), source), dest, 'dir');
}
if (updated !== original) await writeFile(instructions, updated, 'utf8');
console.log(`Linked ${skills.length} skills and shared instructions at ${target}`);
console.log('These are local cross-repository links. Keep dev-workflow beside the target and review git status before committing.');
