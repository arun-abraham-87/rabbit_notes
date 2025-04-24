const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const settingsRouter = require('./routes/settings');

const app = express();
app.use(express.json());

const moment = require('moment'); // Assuming moment is available
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000', // Allow requests only from this origin
}));

// Mount settings router
app.use('/api/settings', settingsRouter);

const NOTES_DIR = './notes';
if (!fs.existsSync(NOTES_DIR)) fs.mkdirSync(NOTES_DIR);

const filterNotes = (searchQuery, notes, isCurrentDaySearch, noteDateStr) => {
  try {
    if (!Array.isArray(notes)) {
      throw new Error("'notes' must be an array.");
    }

    // If no search query and current day search is not required, return all notes
    if (!searchQuery && !isCurrentDaySearch) {
      return notes;
    }

    // Split the search query into parts (words) and normalize to lowercase
    let searchQueryParts = [];
    let useOrLogic = false;
    if (searchQuery) {
      if (searchQuery.includes('||')) {
        searchQueryParts = searchQuery
          .split('||')
          .map((part) => part.trim().toLowerCase())
          .filter((part) => part && part !== '||');
        useOrLogic = true;
      } else {
        searchQueryParts = searchQuery
          .split(/\s+/)  // Split on any whitespace
          .map((part) => part.replace(/^\s+|\s+$/g, '').toLowerCase())
          .filter((part) => part !== '');
      }
    }

    // Get today's date in 'DD/MM/YYYY' format
    const today = new Date();
    const noteDate = moment(today).format('DD/MM/YYYY');
    console.log(`Filtering for date: ${noteDate}`);

    // Filter notes
    return notes.filter((note) => {
      if (!note || typeof note !== 'object') {
        console.warn("Invalid note encountered:", note);
        return false;
      }

      const noteContent = (note.content || "").toLowerCase();
      const noteTags = Array.isArray(note.tags)
        ? note.tags.map((tag) => (tag || "").toLowerCase())
        : [];

      // Check if all words in the search query are present, or use OR logic if specified
      const matchesSearchQuery = useOrLogic
        ? searchQueryParts.some((part) => noteContent.includes(part) || noteTags.some((tag) => tag.includes(part)))
        : searchQueryParts.every((part) => noteContent.includes(part) || noteTags.some((tag) => tag.includes(part)));

      // Check if the note is from today (if required)
      if (isCurrentDaySearch) {
        const noteRecordedDate = (note.created_datetime || "").split(',')[0].trim();
        console.log(`Note date: ${noteRecordedDate}, Today: ${noteDate}`);
        const isNoteFromToday = noteRecordedDate === noteDate;
        return !searchQuery || (matchesSearchQuery && isNoteFromToday);
      }

      return matchesSearchQuery;
    });
  } catch (error) {
    console.error("An error occurred in filterNotes:", error);
    return []; // Return an empty array as a fallback
  }
};

function parseDate(dateString) {
  try {
    if (!dateString || typeof dateString !== 'string' || !dateString.includes(',')) {
      return new Date(0); // fallback to ensure valid Date object
    }

    const [datePart, timePart] = dateString.split(", ");
    const [day, month, year] = datePart.split("/");
    const [time, period] = timePart.split(" ");

    let [hours, minutes, seconds] = time.split(":").map(Number);
    if (period === "pm" && hours !== 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;

    const formattedDate = `${year}-${month}-${day}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return new Date(formattedDate);
  } catch (err) {
    console.error("Error in parseDate:", err.message);
    return new Date(0);
  }
}

const sortNotes = (notes) => {
  try {
    return [...notes].sort((a, b) => {
      // console.log("-----------------------------------------")
      // console.log(a.created_datetime)
      // console.log(a)
      // console.log(b)
      // console.log(b.created_datetime)
      const dateA = parseDate(a?.created_datetime);
      const dateB = parseDate(b?.created_datetime);
      //console.log(`Trying to sort ${dateA} and ${dateB}`)
      //console.log(dateA - dateB)
      return dateB - dateA; // Sort by date descending
    });
  } catch (error) {
    console.error("An error occurred in sort notes:", error);
  }
};

app.get('/api/notes', (req, res) => {
  try {
    
    const searchQuery = req.query.search.trim() ? req.query.search. trim().toLowerCase() : '';
    console.log(`Search quwery recevied:==${searchQuery}==`)
    const currentDateNotesOnly = req.query.currentDate === 'true'; // Check for current date filter
    console.log(`Current Date Filter: ${currentDateNotesOnly}`);
    const noteDate = req.query.noteDate; // Check for current date filter
    console.log(`NoteDate: ${noteDate}`);

    const files = fs.readdirSync(NOTES_DIR);
    let notesArray = [];

    files.forEach((file) => {
      try {
        if (file === 'objects.md') return;

        const filePath = path.join(NOTES_DIR, file);
        if (fs.lstatSync(filePath).isDirectory()) return; // Skip directories
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const notesInFile = JSON.parse(fileContent);

        if (Array.isArray(notesInFile)) {
          notesArray = notesArray.concat(notesInFile);
        } else {
          console.error(`File ${file} does not contain a valid notes array.`);
        }
      } catch (err) {
        console.error(`Failed to process file: ${file}`, err.message);
      }
    });

    //console.log("Notes fetched");

    const filteredNotes = filterNotes(searchQuery, notesArray, currentDateNotesOnly, noteDate);

    //console.log("Notes filtered");

    const sortedNotes = sortNotes(filteredNotes)

    //console.log(`Notes filtered & sorted ${sortedNotes}`);

    //console.log(filteredNotes[0])
    //console.log(sortedNotes[0])

    res.json({ notes: sortedNotes, totals: sortedNotes.length });
  } catch (err) {
    console.error("Error fetching notes:", err.message);
    res.status(500).json({ error: "Failed to fetch notes. Please try again later." });
  }
});

app.get('/api/images/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(IMAGES_DIR, filename);

  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: 'Image not found.' });
  }

  res.sendFile(path.resolve(imagePath));
});

app.get('/api/todos', (req, res) => {
  try {
    const files = fs.readdirSync(NOTES_DIR);
    let todos = [];

    files.forEach((file) => {
      try {
        // Skip processing objects.md as it is not a note file
        if (file === 'objects.md') return;

        const filePath = path.join(NOTES_DIR, file);
        if (fs.lstatSync(filePath).isDirectory()) return; // Skip directories
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const notesInFile = JSON.parse(fileContent);

        if (Array.isArray(notesInFile)) {
          const todosInFile = notesInFile
            .filter(note => note.content && note.content.toLowerCase().includes('todo'));
          todos = todos.concat(todosInFile);
        }

      } catch (err) {
        console.error(`Failed to process file: ${file}`, err.message);
      }
    });
   console.log(todos)
    todos.sort((a, b) => {
      const dateA = new Date(a.created_datetime);
      const dateB = new Date(b.created_datetime);
      return dateA - dateB;
    });
    res.json({ todos });
  } catch (err) {
    console.error("Error fetching todos:", err.message);
    res.status(500).json({ error: "Failed to fetch todos. Please try again later." });
  }
});

app.put('/api/notes/:id', (req, res) => {
  const noteId = req.params.id;
  const { content } = req.body;
  //console.log("Recevied Update Request")
  try {
    const files = fs.readdirSync(NOTES_DIR); // Read all files in the directory
    let noteUpdated = false;
    //console.log(files);
    // Process each file and search for the note with the given ID
    files.forEach((file) => {
      const filePath = path.join(NOTES_DIR, file);
      if (fs.lstatSync(filePath).isDirectory()) return; // Skip directories

      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8'); // Read file content
        let notesInFile = JSON.parse(fileContent); // Parse JSON content

        if (Array.isArray(notesInFile)) {
          //console.log("File found")
          // Find the note by its ID
          const noteIndex = notesInFile.findIndex(note => note.id === noteId);

          if (noteIndex !== -1) {
            // Update the note content
            notesInFile[noteIndex].content = content;
            //console.log("Note found for update", content)
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

function createFilename(created_datetime) {
  console.log(created_datetime)
  const dateParts = created_datetime.split(",")[0].split("/"); // Extract date in dd/mm/yyyy format
  const [day, month, year] = dateParts;

  // Format the filename
  const fileName = `${String(day).padStart(2, '0')}_${String(month).padStart(2, '0')}_${year}.md`;

  return fileName;
}

app.post('/api/notes', (req, res) => {
  try {
    const { content, tags, noteDate } = req.body;
    const id = uuidv4();

    // Define the timezone as a constant
    const TIMEZONE = 'Australia/Sydney';

    // Get today's date in the specified timezone
    const todayInTimezone = new Date().toLocaleDateString('en-AU', {
      timeZone: TIMEZONE,
    }).split('/'); // Split into [day, month, year]

    const formattedToday = `${todayInTimezone[2]}-${todayInTimezone[1].padStart(2, '0')}-${todayInTimezone[0].padStart(2, '0')}`;

    let created_datetime;
    console.log("=============================");
    console.log(noteDate)
    console.log(formattedToday)

    if (noteDate === formattedToday) {
      // Use the current timestamp in the specified timezone
      created_datetime = new Date().toLocaleString('en-AU', {
        timeZone: TIMEZONE,
      });
    } else {
      // Use 12 AM on the given `noteDate`
      // Construct a moment object using the provided date
      const noteDateObj = moment(noteDate, "YYYY-MM-DD");
      // Format it to the desired format: "dd/MM/yyyy, hh:mm:ss am/pm"
      created_datetime = noteDateObj.format("DD/MM/YYYY, hh:mm:ss a");
    }
    console.log("Date");
    console.log(created_datetime);
    console.log("=============================");

    const note = { id, content, created_datetime, tags };

    // Generate the filename based on the current date
    const fileName = createFilename(note.created_datetime);

    const filePath = path.join(NOTES_DIR, fileName);

    console.log(filePath)

    // Read the existing notes from the file (if any)
    let notesArray = [];
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        notesArray = JSON.parse(fileContent); // Parse existing notes from the file
      } catch (err) {
        console.error(`Error parsing existing file content: ${err.message}`);
        return res.status(500).json({ error: 'Failed to read existing notes.' });
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
      return res.status(500).json({ error: 'Failed to save the note.' });
    }
  } catch (err) {
    console.error('Error processing the request:', err.message);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
});

app.delete('/api/notes/:id', (req, res) => {
  const noteId = req.params.id;
  //console.log("Received Delete Request for Note ID:", noteId);
  try {
    const files = fs.readdirSync(NOTES_DIR); // Read all files in the directory
    let noteDeleted = false;

    // Process each file and search for the note with the given ID
    files.forEach((file) => {
      const filePath = path.join(NOTES_DIR, file);
      if (fs.lstatSync(filePath).isDirectory()) return; // Skip directories

      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8'); // Read file content
        let notesInFile = JSON.parse(fileContent); // Parse JSON content

        if (Array.isArray(notesInFile)) {
          //console.log("File found");
          // Find the note by its ID
          const noteIndex = notesInFile.findIndex(note => note.id === noteId);

          if (noteIndex !== -1) {
            // Delete the note from the array
            notesInFile.splice(noteIndex, 1);
            //console.log("Note deleted", noteId);
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

app.get('/api/objects', (req, res) => {
  try {
    const fileName = `objects.md`;

    const filePath = path.join(NOTES_DIR, fileName);

    // Read the existing notes from the file (if any)
    let objectsArray = [];
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        //console.log("Object File contents", fileContent)
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

const multer = require('multer');

// Create images directory if it doesn't exist
const IMAGES_DIR = path.join(NOTES_DIR, 'images');
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR);

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const desiredName = path.parse(file.originalname).name;
    cb(null, `${desiredName}${ext}`);
  }
});
const upload = multer({ storage });

app.post('/api/images', upload.single('image'), (req, res) => {
  console.log("IMage Uplaod api called ")
  if (!req.file) {
    console.log("IMage File not found")
    return res.status(400).json({ error: 'No image uploaded.' });
  }
  console.log(`Image upload started: ${req.file.originalname}`);
  res.status(200).json({ message: 'Image uploaded successfully.', filename: req.file.filename });
});

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, '0.0.0.0', (err) => {
  if (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('Available routes:');
  console.log('- GET /api/settings');
  console.log('- POST /api/settings');
  console.log('- GET /api/settings/test');
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try a different port or kill the process using this port.`);
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
