const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());


const cors = require('cors');

app.use(cors({
    origin: 'http://localhost:3000', // Allow requests only from this origin
}));


const NOTES_DIR = './notes';

if (!fs.existsSync(NOTES_DIR)) fs.mkdirSync(NOTES_DIR);

app.get('/api/notes', (req, res) => {
  const searchQuery = req.query.search || '';
  const files = fs.readdirSync(NOTES_DIR);
  const notes = files
    .map((file) => {
      const data = JSON.parse(fs.readFileSync(path.join(NOTES_DIR, file), 'utf-8'));
      return data;
    })
    .filter((note) => note.content.includes(searchQuery) || note.tags.some((tag) => tag.includes(searchQuery)));

  res.json({ notes, totals: notes.length });
});

app.post('/api/notes', (req, res) => {
  const { content, tags } = req.body;
  const id = uuidv4();
  const note = { id, content, created_datetime: new Date().toISOString(), tags };
  fs.writeFileSync(path.join(NOTES_DIR, `${id}.md`), JSON.stringify(note));
  res.json(note);
});

const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
