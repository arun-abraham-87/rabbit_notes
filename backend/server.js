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




const filterNotes = (searchQuery, notes, isCurrentDaySearch) => {
  if (!searchQuery && !isCurrentDaySearch) {
    console.log("Returning notes")
    return notes;
  }
  console.log(`Notes count : ${notes.length}`)
  // Split the search query into parts
  const searchQueryParts = searchQuery.split(' ');
  console.log(searchQueryParts);
  console.log(searchQuery);

  // Get today's date in DD/MM/YYYY format (Australia's format)
  const today = new Date().toLocaleDateString('en-AU');  // This will return the date in 'DD/MM/YYYY' format

  let filteredNotes = notes.filter((note) => {

    if (searchQuery) {
      const matchesSearchQuery = !searchQuery ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearchQuery
    } else {
      // Extract the date portion from created_datetime
      console.log("Date parse")
      const noteDate = note.created_datetime.split(',')[0].trim();  // Get the 'DD/MM/YYYY' part
      // Check if the note is from today
      const isNoteFromToday = noteDate === today;
      return isNoteFromToday;

    }
  });



  return filteredNotes;
};



app.get('/api/notes', (req, res) => {
  try {
    const searchQuery = req.query.search ? req.query.search.toLowerCase() : ''; // Normalize search query for case-insensitive search
    const currentDateNotesOnly = req.query.currentDate ? req.query.currentDate : false; // Normalize search query for case-insensitive search
    console.log(`Current Date Filter : ${currentDateNotesOnly}`)

    const files = fs.readdirSync(NOTES_DIR); // Read files from the directory
    let notesArray = [];

    // Process each file and add valid notes to notesArray
    files.forEach((file) => {
      try {

        if (file === 'objects.md') {
          return;
        }
        
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
    console.log("NOtes fetched")  
    // Filter notes based on the search query
    const filteredNotes = filterNotes(searchQuery, notesArray, currentDateNotesOnly)

    console.log("NOtes filtered") 

    //console.log("Returning Notes", filteredNotes);
    res.json({ notes: filteredNotes, totals: filteredNotes.length }); // Respond with filtered notes and count
  } catch (err) {
    console.error("Error fetching notes:", err.message);
    res.status(500).json({ error: "Failed to fetch notes. Please try again later." }); // Respond with a 500 status for server errors
  }
});

app.put('/api/notes/:id', (req, res) => {
  const noteId = req.params.id;
  const { content } = req.body;
  console.log("Recevied Update Request")
  try {
    const files = fs.readdirSync(NOTES_DIR); // Read all files in the directory
    let noteUpdated = false;
    console.log(files);
    // Process each file and search for the note with the given ID
    files.forEach((file) => {
      const filePath = path.join(NOTES_DIR, file);

      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8'); // Read file content
        let notesInFile = JSON.parse(fileContent); // Parse JSON content

        if (Array.isArray(notesInFile)) {
          console.log("File found")
          // Find the note by its ID
          const noteIndex = notesInFile.findIndex(note => note.id === noteId);

          if (noteIndex !== -1) {
            // Update the note content
            notesInFile[noteIndex].content = content;
            console.log("Note found for update", content)
            noteUpdated = true;

            // Write the updated notes array back to the file
            fs.writeFileSync(filePath, JSON.stringify(notesInFile, null, 2));
          }
        }
      } catch (err) {
        console.error(`Failed to process file: ${file}`, err.message);
      }
    });

    if (noteUpdated) {
      res.json({ message: `Note with ID ${noteId} updated successfully.` });
    } else {
      res.status(404).json({ error: `Note with ID ${noteId} not found.` });
    }

  } catch (err) {
    console.error("Error updating the note:", err.message);
    res.status(500).json({ error: "Failed to update the note. Please try again later." });
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
        console.log("File contents", fileContent)
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

app.delete('/api/notes/:id', (req, res) => {
  const noteId = req.params.id;
  console.log("Received Delete Request for Note ID:", noteId);
  try {
    const files = fs.readdirSync(NOTES_DIR); // Read all files in the directory
    let noteDeleted = false;

    // Process each file and search for the note with the given ID
    files.forEach((file) => {
      const filePath = path.join(NOTES_DIR, file);

      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8'); // Read file content
        let notesInFile = JSON.parse(fileContent); // Parse JSON content

        if (Array.isArray(notesInFile)) {
          console.log("File found");
          // Find the note by its ID
          const noteIndex = notesInFile.findIndex(note => note.id === noteId);

          if (noteIndex !== -1) {
            // Delete the note from the array
            notesInFile.splice(noteIndex, 1);
            console.log("Note deleted", noteId);
            noteDeleted = true;

            // Write the updated notes array back to the file
            fs.writeFileSync(filePath, JSON.stringify(notesInFile, null, 2));
          }
        }
      } catch (err) {
        console.error(`Failed to process file: ${file}`, err.message);
      }
    });

    if (noteDeleted) {
      res.json({ message: `Note with ID ${noteId} deleted successfully.` });
    } else {
      res.status(404).json({ error: `Note with ID ${noteId} not found.` });
    }

  } catch (err) {
    console.error("Error deleting the note:", err.message);
    res.status(500).json({ error: "Failed to delete the note. Please try again later." });
  }
});



// GET: Return the objects as an array
app.get('/api/objects', (req, res) => {
  try {
    const fileName = `objects.md`;

    const filePath = path.join(NOTES_DIR, fileName);

    // Read the existing notes from the file (if any)
    let objectsArray = [];
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        console.log("Object File contents", fileContent)
        objectsArray = JSON.parse(fileContent); // Parse existing notes from the file
      } catch (err) {
        console.error(`Error parsing existing file content: ${err.message}`);
        return res.status(500).json({ error: "Failed to read existing notes." });
      }
    }
    res.json(objectsArray);
  } catch (err) {
    console.error('Error processing the request:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
});

// POST: Add the object to objects.md as JSON
app.post('/api/objects', (req, res) => {
  try {
    const newObject = req.body;
    newObject.id = uuidv4(); // Add a unique UUID to the object

    const fileName = `objects.md`;
    const filePath = path.join(NOTES_DIR, fileName);

    let objects = [];
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        objects = JSON.parse(fileContent); // Parse existing notes from the file
      } catch (err) {
        console.error(`Error parsing existing file content: ${err.message}`);
        return res.status(500).json({ error: "Failed to read existing objects." });
      }
    }


    objects.push(newObject);

    fs.writeFileSync(filePath, JSON.stringify(objects, null, 2));
    res.status(201).json({ message: 'Object added successfully', object: newObject });
  } catch (err) {
    console.error('Error processing the request:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
});

// DELETE: Delete an object by UUID
// app.delete('/api/objects/:id', (req, res) => {
//   try {
//     const id = req.params.id;

//     if (!fs.existsSync(NOTES_FILE)) {
//       return res.status(404).json({ error: 'Objects not found' });
//     }

//     const fileContent = fs.readFileSync(NOTES_FILE, 'utf-8');
//     let objects = JSON.parse(fileContent || '[]');

//     const filteredObjects = objects.filter(obj => obj.id !== id);

//     if (filteredObjects.length === objects.length) {
//       return res.status(404).json({ error: 'Object not found' });
//     }

//     fs.writeFileSync(NOTES_FILE, JSON.stringify(filteredObjects, null, 2));
//     res.json({ message: 'Object deleted successfully' });
//   } catch (err) {
//     console.error('Error processing the request:', err.message);
//     res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
//   }
// });

const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
