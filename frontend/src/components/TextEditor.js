import React, { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import Calendar from "react-calendar"; // Install via `npm install react-calendar`
import "react-calendar/dist/Calendar.css";
import { DevModeInfo } from '../utils/DevUtils';

const TextEditor = ({ addNotes, objList, searchQuery, settings = {} }) => {
    const [notes, setNotes] = useState([""]);
    const [selectedIndices, setSelectedIndices] = useState([]);
    const editorRef = useRef(null);

    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
    const popupRef = useRef(null);
    const [showPopup, setShowPopup] = useState(false);
    const [filteredTags, setFilteredTags] = useState([]);
    const [selectedTagIndex, setSelectedTagIndex] = useState(-1);
    const [focusIndex, setFocusIndex] = useState(-1);
    const throttleRef = useRef(null);

    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarPosition, setCalendarPosition] = useState({ x: 0, y: 0 });
    const [pastedImages, setPastedImages] = useState([]);
    const [uploadStatus, setUploadStatus] = useState({});

    useEffect(() => {
        focusDiv(notes.length - 1, true);
    }, []);

    function getCursorCoordinates() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return { x: 0, y: 0 };

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Add window scroll position to get absolute coordinates
        const x = rect.left + window.scrollX;
        const y = rect.bottom + window.scrollY;

        
        return { x, y };
    }

    const replaceLastWord = (tag) => {
        const lastSpaceIndex = notes[focusIndex].lastIndexOf(" ");
        const updatedText =
            (lastSpaceIndex === -1 ? "" : notes[focusIndex].slice(0, lastSpaceIndex + 1)) +
            `${tag} `;
        const updatedNotes = [...notes];
        updatedNotes[focusIndex] = updatedText;
        setNotes(updatedNotes);
        setShowPopup(false);
        setShowCalendar(false)
        setSelectedTagIndex(-1);
        moveCursorToEndOfText(focusIndex)
    }

    const handleSelectTag = (tag) => {
        replaceLastWord(tag)
    };

    function moveCursorToEndOfText(index) {
        const div = editorRef.current?.children[index];
        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(div);
        range.collapse(false); // Move the cursor to the end
        selection.removeAllRanges();
        selection.addRange(range);
    }

    const focusDiv = (index, moveCursorToEnd = false) => {
        const div = editorRef.current?.children[index];
        if (div) {
            div.focus();
            if (moveCursorToEnd) {
                moveCursorToEndOfText(index);
            }
        }
    };


    const handleKeyUp = (e, index) => {
        // //
    }

    function prefixTabsBasedOnFirstString(firstString, secondString) {
        const tabCount = (firstString.match(/^\t+/) || [""])[0].length;
        const tabs = "\t".repeat(tabCount);
        return tabs + secondString;
    }


    const handleKeyDown = (e, index) => {


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
            }
        } else if (showCalendar) {
            if (e.key === "Escape") {
                setShowCalendar(false);
            }
        }

        else {

            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();

                const unuploaded = pastedImages.filter(img => !img.uploaded);
                const uploadPromises = unuploaded.map(({ id, blob }) => {
                    const formData = new FormData();
                    formData.append("image", blob, `${id}.png`);
                    return fetch("http://localhost:5001/api/images", {
                        method: "POST",
                        body: formData,
                    })
                    .then(res => res.json())
                    .then(data => {
                        const imageUrl = data.url || `http://localhost:5001/images/${data.filename}`;
                        const newNotes = [...notes];
                        newNotes.forEach((line, i) => {
                            if (line.includes(`(${id})`)) {
                                newNotes[i] = line.replace(`(${id})`, `(${imageUrl})`);
                            }
                        });
                        setNotes(newNotes);
                    });
                });

                Promise.all(uploadPromises).then(() => {
                    addNotes(notes.join("\n"), []);
                    setNotes([""]);
                    setPastedImages([]);
                    focusDiv(0, true);
                });

                return;
            }

            if (e.key === "Enter") {
                e.preventDefault();
                const updatedNotes = [...notes];
                let newNote = ""
                if (index != 0) {
                    const previousNote = updatedNotes[index];
                    newNote = previousNote.startsWith("\t\t") ? `• ` : `${newNote}`;
                    newNote = prefixTabsBasedOnFirstString(previousNote, newNote)

                }
                updatedNotes.splice(index + 1, 0, newNote);
                setNotes(updatedNotes);
                setSelectedIndices([]);
                setTimeout(() => focusDiv(index + 1, true), 0);
                return;
            }



            if (e.key === "Tab") {
                e.preventDefault();
                const updatedNotes = [...notes];
                let noteToEdit = updatedNotes[index];

                if (e.shiftKey) {
                    // Remove a leading bullet point if it exists
                    if (noteToEdit.startsWith("\t\t")) {
                        noteToEdit = noteToEdit.substring(2); // Remove the bullet and the following space
                        if (!noteToEdit.startsWith('\t\t') && noteToEdit.startsWith("• ")) {
                            noteToEdit = noteToEdit.substring(2); // Remove the bullet and the following space 
                        }
                    }
                } else {
                    if (noteToEdit.startsWith("\t\t")) {
                        noteToEdit = "\t\t" + noteToEdit; // Add the bullet and a space
                    } else {
                        noteToEdit = "\t\t• " + noteToEdit; // Add the bullet and a space
                    }
                }

                updatedNotes.splice(index, 1, noteToEdit);
                setNotes(updatedNotes);
                setSelectedIndices([]);
                setTimeout(() => focusDiv(index, true), 0);

                return;
            }

            if (e.key === "Backspace" && notes[index] == "" && index > 0) {
                e.preventDefault();
                const updatedNotes = [...notes];
                updatedNotes.splice(index, 1);
                setNotes(updatedNotes);
                setSelectedIndices([]);
                setTimeout(() => focusDiv(index - 1, true), 0);
                return;
            }

            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                const newIndex = e.key === "ArrowUp" ? index - 1 : index + 1;

                if (e.shiftKey) {
                    const newSelection = [...selectedIndices];
                    const lastSelectedIndex = selectedIndices.length > 0 ? selectedIndices[selectedIndices.length - 1] : -1;

                    if (e.key === "ArrowUp") {
                        if (lastSelectedIndex != 0) {
                            if (lastSelectedIndex >= index && lastSelectedIndex != -1) {
                                newSelection.pop()
                            }
                            else {
                                if (lastSelectedIndex == -1) {
                                    newSelection.push(index);
                                }
                                newSelection.push(lastSelectedIndex == -1 ? index - 1 : lastSelectedIndex - 1);
                            }
                        }

                    } else if (e.key === "ArrowDown") {
                        if (lastSelectedIndex != notes.length - 1) {
                            if (lastSelectedIndex <= index && lastSelectedIndex != -1 && lastSelectedIndex != index) {
                                newSelection.pop()
                            } else {
                                if (lastSelectedIndex == -1) {
                                    newSelection.push(index);
                                }
                                newSelection.push(lastSelectedIndex == -1 ? index + 1 : lastSelectedIndex + 1);
                            }
                        }
                    }
                    setSelectedIndices(newSelection);
                } else {
                    setSelectedIndices([]);
                    focusDiv(newIndex);
                }
            }

            if (e.key === "Delete" && selectedIndices.length > 0) {
                e.preventDefault();
                const updatedNotes = notes.filter((_, i) => !selectedIndices.includes(i));
                setNotes(updatedNotes);
                const focusIndex = Math.max(0, Math.min(...selectedIndices) - 1);
                setSelectedIndices([]);
                setTimeout(() => focusDiv(focusIndex, true), 0);
            }

            if (e.key === "Escape") {
                e.preventDefault();
                setSelectedIndices([])
            }
        }
    };



    const handleInputChange = (e, index) => {
        

        const selection = window.getSelection();
        const range = selection.getRangeAt(0);

        // Get the caret position relative to the current node
        const caretOffset = range.startOffset;

        const updatedNotes = [...notes];
        const inputedText = e.currentTarget.innerText;
        updatedNotes[index] = inputedText
        setNotes(updatedNotes);
        

        //Needed to fix issue of popup showing after deleting all text and popup showing up based on last deleted char
        if (inputedText.trim().length === 0) {
            setShowPopup(false);
            setShowCalendar(false);
            return;
        }

        const match = inputedText.trim().match(/(\S+)$/); // Match the last word
        if (match) {
            const filterText = match[1].toLowerCase();
            
            let filtered = [];

            // Throttle logic
            if (filterText !== "") {
                clearTimeout(throttleRef.current); // Clear the existing timeout
                throttleRef.current = setTimeout(() => {
                    
                    if (filterText === "cal") {
                        let { x, y } = getCursorCoordinates();
                        x = x + 5;
                        setCalendarPosition({ x, y });
                        setShowCalendar(true);
                        setShowPopup(false);
                    } else {
                        filtered = objList.filter((tag) =>
                            tag.text.toLowerCase().startsWith(filterText)
                        );
                        

                        setFilteredTags(filtered.map(tag => tag.text));
                    }
                    if (filtered.length > 0) {
                        let { x, y } = getCursorCoordinates();
                        x = x + 5;
                        setCursorPosition({ x, y });
                        setShowPopup(true);
                        
                        
                    } else {
                        setShowPopup(false);
                    }
                }, 150);
            }
        } else {
            setShowPopup(false);
        }


        // Restore the caret position after the state update
        setTimeout(() => {
            const div = editorRef.current?.children[index];
            if (div) {
                const newRange = document.createRange();
                const newSelection = window.getSelection();
                newRange.setStart(div.firstChild || div, caretOffset); // Restore the offset
                newRange.collapse(true);
                newSelection.removeAllRanges();
                newSelection.addRange(newRange);
            }
        }, 0);

    };



    const handlePaste = (e, index) => {
        e.preventDefault();
 
        const items = e.clipboardData.items;
        const updatedNotes = [...notes];
 
        for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
                const blob = item.getAsFile();
                const id = uuidv4();
                const imageUrl = URL.createObjectURL(blob);
 
                updatedNotes[index] += `\n![pasted image](${id})`;
                setNotes(updatedNotes);
 
                setPastedImages(prev => [...prev, { id, blob, url: imageUrl }]);
                return;
            }
        }
 
        const text = e.clipboardData.getData("text/plain");
        const lines = text.split("\n");
        updatedNotes.splice(index, 1, ...lines);
        setNotes(updatedNotes);
        setTimeout(() => focusDiv(index + lines.length - 1, true), 0);
    };
    
    const handleSave = () => {
    const uploadPromises = pastedImages.map(({ id, blob }) => {
        const formData = new FormData();
        formData.append("image", blob, `${id}.png`);
        return fetch("http://localhost:5001/api/images", {
            method: "POST",
            body: formData,
        })
        .then(res => res.json())
        .then(data => {
            const imageUrl = data.url || `http://localhost:5001/images/${data.filename}`;
            const newNotes = [...notes];
            newNotes.forEach((line, i) => {
                if (line.includes(`(${id})`)) {
                    newNotes[i] = line.replace(`(${id})`, `(${imageUrl})`);
                }
            });
            setNotes(newNotes);
        });
    });

        Promise.all(uploadPromises).then(() => {
            addNotes(notes.join("\n"), []);
            setNotes([""]);
            setPastedImages([]);
            focusDiv(0, true);
        });
    };

    // Debug logging for developer mode
    
    
    return (
        <DevModeInfo 
          componentName="TextEditor" 
          isDevMode={settings?.developerMode || false}
        >
          <div
          ref={editorRef}
              className="w-full mx-auto p-6 border border-gray-200 rounded-xl bg-white shadow-md"
          >
            {notes.map((note, index) => (
                <div key={index} className="relative group">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className={`editable-div px-4 py-2 mb-3 whitespace-pre-wrap rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${selectedIndices.includes(index) ? "bg-blue-50 border-blue-300" : "bg-gray-50 border-gray-200"} ${index === 0 && notes[0].startsWith('###') ? 'text-2xl font-bold' : ''}`}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onKeyUp={(e) => handleKeyUp(e, index)}
                    onInput={(e) => handleInputChange(e, index)}
                    onPaste={(e) => handlePaste(e, index)}
                    onFocus={() => setFocusIndex(index)}
                    tabIndex={0}
                    data-placeholder="Type your text here..."
                  >
                    {note}
                  </div>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title="Convert to Sentence case"
                      className="text-xs text-gray-500 hover:text-blue-600"
                      onClick={() => {
                        const updated = [...notes];
                        updated[index] = updated[index].charAt(0).toUpperCase() + updated[index].slice(1).toLowerCase();
                        setNotes(updated);
                      }}
                    >
                      Aa
                    </button>
                    <button
                      title="Make H1"
                      className="text-xs text-gray-500 hover:text-purple-600"
                      onClick={() => {
                        const content = notes[index];
                        const updated = [...notes];
                        updated.splice(index, 1);
                        updated.unshift(`###${content}###`);
                        setNotes(updated);
                        setTimeout(() => focusDiv(0, true), 0);
                      }}
                    >
                      H1
                    </button>
                  </div>
                </div>
            ))}

            {showPopup && (
                <div
                    id="tagpop"
                    ref={popupRef}
                    className="absolute bg-white border-2 border-purple-500 rounded-lg shadow-lg p-2 z-50 max-h-40 overflow-y-auto no-scrollbar text-sm w-52"
                    style={{
                        left: cursorPosition.x,
                        top: cursorPosition.y,
                        minHeight: '40px'
                    }}
                >
                    {filteredTags.length === 0 ? (
                        <div className="p-2 text-gray-500">No matching tags</div>
                    ) : (
                        filteredTags.map((tag, index) => (
                            <div
                                key={tag}
                                onClick={() => handleSelectTag(tag)}
                                className={`p-2 cursor-pointer hover:bg-purple-100 ${
                                    selectedTagIndex === index ? "bg-purple-200" : ""
                                }`}
                            >
                                {tag}
                            </div>
                        ))
                    )}
                </div>
            )}

            {showCalendar && (
                <div
                    className="absolute z-50 rounded-lg shadow-lg border bg-white"
                    style={{
                        left: calendarPosition.x,
                        top: calendarPosition.y,
                    }}
                >
                    <Calendar
                        onChange={(date) => {
                            const formattedDate = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")
                                }/${date.getFullYear()}`;
                            replaceLastWord(formattedDate)
                            moveCursorToEndOfText(focusIndex)
                        }}
                    />
                </div>
            )}
            {pastedImages.map(({ id, url }) => (
                <div key={id} className="mt-2 flex items-center gap-2">
                    <img src={url} alt="Uploaded" className="w-16 h-16 object-cover rounded border" />
                    {uploadStatus[id] !== "done" ? (
                        <div className="w-full bg-gray-200 rounded h-2">
                            <div
                                className="bg-purple-500 h-2 rounded"
                                style={{ width: `${uploadStatus[id] || 0}%` }}
                            ></div>
                        </div>
                    ) : (
                        <span className="text-xs text-green-600">Upload complete</span>
                    )}
                </div>
            ))}
            {notes.some(note => note.trim() === "") && (
              <div className="mt-2">
                <button
                  onClick={() => {
                    const cleanedNotes = notes.filter(note => note.trim() !== "");
                    setNotes(cleanedNotes);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Remove Blank Spaces
                </button>
              </div>
            )}
            <div className="mt-4 flex justify-between items-center">
              {/* Left section */}
              <div className="flex items-center gap-4">
                <span
                  className="text-purple-600 underline cursor-pointer hover:text-purple-800 text-sm"
                  onClick={async () => {
                    const clipboardText = await navigator.clipboard.readText();
                    const updatedNotes = [...notes];
                    updatedNotes.splice(1, 0, clipboardText);
                    setNotes(updatedNotes);
                    setTimeout(() => focusDiv(1, true), 0);
                  }}
                >
                  Paste from Clipboard
                </span>
                {notes.some(note => note.trim() === "") && (
                  <button
                    onClick={() => {
                      const cleanedNotes = notes.filter(note => note.trim() !== "");
                      setNotes(cleanedNotes);
                    }}
                    className="text-red-600 text-sm underline hover:text-red-800"
                  >
                    Remove Blank Spaces
                  </button>
                )}
              </div>
            
              {/* Right section */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setNotes([""]);
                    setPastedImages([]);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 text-sm"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                  onClick={handleSave}
                >
                  Save Notes
                </button>
              </div>
            </div>
        </div>
        </DevModeInfo>
    );
};

export default TextEditor;
