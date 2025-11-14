#!/usr/bin/env node

/**
 * Copy LaTeX template files to the output directory
 * This ensures templates are included in the packaged extension
 */

const fs = require('fs');
const path = require('path');

const srcTemplatesDir = path.join(__dirname, '..', 'src', 'ai', 'export', 'templates');
const outTemplatesDir = path.join(__dirname, '..', 'out', 'ai', 'export', 'templates');

// Check if source templates directory exists
if (!fs.existsSync(srcTemplatesDir)) {
    console.error(`Error: Source templates directory not found: ${srcTemplatesDir}`);
    process.exit(1);
}

// Create output directory if it doesn't exist
if (!fs.existsSync(outTemplatesDir)) {
    fs.mkdirSync(outTemplatesDir, { recursive: true });
    console.log('Created directory:', outTemplatesDir);
}

// Copy all .tex files
const files = fs.readdirSync(srcTemplatesDir);
const texFiles = files.filter(f => f.endsWith('.tex'));

// Use for...of instead of forEach to allow proper error handling
for (const file of texFiles) {
    const srcPath = path.join(srcTemplatesDir, file);
    const destPath = path.join(outTemplatesDir, file);

    try {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied: ${file}`);
    } catch (error) {
        console.error(`Failed to copy ${file}:`, error.message);
        process.exit(1);
    }
}

console.log(`✅ Copied ${texFiles.length} template file(s) to output directory`);

