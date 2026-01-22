#!/usr/bin/env node

/**
 * Script to build SDK and copy to dashboard node_modules
 * Usage: node scripts/copy-to-dashboard.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DASHBOARD_PATH = path.resolve(__dirname, '../../grainql');
const TARGET_PATH = path.join(DASHBOARD_PATH, 'node_modules', '@grainql', 'analytics-web');

console.log('🚀 Building SDK...');
execSync('npm run build', { stdio: 'inherit', cwd: __dirname + '/..' });

console.log('\n📦 Copying to dashboard...');

// Remove existing target if it exists
if (fs.existsSync(TARGET_PATH)) {
  console.log(`Removing existing ${TARGET_PATH}...`);
  fs.rmSync(TARGET_PATH, { recursive: true, force: true });
}

// Create target directory
fs.mkdirSync(TARGET_PATH, { recursive: true });

// Copy package.json
fs.copyFileSync(
  path.join(__dirname, '..', 'package.json'),
  path.join(TARGET_PATH, 'package.json')
);

// Copy dist folder
console.log('Copying dist folder...');
const distPath = path.join(__dirname, '..', 'dist');
const targetDistPath = path.join(TARGET_PATH, 'dist');
fs.cpSync(distPath, targetDistPath, { recursive: true });

// Copy README if it exists
const readmePath = path.join(__dirname, '..', 'README.md');
if (fs.existsSync(readmePath)) {
  fs.copyFileSync(readmePath, path.join(TARGET_PATH, 'README.md'));
}

console.log(`\n✅ SDK copied to ${TARGET_PATH}`);
console.log('\n💡 Next steps:');
console.log('   1. Restart your Next.js dev server');
console.log('   2. Changes will require re-running this script');
