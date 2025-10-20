/**
 * Fix ESM imports to include .js extensions
 * Node.js ESM requires explicit file extensions for relative imports
 */

const fs = require('fs');
const path = require('path');

function fixESMImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix relative imports to include .js extension
    // Match patterns like: from './module' or from './module'
    content = content.replace(
      /from\s+['"]\.\/([^'"]+)['"]/g,
      "from './$1.js'"
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✓ Fixed ESM imports in ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`Error fixing imports in ${filePath}:`, error.message);
  }
}

// Fix the main ESM file
fixESMImports('dist/index.mjs');

// Fix all individual module files
const distFiles = fs.readdirSync('dist');
distFiles.forEach(file => {
  if (file.endsWith('.js') && file !== 'index.js') {
    fixESMImports(`dist/${file}`);
  }
});

console.log('✓ ESM import fixes completed');
