import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'docs', 'architecture', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const backendConfig = manifest.apps?.backend ?? {};
const crossWorkspaceRules = manifest.crossWorkspaceRules ?? {};
const backendLayerRules = backendConfig.layerRules ?? {};

const IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
  '.next',
  '.cache',
]);
const TS_FILE = /\.ts$/;

const workspaceRoots = ['apps', 'packages'];
const workspacePackageMap = buildWorkspacePackageMap();
const layerMatchers = buildLayerMatchers();

const files = collectSourceFiles();
const violations = [];

for (const absoluteFilePath of files) {
  const fromRel = toPosix(path.relative(repoRoot, absoluteFilePath));
  const fromLayer = getBackendLayer(fromRel);
  const moduleName = getBackendModuleName(fromRel);
  const source = fs.readFileSync(absoluteFilePath, 'utf8');
  const specifiers = extractImportSpecifiers(source);

  for (const specifier of specifiers) {
    const resolved = resolveImportSpecifier(absoluteFilePath, specifier);
    if (!resolved) {
      continue;
    }

    const toRel = toPosix(path.relative(repoRoot, resolved));

    // Cross-workspace rules from manifest.
    if (
      crossWorkspaceRules.packagesMustNotImportApps &&
      fromRel.startsWith('packages/') &&
      toRel.startsWith('apps/')
    ) {
      addViolation(fromRel, specifier, toRel, 'packages must not import apps');
    }

    if (
      crossWorkspaceRules.appsMustNotImportOtherApps &&
      isAppsFile(fromRel) &&
      isAppsFile(toRel) &&
      getAppName(fromRel) !== getAppName(toRel)
    ) {
      addViolation(fromRel, specifier, toRel, 'apps must not import other apps directly');
    }

    // Backend layer must-not rules from manifest layerRules.
    if (fromLayer) {
      const checks = layerMatchers[fromLayer] ?? [];
      for (const check of checks) {
        if (check.regex.test(toRel)) {
          addViolation(
            fromRel,
            specifier,
            toRel,
            `backend ${fromLayer} must not depend on "${check.pattern}"`
          );
        }
      }
    }

    // Module-level boundary: module A must not import module B infrastructure/presentation.
    if (
      moduleName &&
      moduleName !== getBackendModuleName(toRel) &&
      isBackendModuleInfraOrPresentationPath(toRel)
    ) {
      addViolation(
        fromRel,
        specifier,
        toRel,
        'module A must not import module B infrastructure/presentation'
      );
    }
  }
}

if (violations.length === 0) {
  console.log('Boundary check passed.');
  process.exit(0);
}

console.error(`Boundary check failed with ${violations.length} violation(s):`);
for (const violation of violations) {
  console.error(
    `- ${violation.from} imports "${violation.specifier}" (${violation.to}) -> ${violation.reason}`
  );
}
process.exit(1);

function collectSourceFiles() {
  const collected = [];
  for (const root of workspaceRoots) {
    const absoluteRoot = path.join(repoRoot, root);
    if (!fs.existsSync(absoluteRoot)) {
      continue;
    }
    walk(absoluteRoot, (entryPath) => {
      const rel = toPosix(path.relative(repoRoot, entryPath));
      if (!TS_FILE.test(entryPath)) {
        return;
      }
      if (!rel.includes('/src/')) {
        return;
      }
      collected.push(entryPath);
    });
  }
  return collected;
}

function walk(dir, onFile) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }
      walk(path.join(dir, entry.name), onFile);
      continue;
    }
    onFile(path.join(dir, entry.name));
  }
}

function extractImportSpecifiers(source) {
  const out = new Set();
  const patterns = [
    /\bimport\s+[^'"]*?\sfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
    /\bexport\s+[^'"]*?\sfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(source);
    while (match) {
      out.add(match[1]);
      match = pattern.exec(source);
    }
  }

  return [...out];
}

function resolveImportSpecifier(fromAbsoluteFilePath, specifier) {
  if (specifier.startsWith('node:')) {
    return null;
  }

  if (specifier.startsWith('.')) {
    return resolveAsPath(path.resolve(path.dirname(fromAbsoluteFilePath), specifier));
  }

  if (specifier.startsWith('apps/') || specifier.startsWith('packages/')) {
    return resolveAsPath(path.join(repoRoot, specifier));
  }

  for (const [packageName, packagePath] of workspacePackageMap.entries()) {
    if (specifier === packageName) {
      return packagePath;
    }
    if (specifier.startsWith(`${packageName}/`)) {
      const subpath = specifier.slice(packageName.length + 1);
      return resolveAsPath(path.join(packagePath, subpath));
    }
  }

  return null;
}

function resolveAsPath(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
  ];

  for (const candidate of candidates) {
    if (!candidate.startsWith(repoRoot)) {
      continue;
    }
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    return basePath;
  }

  return null;
}

function buildWorkspacePackageMap() {
  const map = new Map();
  for (const root of workspaceRoots) {
    const absoluteRoot = path.join(repoRoot, root);
    if (!fs.existsSync(absoluteRoot)) {
      continue;
    }
    for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const packageJsonPath = path.join(absoluteRoot, entry.name, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        continue;
      }
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (!packageJson.name) {
        continue;
      }
      map.set(packageJson.name, path.join(absoluteRoot, entry.name));
    }
  }
  return map;
}

function buildLayerMatchers() {
  const result = {};
  for (const [layerName, layerRule] of Object.entries(backendLayerRules)) {
    const patterns = Array.isArray(layerRule.mustNotDependOn) ? layerRule.mustNotDependOn : [];
    result[layerName] = patterns.map((pattern) => ({
      pattern,
      regex: compileManifestPattern(pattern),
    }));
  }
  return result;
}

function compileManifestPattern(pattern) {
  const normalized = toPosix(pattern);
  const escaped = normalized
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '<<<DOUBLE>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<DOUBLE>>>/g, '.*');

  const withSuffix = /(\.\*|\[\^\/\]\*)$/.test(escaped) ? escaped : `${escaped}(?:/.*)?`;
  return new RegExp(`^${withSuffix}$`);
}

function getBackendLayer(relPath) {
  if (!relPath.startsWith('apps/backend/src/')) {
    return null;
  }
  if (relPath.includes('/domain/')) {
    return 'domain';
  }
  if (relPath.includes('/application/')) {
    return 'application';
  }
  if (relPath.includes('/infrastructure/')) {
    return 'infrastructure';
  }
  if (relPath.includes('/presentation/')) {
    return 'presentation';
  }
  return null;
}

function getBackendModuleName(relPath) {
  const match = relPath.match(/^apps\/backend\/src\/modules\/([^/]+)\//);
  return match ? match[1] : null;
}

function isBackendModuleInfraOrPresentationPath(relPath) {
  return (
    /^apps\/backend\/src\/modules\/[^/]+\/infrastructure\//.test(relPath) ||
    /^apps\/backend\/src\/modules\/[^/]+\/presentation\//.test(relPath)
  );
}

function isAppsFile(relPath) {
  return relPath.startsWith('apps/');
}

function getAppName(relPath) {
  const match = relPath.match(/^apps\/([^/]+)\//);
  return match ? match[1] : null;
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function addViolation(from, specifier, to, reason) {
  violations.push({ from, specifier, to, reason });
}
