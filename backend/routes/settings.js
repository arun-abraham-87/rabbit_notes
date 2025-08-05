const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Match the same directory as the main server
const NOTES_DIR = './notes';
const SETTINGS_FILE = path.join(NOTES_DIR, 'settings.json');




// Ensure settings file exists with default values
const initializeSettingsFile = async () => {
  try {
    await fs.access(SETTINGS_FILE);
    
  } catch (error) {
    
    const defaultSettings = {
      theme: 'light',
      sortBy: 'date',
      autoCollapse: false,
      showDates: true,
      showCreatedDate: false,
      searchQuery: '',
      totals: {
        total: 0,
        todos: 0,
        meetings: 0,
        events: 0
      }
    };
    
    try {
      // Ensure the notes directory exists
      await fs.mkdir(NOTES_DIR, { recursive: true });
      
      
      // Create settings.json with default values
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
      
    } catch (err) {
      console.error('Error creating settings file:', err);
      throw err;
    }
  }
};

// Initialize settings file on module load
initializeSettingsFile().catch(error => {
  console.error('Failed to initialize settings file:', error);
});

// Get settings
router.get('/', async (req, res) => {
  try {
    await initializeSettingsFile();
    const settings = await fs.readFile(SETTINGS_FILE, 'utf8');
    
    res.json(JSON.parse(settings));
  } catch (error) {
    console.error('Error reading settings:', error);
    res.status(500).json({ error: 'Failed to read settings: ' + error.message });
  }
});

// Update settings
router.post('/', async (req, res) => {
  try {
    await initializeSettingsFile();
    const settings = req.body;
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    
    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings: ' + error.message });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Settings router is working', path: path.resolve(SETTINGS_FILE) });
});

// Debug: List registered routes

router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    
  }
});

module.exports = router; 