const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');



const DATA_DIR = path.join(__dirname, '../notes');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');



// Ensure data directory and tags file exist
const ensureTagsFile = async () => {
  try {
    // First ensure the data directory exists
    try {
      await fs.access(DATA_DIR);
      
    } catch {
      await fs.mkdir(DATA_DIR, { recursive: true });
      
    }

    // Then ensure the tags file exists
    try {
      await fs.access(TAGS_FILE);
      
    } catch {
      await fs.writeFile(TAGS_FILE, JSON.stringify([]));
      
    }
  } catch (error) {
    console.error('Error ensuring tags file:', error);
    throw error;
  }
};

// Initialize the tags file when the module loads
ensureTagsFile().catch(console.error);





// Get all tags
router.get('/', async (req, res) => {
  
  try {
    await ensureTagsFile();
    const data = await fs.readFile(TAGS_FILE, 'utf8');
    const tags = JSON.parse(data);
    
    res.json(tags);
  } catch (error) {
    console.error('Error reading tags:', error);
    res.status(500).json({ error: 'Failed to read tags' });
  }
});

// Update tags
router.put('/', async (req, res) => {
  
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags)) {
      console.error('Invalid tags format:', tags);
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    await ensureTagsFile();
    await fs.writeFile(TAGS_FILE, JSON.stringify(tags, null, 2));
    
    res.json(tags);
  } catch (error) {
    console.error('Error updating tags:', error);
    res.status(500).json({ error: 'Failed to update tags' });
  }
});

module.exports = router; 