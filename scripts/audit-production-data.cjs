const fs = require('fs');
const path = require('path');

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const ignoredPathParts = [
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}dist${path.sep}`,
  `${path.sep}components${path.sep}simulator${path.sep}`,
  `${path.sep}data${path.sep}initialBins.ts`,
];

const forbidden = [
  /figmaAssets/,
  /figmaNearbyBins/,
  /defaultSB024/,
  /fallback rows/i,
  /hardcoded/i,
  /\bSB-091\b/,
  /\bSB-107\b/,
  /\bSB-043\b/,
  /\bSB-018\b/,
  /\bSB-066\b/,
  /\bC-1042\b/,
  /Central Market/,
  /Ridge Park/,
  /Nima Market/,
  /Osu Oxford/,
  /96\.8/,
  /130 Assets/,
  /images\.unsplash/,
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return fullPath;
  });
}

function isIgnored(filePath) {
  return ignoredPathParts.some((part) => filePath.includes(part));
}

function isAllowedDemoLine(filePath, lineNumber, lines) {
  if (!filePath.endsWith(path.join('src', 'context', 'SmartBinContext.tsx'))) return false;
  const before = lines.slice(0, lineNumber).join('\n');
  const demoStart = before.lastIndexOf('const DEMO_');
  const demoEnd = before.lastIndexOf('const getDemoValue');
  return demoStart !== -1 && demoStart > demoEnd;
}

const violations = [];
for (const filePath of walk(sourceRoot)) {
  if (!/\.(ts|tsx)$/.test(filePath) || isIgnored(filePath)) continue;
  const rel = path.relative(root, filePath);
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (isAllowedDemoLine(filePath, index + 1, lines)) return;
    const match = forbidden.find((pattern) => pattern.test(line));
    if (match) violations.push(`${rel}:${index + 1}: ${line.trim()}`);
  });
}

if (violations.length > 0) {
  console.error('Production data audit failed. Demo/Figma fleet fixtures were found in production source:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('Production data audit passed: no screen-level Figma/demo fleet fixtures found in production source.');
