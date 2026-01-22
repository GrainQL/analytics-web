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

// Helper to flatten directory structure
function flattenDirectory(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    ensureDir(dest);
    fs.readdirSync(src).forEach(childItemName => {
      const srcPath = path.join(src, childItemName);
      const destPath = path.join(dest, childItemName);
      const childStats = fs.statSync(srcPath);
      
      if (childStats.isDirectory()) {
        // Recursively flatten subdirectories
        flattenDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
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
exec('tsc --module esnext --target es2020 --jsx react --declaration --declarationMap --skipLibCheck --moduleResolution node --outDir dist/react-temp src/react/index.tsx');

// Flatten the react subdirectory structure
if (fs.existsSync('dist/react-temp/react')) {
  flattenDirectory('dist/react-temp/react', 'dist/react');
  // Remove the nested react directory
  fs.rmSync('dist/react-temp', { recursive: true });
} else {
  // If no nested structure, copy everything
  copyRecursive('dist/react-temp', 'dist/react');
  fs.rmSync('dist/react-temp', { recursive: true });
}

// Rename .js files to .mjs for ESM
function renameJsToMjs(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      renameJsToMjs(filePath);
    } else if (file.endsWith('.js')) {
      const newPath = filePath.replace('.js', '.mjs');
      fs.renameSync(filePath, newPath);
    }
  });
}

renameJsToMjs('dist/react');

// Build CJS
console.log('\nBuilding React CJS...');
exec('tsc --module commonjs --target es2020 --jsx react --skipLibCheck --moduleResolution node --outDir dist/react-temp src/react/index.tsx');

// Flatten the react subdirectory structure for CJS
if (fs.existsSync('dist/react-temp/react')) {
  // Copy CJS files, overwriting ESM files
  flattenDirectory('dist/react-temp/react', 'dist/react');
  fs.rmSync('dist/react-temp', { recursive: true });
} else {
  // If no nested structure, copy everything
  copyRecursive('dist/react-temp', 'dist/react');
  fs.rmSync('dist/react-temp', { recursive: true });
}

console.log('\nReact package built successfully!');
console.log('  - ESM: dist/react/*.mjs');
console.log('  - CJS: dist/react/*.js');
console.log('  - Types: dist/react/*.d.ts');