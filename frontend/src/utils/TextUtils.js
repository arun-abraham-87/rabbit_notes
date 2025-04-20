// Function to process the content with links, capitalization, and search query highlighting
export const processContent = (content, searchQuery) => {
  if (typeof content !== 'string') {
    return content; // Return content as is if it's not a string
  }

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const searchTerms = searchQuery ? searchQuery.split(' ') : [];
  let isFirstTextSegment = true;

  return content.trim().split(urlRegex).map((part, index) => {
    if (urlRegex.test(part)) {
      // If the part is a URL
      try {
        const url = new URL(part);
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            {url.hostname}
          </a>
        );
      } catch {
        return part; // If URL parsing fails, return the original part
      }
    } else {
      // If the part is text
      let processedText = part;

      if (isFirstTextSegment && typeof part === 'string') {
        // Capitalize the first text segment
        processedText = part.charAt(0).toUpperCase() + part.slice(1);
        isFirstTextSegment = false;
      }

      // Highlight matching search terms
      if (searchTerms.length > 0) {
        const regex = new RegExp(`(${searchTerms.join('|')})`, 'gi');
        processedText = processedText.replace(regex, (match) => 
          `<span class="bg-yellow-300">${match}</span>`
        );
      }

      // Return the processed text as React elements
      return (
        <span
          key={index}
          dangerouslySetInnerHTML={{ __html: processedText }}
        ></span>
      );
    }
  });
};


export const parseFormattedContent = (lines) => {
  return lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('###') && trimmed.endsWith('###')) {
      return `<h1>${trimmed.slice(3, -3)}</h1>`;
    } else if (trimmed.startsWith('##') && trimmed.endsWith('##')) {
      return `<h2>${trimmed.slice(2, -2)}</h2>`;
    } else {
      return line;
    }
  });
};
