const fs = require('fs').promises;
const path = require('path');

async function initDirectories() {
  const rootDir = path.join(__dirname, '..');
  const dirs = ['notes', 'journals'];

  for (const dir of dirs) {
    const dirPath = path.join(rootDir, dir);
    try {
      await fs.access(dirPath);
      console.log(`✓ ${dir} directory exists`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`✓ Created ${dir} directory`);
      } else {
        console.error(`Error accessing ${dir} directory:`, error);
      }
    }
  }
}

initDirectories().catch(console.error); 