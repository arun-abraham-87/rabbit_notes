import React, { useState, useRef } from "react";
import Calendar from "react-calendar"; // Install via `npm install react-calendar`
import "react-calendar/dist/Calendar.css";

const AddNoteBar = ({ addNote, searchQuery, objList }) => {
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [text, setText] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [calendarDate, setCalendarDate] = useState(new Date());
  const popupRef = useRef(null);
  const [filteredTags, setFilteredTags] = useState([]);
  const [selectedTagIndex, setSelectedTagIndex] = useState(-1);
  const textareaRef = useRef(null);

  const focusTextareaAtEnd = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
  
      // Set focus to the textarea
      textarea.focus();
  
      // Move the cursor to the end of the text
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    }
  };

  const getCursorCoordinates = (event) => {
    const textarea = event.target;
    const { selectionStart } = textarea;

    const div = document.createElement("div");
    const style = window.getComputedStyle(textarea);

    Array.from(style).forEach((prop) => {
      div.style[prop] = style.getPropertyValue(prop);
    });

    div.style.position = "absolute";
    div.style.visibility = "hidden";
    div.style.whiteSpace = "pre-wrap";
    div.style.wordWrap = "break-word";

    div.textContent = textarea.value.substring(0, selectionStart);
    const span = document.createElement("span");
    span.textContent = "\u200B";
    div.appendChild(span);

    document.body.appendChild(div);
    const { offsetLeft, offsetTop } = textarea;
    const { offsetLeft: spanLeft, offsetTop: spanTop } = span;

    const x = offsetLeft + spanLeft - textarea.scrollLeft;
    const y = offsetTop + spanTop - textarea.scrollTop - 20;

    document.body.removeChild(div);
    return { x, y };
  };

  const handleAdd = () => {
    if (content.trim() === "") return; // Prevent adding an empty note
    addNote(content, tags.split(",").map((tag) => tag.trim()));
    setContent("");
    setTags("");
  };

  const handleChange = (event) => {
    const text = event.target.value;
    setText(text)
    setContent(text);
    searchQuery(text);

    const match = text.match(/(\S+)$/); // Match the last word
    if (match) {
      const filterText = match[1].toLowerCase();
      let filtered = [];

      if (filterText === "cal") {
        const { x, y } = getCursorCoordinates(event);
        setCursorPosition({ x, y });
        setShowCalendar(true);
        setShowPopup(false);
        focusTextareaAtEnd();
      } else if (filterText === "td" || filterText === "today") {
        const today = new Date();
        const formattedDate = `${today
          .getDate()
          .toString()
          .padStart(2, "0")}/${(today.getMonth() + 1)
            .toString()
            .padStart(2, "0")}/${today.getFullYear()}`;
        filtered=[formattedDate];
      } else if (/^t[+-]\d+$/.test(filterText)) {
        const operator = filterText[1];
        const days = parseInt(filterText.slice(2), 10);
        const today = new Date();
        const adjustedDate = new Date();
        if (operator === "+") {
          adjustedDate.setDate(today.getDate() + days);
        } else if (operator === "-") {
          adjustedDate.setDate(today.getDate() - days);
        }
        const formattedDate = `${adjustedDate
          .getDate()
          .toString()
          .padStart(2, "0")}/${(adjustedDate.getMonth() + 1)
            .toString()
            .padStart(2, "0")}/${adjustedDate.getFullYear()}`;
        filtered=[formattedDate];
      } else {
        filtered = objList.filter((tag) =>
          tag.toLowerCase().startsWith(filterText)
        );
      }

      setFilteredTags(filtered);

      if (filtered.length > 0 && filterText !== "cal") {
        const { x, y } = getCursorCoordinates(event);
        setCursorPosition({ x, y });
        setShowPopup(true);
        setShowCalendar(false);
      } else {
        setShowPopup(false);
      }
    } else {
      setShowPopup(false);
      focusTextareaAtEnd();
    }
  };

  const handleDateSelect = (date) => {
    const formattedDate = `${date.getDate().toString().padStart(2, "0")}/${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${date.getFullYear()}`;
    setContent((prev) => prev.replace(/cal$/, formattedDate));
    setShowCalendar(false);
    focusTextareaAtEnd();
  };

  const handleSelectTag = (tag) => {
    const lastSpaceIndex = text.lastIndexOf(" ");
    const updatedText =
      (lastSpaceIndex === -1 ? "" : text.slice(0, lastSpaceIndex + 1)) +
      `${tag} `;
    setText(updatedText);
    setContent(updatedText);
    setShowPopup(false);
    setSelectedTagIndex(-1);
    focusTextareaAtEnd()
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
      }
      else if (e.key === "Escape") {
        setShowPopup(false);
        setShowCalendar(false);
      }      
    }

    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleAdd();
      return;
    }
  };

  return (
    <div className="mb-6">
      <div className="flex mb-6 items-center gap-2">
        <textarea
          ref={textareaRef}
          placeholder="Enter note content..."
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="min-h-32 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ resize: "none" }}
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
                backgroundColor:
                  selectedTagIndex === index ? "#e6f7ff" : "white",
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      )}

      {showCalendar && (
        <div
          className="absolute bg-white border border-gray-300 rounded shadow-md z-10 p-2"
          style={{
            left: cursorPosition.x,
            top: cursorPosition.y,
          }}
        >
          <Calendar value={calendarDate} onChange={handleDateSelect} />
        </div>
      )}
    </div>
  );
};

export default AddNoteBar;
