/**
 * Build script for React package
 * Compiles src/react/ to dist/react/ for both ESM and CJS
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper to execute command
function exec(command) {
  console.log(`$ ${command}`);
  execSync(command, { stdio: 'inherit' });
}

// Helper to ensure directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Helper to copy files recursively
function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    ensureDir(dest);
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('Building React package...');

// Clean previous build
console.log('Cleaning previous React build...');
if (fs.existsSync('dist/react')) {
  fs.rmSync('dist/react', { recursive: true });
}
if (fs.existsSync('dist/react-temp')) {
  fs.rmSync('dist/react-temp', { recursive: true });
}

// Build ESM
console.log('\nBuilding React ESM...');
ensureDir('dist/react');
exec('tsc --module esnext --target es2020 --jsx react --declaration --declarationMap --skipLibCheck --outDir dist/react-temp src/react/index.tsx');

// Copy ESM JS files
const esmFiles = [];
function findJsFiles(dir, baseDir = dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findJsFiles(filePath, baseDir);
    } else if (file.endsWith('.js')) {
      const relativePath = path.relative(baseDir, filePath);
      esmFiles.push(relativePath);
    }
  });
}

findJsFiles('dist/react-temp');

// Copy and rename ESM files
esmFiles.forEach(file => {
  const srcPath = path.join('dist/react-temp', file);
  const destPath = path.join('dist/react', file.replace('.js', '.mjs'));
  ensureDir(path.dirname(destPath));
  fs.copyFileSync(srcPath, destPath);
});

// Copy declaration files for ESM
const dtsFiles = [];
function findDtsFiles(dir, baseDir = dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findDtsFiles(filePath, baseDir);
    } else if (file.endsWith('.d.ts') || file.endsWith('.d.ts.map')) {
      const relativePath = path.relative(baseDir, filePath);
      dtsFiles.push(relativePath);
    }
  });
}

findDtsFiles('dist/react-temp');

dtsFiles.forEach(file => {
  const srcPath = path.join('dist/react-temp', file);
  const destPath = path.join('dist/react', file);
  ensureDir(path.dirname(destPath));
  fs.copyFileSync(srcPath, destPath);
});

// Clean temp ESM build
fs.rmSync('dist/react-temp', { recursive: true });

// Build CJS
console.log('\nBuilding React CJS...');
exec('tsc --module commonjs --target es2020 --jsx react --skipLibCheck --outDir dist/react-temp src/react/index.tsx');

// Copy CJS files
const cjsFiles = [];
findJsFiles('dist/react-temp');

esmFiles.length = 0;
findJsFiles('dist/react-temp');

esmFiles.forEach(file => {
  const srcPath = path.join('dist/react-temp', file);
  const destPath = path.join('dist/react', file);
  ensureDir(path.dirname(destPath));
  fs.copyFileSync(srcPath, destPath);
});

// Clean temp CJS build
fs.rmSync('dist/react-temp', { recursive: true });

console.log('\nReact package built successfully!');
console.log('  - ESM: dist/react/*.mjs');
console.log('  - CJS: dist/react/*.js');
console.log('  - Types: dist/react/*.d.ts');

