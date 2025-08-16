const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch (error) {
    return 0;
  }
}

function getGzippedSize(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return gzipSync(content).length;
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatPercentage(size, baseSize) {
  return `${((size / baseSize) * 100).toFixed(1)}%`;
}

console.log('🚀 Grain Analytics Web SDK - Bundle Size Analysis\n');

const distDir = path.join(__dirname, '..', 'dist');
const files = [
  { name: 'ESM (Tree-shakeable)', path: 'index.mjs', primary: true },
  { name: 'CommonJS', path: 'index.js', primary: true },
  { name: 'IIFE (Minified)', path: 'index.global.js', primary: true },
  { name: 'IIFE (Development)', path: 'index.global.dev.js', primary: false },
  { name: 'TypeScript Definitions', path: 'index.d.ts', primary: false }
];

console.log('📦 Bundle Sizes:\n');

const results = files.map(file => {
  const filePath = path.join(distDir, file.path);
  const size = getFileSize(filePath);
  const gzippedSize = getGzippedSize(filePath);
  
  return {
    ...file,
    size,
    gzippedSize,
    filePath
  };
});

// Find the smallest minified bundle for comparison
const minifiedBundle = results.find(r => r.path === 'index.global.js');
const baseSize = minifiedBundle ? minifiedBundle.gzippedSize : 0;

results.forEach(result => {
  const { name, size, gzippedSize, primary } = result;
  const icon = primary ? '🔥' : '📄';
  const sizeStr = formatBytes(size);
  const gzipStr = formatBytes(gzippedSize);
  const percentage = baseSize > 0 ? ` (${formatPercentage(gzippedSize, baseSize)} of minified)` : '';
  
  console.log(`${icon} ${name.padEnd(25)} ${sizeStr.padStart(8)} | ${gzipStr.padStart(8)} gzipped${percentage}`);
});

console.log('\n🎯 Key Metrics:\n');

const esmBundle = results.find(r => r.path === 'index.mjs');
const minified = results.find(r => r.path === 'index.global.js');

if (minified) {
  console.log(`🏆 Smallest bundle:     ${formatBytes(minified.gzippedSize)} (gzipped IIFE)`);
}

if (esmBundle) {
  console.log(`🌲 Tree-shakeable ESM:  ${formatBytes(esmBundle.gzippedSize)} (gzipped)`);
}

console.log('\n📊 Bundle Comparison:\n');

// Compare to popular analytics libraries
const competitors = [
  { name: 'Google Analytics (gtag)', size: '28 KB' },
  { name: 'Mixpanel', size: '45 KB' },
  { name: 'Amplitude', size: '35 KB' },
  { name: 'Segment Analytics.js', size: '50 KB' },
  { name: '@grainql/analytics-web', size: formatBytes(minified ? minified.gzippedSize : 0) + ' (gzipped)' }
];

competitors.forEach((comp, index) => {
  const icon = index === competitors.length - 1 ? '🚀' : '📈';
  console.log(`${icon} ${comp.name.padEnd(25)} ${comp.size}`);
});

console.log('\n💡 Size Optimization Tips:\n');
console.log('• Use the ESM build for tree-shaking in modern bundlers');
console.log('• The IIFE build is perfect for simple script tag usage');
console.log('• Enable gzip compression on your server for ~60% size reduction');
console.log('• Consider lazy loading for non-critical analytics features');

// Check if bundles are within reasonable limits
const warnings = [];

if (minified && minified.gzippedSize > 5 * 1024) {
  warnings.push(`⚠️  Minified bundle (${formatBytes(minified.gzippedSize)}) is larger than 5KB gzipped`);
}

if (esmBundle && esmBundle.size > 15 * 1024) {
  warnings.push(`⚠️  ESM bundle (${formatBytes(esmBundle.size)}) is larger than 15KB`);
}

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:\n');
  warnings.forEach(warning => console.log(warning));
} else {
  console.log('\n✅ All bundle sizes are within optimal ranges!');
}

console.log('\n🔗 Online Tools:');
console.log('• BundlePhobia: https://bundlephobia.com/package/@grainql/analytics-web');
console.log('• Package Phobia: https://packagephobia.com/result?p=@grainql/analytics-web');
console.log('• Bundle Size: https://bundlesize.io/');
