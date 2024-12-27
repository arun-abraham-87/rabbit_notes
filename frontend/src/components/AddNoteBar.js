import React, { useState,useEffect, useRef  } from 'react';

const AddNoteBar = ({ addNote }) => {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const textareaRef = useRef(null); // Create a ref to the textarea

  const handleAdd = () => {
    if (content.trim() === '') return; // Prevent adding an empty note
    addNote(content, tags.split(',').map((tag) => tag.trim()));
    setContent('');
    setTags('');
  };

  useEffect(() => {
    const textarea = textareaRef.current; // Access the textarea through the ref
    if (textarea) {
      // Reset the height to auto to allow recalculation
      textarea.style.height = 'auto';
      
      // Get the line height of the text area to estimate the number of lines
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight, 10);
      
      // Add the scrollHeight and 10 extra lines
      textarea.style.height = `${textarea.scrollHeight + (lineHeight * 3)}px`;
    }
  }, [content]);


  const getCurrentLine = (textarea) => {
    // Get the position of the cursor
    const cursorPosition = textarea.selectionStart;
    
    // Get the text content from the textarea
    const content = textarea.value;
    
    // Split the content up to the cursor position into lines
    const linesBeforeCursor = content.substring(0, cursorPosition).split("\n");
  
    // The cursor's line is the length of the lines before it
    return linesBeforeCursor.length; // 1-based line index
  };

  const handleKeyDown = (e) => {
    // Detect Cmd (or Ctrl) + Enter for submission
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleAdd();
      return;
    }
  

    // Handle Enter key to insert a new line with bullet indentation
    if (e.key === "Enter") {
      e.preventDefault();
  
      // Get the current cursor position
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
  
      // Check if the current line starts with a bullet point
      const lines = content.split("\n");
      const currentLine = lines[textarea.value.substring(0, start).split("\n").length - 1];
  
      if (currentLine.trim().startsWith("•")) {
        // If the line is a bullet, create a new bullet point with the same indentation
        const newText =
          content.substring(0, start) + "\n\t• " + content.substring(end);
  
        setContent(newText);
  
        // Move the cursor position after the bullet point
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 3; // Adjust for '\n\t•'
        }, 0);
      } else {
        // Handle other cases if needed (like normal text entry)
        const newText = content.substring(0, start) + "\n" + content.substring(end);
        setContent(newText);
      }
    }
  };
  
  
  


  return (
    <div className="mb-6">
      <div className='flex mb-6 items-center gap-2'  >
        <textarea
          type="text"
          ref={textareaRef}
          placeholder="Enter note content..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown} // Trigger handleAdd when Enter is pressed
          className='items-center min-h-32 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
          style={{ resize: 'none' }} 
        />
        <button
          className='items-center text-white bg-black inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2'
          onClick={handleAdd}
        >
          Add Note
        </button>
      </div>
    </div>
  );
};

export default AddNoteBar;
