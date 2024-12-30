import React, { useState, useEffect, useRef } from 'react';

const AddNoteBar = ({ addNote, searchQuery, objList }) => {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const textareaRef = useRef(null); // Create a ref to the textarea

  const [text, setText] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const popupRef = useRef(null);
  const [selectedTagIndex, setSelectedTagIndex] = useState(-1); // Track the focused tag
  const [filteredTags, setFilteredTags] = useState([]); // Filtered tags based on input


  const handleSelectTag = (tag) => {
    // Find the last word (anything after the last space)
    const lastSpaceIndex = text.lastIndexOf(" ");
    const updatedText =
      (lastSpaceIndex === -1 ? "" : text.slice(0, lastSpaceIndex + 1)) + `${tag} `;
    setText(updatedText);
    setContent(updatedText);
    setShowPopup(false);
    setSelectedTagIndex(-1);
  };
  

  const getCursorCoordinates1 = (event) => {
    const { left, top } = event.target.getBoundingClientRect();
    return { x: left + event.target.selectionEnd*6, y: top + 20 };
  };

  const getCursorCoordinates = (event) => {
    const textarea = event.target;
    const { selectionStart } = textarea;
  
    // Create a temporary div to mimic the textarea
    const div = document.createElement("div");
    const style = window.getComputedStyle(textarea);
  
    // Copy textarea styles to the div
    Array.from(style).forEach((prop) => {
      div.style[prop] = style.getPropertyValue(prop);
    });
  
    // Configure the div
    div.style.position = "absolute";
    div.style.visibility = "hidden";
    div.style.whiteSpace = "pre-wrap";
    div.style.wordWrap = "break-word";
  
    // Set content to match the textarea up to the cursor position
    div.textContent = textarea.value.substring(0, selectionStart);
  
    // Add a marker to determine the caret position
    const span = document.createElement("span");
    span.textContent = "\u200B"; // Zero-width space
    div.appendChild(span);
  
    document.body.appendChild(div);
  
    // Calculate coordinates
    const { offsetLeft, offsetTop } = textarea;
    const { offsetLeft: spanLeft, offsetTop: spanTop } = span;
  
    const x = offsetLeft + spanLeft - textarea.scrollLeft;
    const y = offsetTop + spanTop - textarea.scrollTop-20;
  
    // Cleanup
    document.body.removeChild(div);
  
      
    return { x, y };
  };
  

  const handleAdd = () => {
    if (content.trim() === '') return; // Prevent adding an empty note
    addNote(content, tags.split(',').map((tag) => tag.trim()));
    setContent('');
    setTags('');
  };

  const handleKeyDown = (e) => {
    if (showPopup) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedTagIndex((prev) =>
          prev < filteredTags.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedTagIndex((prev) =>
          prev > 0 ? prev - 1 : filteredTags.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedTagIndex >= 0) {
          handleSelectTag(filteredTags[selectedTagIndex]);
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        if (filteredTags.length > 0) {
          handleSelectTag(filteredTags[0]);
        }
      } else if (e.key === "Escape") {
        setShowPopup(false);
        setSelectedTagIndex(-1);
      }
    }
  
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleAdd();
      return;
    }
  };
  

  const handleChange = (event) => {
    const text = event.target.value;
    setContent(text);
    searchQuery(text);
    setText(text);

    const match = text.match(/(\S+)$/); // Match the last word
    if (match) {
      const filterText = match[1].toLowerCase();
      const filtered = objList.filter((tag) =>
        tag.toLowerCase().includes(filterText)
      );
      setFilteredTags(filtered);

      if (filtered.length > 0) {
        const { x, y } = getCursorCoordinates(event);
        setCursorPosition({ x, y });
        setShowPopup(true);
      } else {
        setShowPopup(false);
      }
    } else {
      setShowPopup(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex mb-6 items-center gap-2">
        <textarea
          type="text"
          ref={textareaRef}
          placeholder="Enter note content..."
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="items-center min-h-32 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ resize: 'none' }}
        />
        <button
          className="text-white bg-black rounded-md text-sm px-4 py-2"
          onClick={handleAdd}
        >
          Add Note
        </button>
      </div>

      {showPopup && (
        <div
          id="tagpop"
          ref={popupRef}
          className="absolute bg-white border border-gray-300 rounded shadow-md p-2 z-10 max-h-36 overflow-y-auto no-scrollbar text-sm"
          style={{
            left: cursorPosition.x,
            top: cursorPosition.y,
          }}
        >



          {filteredTags.map((tag, index) => (
            <div
              key={tag}
              onClick={() => handleSelectTag(tag)}
              style={{
                padding: "5px",
                cursor: "pointer",
                backgroundColor: selectedTagIndex === index ? "#e6f7ff" : "white",
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddNoteBar;
