const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Ensure journals directory exists
const JOURNALS_DIR = path.join(__dirname, '../../journals');

// Initialize journals directory
async function initJournalsDir() {
  try {
    await fs.access(JOURNALS_DIR);
    console.log('✓ Journals directory exists');
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(JOURNALS_DIR, { recursive: true });
      console.log('✓ Created journals directory');
    } else {
      console.error('Error accessing journals directory:', error);
      throw error;
    }
  }
}

// Initialize directory when the router is loaded
initJournalsDir().catch(error => {
  console.error('Failed to initialize journals directory:', error);
  process.exit(1);
});

// Validate date parameter
function isValidDate(dateStr) {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date) && dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
}

// Get journal entry for a specific date
router.get('/:date', async (req, res) => {
  try {
    const date = req.params.date;
    
    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    const filePath = path.join(JOURNALS_DIR, `journal_${date}.json`);
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      res.json(JSON.parse(data));
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Return empty journal if file doesn't exist
        res.json({
          date: date,
          content: '',
          metadata: {
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            tags: [],
            wordCount: 0,
            charCount: 0,
            mood: null,
            topics: []
          }
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error reading journal:', error);
    res.status(500).json({ error: 'Failed to read journal entry' });
  }
});

// Save or update journal entry
router.post('/:date', async (req, res) => {
  try {
    const date = req.params.date;
    
    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    const { content } = req.body;
    
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }
    
    const filePath = path.join(JOURNALS_DIR, `journal_${date}.json`);
    
    let existingData = {};
    try {
      const existing = await fs.readFile(filePath, 'utf8');
      existingData = JSON.parse(existing);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    const journalData = {
      date,
      content,
      metadata: {
        created: existingData.metadata?.created || new Date().toISOString(),
        lastModified: new Date().toISOString(),
        tags: extractTags(content),
        wordCount: countWords(content),
        charCount: content.length,
        mood: extractMood(content),
        topics: extractTopics(content)
      }
    };

    await fs.writeFile(filePath, JSON.stringify(journalData, null, 2));
    res.json(journalData);
  } catch (error) {
    console.error('Error saving journal:', error);
    res.status(500).json({ error: 'Failed to save journal entry' });
  }
});

// List all journal entries (metadata only)
router.get('/', async (req, res) => {
  try {
    const files = await fs.readdir(JOURNALS_DIR);
    const journals = await Promise.all(
      files
        .filter(file => file.startsWith('journal_') && file.endsWith('.json'))
        .map(async file => {
          try {
            const data = await fs.readFile(path.join(JOURNALS_DIR, file), 'utf8');
            const journal = JSON.parse(data);
            return {
              date: journal.date,
              metadata: journal.metadata,
              preview: journal.content.substring(0, 100) + (journal.content.length > 100 ? '...' : '')
            };
          } catch (error) {
            console.error(`Error reading journal file ${file}:`, error);
            return null;
          }
        })
    );
    
    res.json(journals.filter(Boolean).sort((a, b) => b.date.localeCompare(a.date)));
  } catch (error) {
    console.error('Error listing journals:', error);
    res.status(500).json({ error: 'Failed to list journal entries' });
  }
});

// Helper functions
function extractTags(content) {
  const tagRegex = /#[\w-]+/g;
  return [...new Set(content.match(tagRegex) || [])];
}

function countWords(content) {
  return content.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function extractMood(content) {
  const moodRegex = /mood::([\w-]+)/i;
  const match = content.match(moodRegex);
  return match ? match[1].toLowerCase() : null;
}

function extractTopics(content) {
  const topicRegex = /topic::([\w-]+)/g;
  return [...new Set(content.match(topicRegex) || [])].map(topic => 
    topic.replace('topic::', '').toLowerCase()
  );
}

module.exports = router; 