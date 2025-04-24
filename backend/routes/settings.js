const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Match the same directory as the main server
const NOTES_DIR = './notes';
const SETTINGS_FILE = path.join(NOTES_DIR, 'settings.json');

console.log('Initializing settings router...');
console.log('Settings file path:', path.resolve(SETTINGS_FILE));

// Ensure settings file exists with default values
const initializeSettingsFile = async () => {
  try {
    await fs.access(SETTINGS_FILE);
    console.log('Settings file exists');
  } catch (error) {
    console.log('Creating new settings file with default values');
    const defaultSettings = {
      theme: 'light',
      sortBy: 'date',
      autoCollapse: false,
      showDates: true
    };
    
    try {
      // Ensure the notes directory exists
      await fs.mkdir(NOTES_DIR, { recursive: true });
      console.log('Notes directory created/verified');
      
      // Create settings.json with default values
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
      console.log('Settings file created successfully');
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
    console.log('Settings retrieved successfully');
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
    console.log('Settings updated successfully');
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
console.log('Settings router routes:');
router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    console.log(`${Object.keys(r.route.methods).join(', ').toUpperCase()} ${r.route.path}`);
  }
});

module.exports = router; 