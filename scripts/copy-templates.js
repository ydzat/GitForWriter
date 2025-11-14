#!/usr/bin/env node

/**
 * Copy LaTeX template files to the output directory
 * This ensures templates are included in the packaged extension
 */

const fs = require('fs');
const path = require('path');

const srcTemplatesDir = path.join(__dirname, '..', 'src', 'ai', 'export', 'templates');
const outTemplatesDir = path.join(__dirname, '..', 'out', 'ai', 'export', 'templates');

// Create output directory if it doesn't exist
if (!fs.existsSync(outTemplatesDir)) {
    fs.mkdirSync(outTemplatesDir, { recursive: true });
    console.log('Created directory:', outTemplatesDir);
}

// Copy all .tex files
const files = fs.readdirSync(srcTemplatesDir);
const texFiles = files.filter(f => f.endsWith('.tex'));

texFiles.forEach(file => {
    const srcPath = path.join(srcTemplatesDir, file);
    const destPath = path.join(outTemplatesDir, file);
    
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied: ${file}`);
});

console.log(`✅ Copied ${texFiles.length} template file(s) to output directory`);

