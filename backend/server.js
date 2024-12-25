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
  try {
    const searchQuery = req.query.search ? req.query.search.toLowerCase() : ''; // Normalize search query for case-insensitive search
    const files = fs.readdirSync(NOTES_DIR); // Read files from the directory
    
    let notesArray = [];
    
    // Process each file and add valid notes to notesArray
    files.forEach((file) => {
      try {
        const filePath = path.join(NOTES_DIR, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8'); // Read file content
        const notesInFile = JSON.parse(fileContent); // Parse JSON content
        
        if (Array.isArray(notesInFile)) {
          notesArray = notesArray.concat(notesInFile); // If the file contains an array, merge it into notesArray
        } else {
          console.error(`File ${file} does not contain a valid notes array.`);
        }
      } catch (err) {
        console.error(`Failed to process file: ${file}`, err.message); // Log specific file errors
      }
    });

    // Filter notes based on the search query
    const filteredNotes = notesArray.filter((note) => 
      note && (
        !searchQuery || 
        note.content.toLowerCase().includes(searchQuery) || 
        note.tags.some((tag) => tag.toLowerCase().includes(searchQuery))
      )
    );

    console.log("Returning Notes", filteredNotes);
    res.json({ notes: filteredNotes, total: filteredNotes.length }); // Respond with filtered notes and count
  } catch (err) {
    console.error("Error fetching notes:", err.message);
    res.status(500).json({ error: "Failed to fetch notes. Please try again later." }); // Respond with a 500 status for server errors
  }
});




app.post('/api/notes', (req, res) => {
  try {
    const { content, tags } = req.body;

    const id = uuidv4();

    // Use local timezone for created_datetime
    const created_datetime = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });

    const note = { id, content, created_datetime, tags };

    // Generate the filename based on the current date
    const currentDate = new Date();
    const fileName = `${String(currentDate.getDate()).padStart(2, '0')}_${String(currentDate.getMonth() + 1).padStart(2, '0')}_${currentDate.getFullYear()}.md`;

    const filePath = path.join(NOTES_DIR, fileName);

    // Read the existing notes from the file (if any)
    let notesArray = [];
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        console.log("File contents",fileContent)
        notesArray = JSON.parse(fileContent); // Parse existing notes from the file
      } catch (err) {
        console.error(`Error parsing existing file content: ${err.message}`);
        return res.status(500).json({ error: "Failed to read existing notes." });
      }
    }

    // Add the new note to the array
    notesArray.push(note);

    // Write the updated notes array back to the file
    try {
      fs.writeFileSync(filePath, JSON.stringify(notesArray, null, 2));
      res.json(note); // Respond with the new note
    } catch (err) {
      console.error(`Error writing to file: ${err.message}`);
      return res.status(500).json({ error: "Failed to save the note." });
    }
  } catch (err) {
    console.error("Error processing the request:", err.message);
    res.status(500).json({ error: "An unexpected error occurred. Please try again later." });
  }
});



const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
