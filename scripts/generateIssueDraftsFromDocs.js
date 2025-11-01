#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const docsDir = path.join(repoRoot, 'docs');
const outputDir = path.join(repoRoot, 'issue-drafts');

function readDocs(dir) {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join(dir, name));
}

function getDocTitle(lines) {
  for (const line of lines) {
    const match = line.match(/^#{1,6}\s+(.+)/);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

function slugify(text, maxLength = 80) {
  const basic = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  if (!basic) {
    return 'issue';
  }
  return basic.length > maxLength ? basic.slice(0, maxLength).replace(/-+$/g, '') : basic;
}

function formatContext(sections) {
  return sections.filter(Boolean).join(' › ');
}

function buildIssueTitle(docTitle, context, taskText) {
  const base = context ? `${docTitle} — ${context}` : docTitle;
  const trimmedTask = taskText.replace(/^["'“”]+|["'“”]+$/g, '').trim();
  const combined = `${base}: ${trimmedTask}`;
  return combined.replace(/\s+/g, ' ').trim();
}

function createIssueMarkdown({
  title,
  relativePath,
  context,
  taskText,
  docTitle,
}) {
  const sourceLink = path.posix.join('docs', relativePath.split(path.sep).join('/'));
  const contextLine = context ? `- **Section:** ${context}\n` : '';
  return `# ${title}\n\n- **Source:** [${docTitle}](${sourceLink})\n${contextLine}\n## Task\n${taskText.trim()}\n\n## Acceptance Criteria\n- [ ] ${taskText.trim()}\n`;
}

function extractIssuesFromDoc(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const docTitle = getDocTitle(lines) || path.basename(filePath, '.md');
  const relativePath = path.relative(docsDir, filePath);
  const issues = [];
  const headingStack = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      headingStack[level - 1] = headingMatch[2].trim();
      headingStack.length = level;
      continue;
    }

    const taskMatch = line.match(/^\s*[-*]\s+\[\s?\]\s+(.*)/);
    if (taskMatch) {
      const taskText = taskMatch[1].trim();
      const contextSections = headingStack.slice(1).filter(Boolean);
      if (
        contextSections.length > 0 &&
        contextSections[0].localeCompare(docTitle, undefined, { sensitivity: 'accent' }) === 0
      ) {
        contextSections.shift();
      }
      const context = formatContext(contextSections);
      const title = buildIssueTitle(docTitle, context, taskText);
      issues.push({ title, context, taskText, docTitle, relativePath });
    }
  }

  return issues;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function clearDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}

function main() {
  const docFiles = readDocs(docsDir);
  const collected = docFiles.flatMap(extractIssuesFromDoc);

  ensureDir(outputDir);
  clearDir(outputDir);

  const manifest = [];

  collected.forEach((issue, index) => {
    const number = String(index + 1).padStart(3, '0');
    const slug = slugify(issue.title);
    const fileName = `${number}-${slug}.md`;
    const content = createIssueMarkdown(issue);
    fs.writeFileSync(path.join(outputDir, fileName), content, 'utf8');
    manifest.push({
      file: fileName,
      title: issue.title,
      source: path.posix.join('docs', issue.relativePath.split(path.sep).join('/')),
    });
  });

  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  const example =
    manifest.length > 0
      ? `gh issue create --title "${manifest[0].title.replace(/"/g, '\\"')}" --body-file issue-drafts/${manifest[0].file}`
      : 'gh issue create --title "<title>" --body-file issue-drafts/<file>';

  const tableRows = manifest
    .map((entry) => `| [${entry.file}](${entry.file}) | ${entry.title.replace(/\|/g, '\\|')} | ${entry.source} |`)
    .join('\n');

  const readme = `# Issue Drafts\n\nThis directory contains ${manifest.length} GitHub issue drafts derived from documentation.\n\n## Usage\n\n1. Update the docs, then run \`node scripts/generateIssueDraftsFromDocs.js\` to refresh these drafts.\n2. Open an issue on GitHub by copying the relevant markdown body, or use the GitHub CLI:\n\n   \`${example}\`\n\nAdjust labels, assignees, and milestones as needed when creating issues.\n\n## Draft Index\n\n| File | Title | Source |\n| --- | --- | --- |\n${tableRows}\n`;

  fs.writeFileSync(path.join(outputDir, 'README.md'), readme, 'utf8');
}

main();
