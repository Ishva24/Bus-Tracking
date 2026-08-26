const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'public/index.html',
  'public/styles.css',
  'public/app.js',
  'scripts/serve.js',
];

for (const file of requiredFiles) {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required mobile app file: ${file}`);
  }
}

console.log('mobile app build validated');
