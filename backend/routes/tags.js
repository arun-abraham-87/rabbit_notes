const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

console.log('\nInitializing tags router...');

const DATA_DIR = path.join(__dirname, '../notes');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');

console.log('Tags file path:', TAGS_FILE);

// Ensure data directory and tags file exist
const ensureTagsFile = async () => {
  try {
    // First ensure the data directory exists
    try {
      await fs.access(DATA_DIR);
      console.log('Data directory exists:', DATA_DIR);
    } catch {
      await fs.mkdir(DATA_DIR, { recursive: true });
      console.log('Created data directory:', DATA_DIR);
    }

    // Then ensure the tags file exists
    try {
      await fs.access(TAGS_FILE);
      console.log('Tags file exists:', TAGS_FILE);
    } catch {
      await fs.writeFile(TAGS_FILE, JSON.stringify([]));
      console.log('Created tags.json file:', TAGS_FILE);
    }
  } catch (error) {
    console.error('Error ensuring tags file:', error);
    throw error;
  }
};

// Initialize the tags file when the module loads
ensureTagsFile().catch(console.error);

console.log('Tags router routes:');
console.log('- GET /');
console.log('- PUT /');

// Get all tags
router.get('/', async (req, res) => {
  console.log('GET /api/tags - Fetching all tags');
  try {
    await ensureTagsFile();
    const data = await fs.readFile(TAGS_FILE, 'utf8');
    const tags = JSON.parse(data);
    console.log('Successfully fetched tags:', tags);
    res.json(tags);
  } catch (error) {
    console.error('Error reading tags:', error);
    res.status(500).json({ error: 'Failed to read tags' });
  }
});

// Update tags
router.put('/', async (req, res) => {
  console.log('PUT /api/tags - Updating tags');
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags)) {
      console.error('Invalid tags format:', tags);
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    await ensureTagsFile();
    await fs.writeFile(TAGS_FILE, JSON.stringify(tags, null, 2));
    console.log('Successfully updated tags:', tags);
    res.json(tags);
  } catch (error) {
    console.error('Error updating tags:', error);
    res.status(500).json({ error: 'Failed to update tags' });
  }
});

module.exports = router; 