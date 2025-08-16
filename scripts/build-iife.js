const { build } = require('esbuild');
const fs = require('fs');
const path = require('path');

async function buildIIFE() {
  try {
    // Build the IIFE version
    await build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      format: 'iife',
      globalName: 'Grain',
      platform: 'browser',
      target: 'es2020',
      outfile: 'dist/index.global.js',
      minify: true,
      sourcemap: true,
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      banner: {
        js: `/* Grain Analytics Web SDK v${require('../package.json').version} | MIT License */`
      }
    });

    console.log('✓ Built IIFE version: dist/index.global.js');

    // Also create an unminified version for debugging
    await build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      format: 'iife',
      globalName: 'Grain',
      platform: 'browser',
      target: 'es2020',
      outfile: 'dist/index.global.dev.js',
      minify: false,
      sourcemap: true,
      define: {
        'process.env.NODE_ENV': '"development"'
      },
      banner: {
        js: `/* Grain Analytics Web SDK v${require('../package.json').version} | MIT License | Development Build */`
      }
    });

    console.log('✓ Built IIFE development version: dist/index.global.dev.js');

  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildIIFE();
