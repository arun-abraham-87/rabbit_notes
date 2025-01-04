import React, { useState, useRef, useEffect } from "react";
import Calendar from "react-calendar"; // Install via `npm install react-calendar`
import "react-calendar/dist/Calendar.css";

const TextEditor = ({ addNotes, objList, searchQuery }) => {
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

    useEffect(() => {
        focusDiv(notes.length - 1, true);
    }, []);

    function getCursorCoordinates() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return { x: 0, y: 0 };

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const x = rect.left;
        const y = rect.top;

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
        // ////console.log(e.key)
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
                addNotes(notes.join("\n"), []);
                setNotes([""])
                focusDiv(0, true)
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
                setAnchorIndex(null);
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
                setAnchorIndex(null);
                setTimeout(() => focusDiv(index, true), 0);

                return;
            }

            if (e.key === "Backspace" && notes[index] == "" && index > 0) {
                e.preventDefault();
                const updatedNotes = [...notes];
                updatedNotes.splice(index, 1);
                setNotes(updatedNotes);
                setSelectedIndices([]);
                setAnchorIndex(null);
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
                    setAnchorIndex(null);
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
                setAnchorIndex(null);
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
        console.log(`INputed text set as searhcquwery: ${inputedText}`)
        searchQuery(!inputedText ? "" : inputedText);

        //Needed to fix issue of popup showing after deleting all text and popup showing up based on last deleted char
        if (inputedText.trim().length === 0) {
            setShowPopup(false);
            setShowCalendar(false);
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
                            tag.toLowerCase().startsWith(filterText)
                        );


                        setFilteredTags(filtered);
                        //console.log(`objlit: ${objList}`)
                        //console.log(`FilteredTags: ${filteredTags}`)
                    }
                    if (filtered.length > 0) {
                        let { x, y } = getCursorCoordinates();
                        x = x + 5;
                        setCursorPosition({ x, y });
                        setShowPopup(true);
                    } else {
                        setShowPopup(false);
                    }

                }, 300); // 300ms delay for throttling
            }
        } else {
            setShowPopup(false);
            //focusTextareaAtEnd();
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
        const text = e.clipboardData.getData("text/plain");
        const lines = text.split("\n");
        const updatedNotes = [...notes];
        updatedNotes.splice(index, 1, ...lines);
        setNotes(updatedNotes);
        setTimeout(() => focusDiv(index + lines.length - 1, true), 0);
    };

    return (
        <div
            ref={editorRef}
            className="w-full mx-auto p-4 border rounded-lg bg-gray-50"
        >
            {notes.map((note, index) => (
                <div
                    key={index}
                    contentEditable
                    suppressContentEditableWarning
                    className={`editable-div p-1 whitespace-pre-wrap ${selectedIndices.includes(index) ? "bg-blue-100" : ""
                        }`}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onKeyUp={(e) => handleKeyUp(e, index)}
                    onInput={(e) => handleInputChange(e, index)}
                    onPaste={(e) => handlePaste(e, index)}
                    onFocus={() => setFocusIndex(index)} // Add this line to handle focus
                    tabIndex={0}
                    data-placeholder="Type your text here..."
                >
                    {note}
                </div>
            ))}

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
                    className="absolute z-50"
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
        </div>
    );
};

export default TextEditor;
