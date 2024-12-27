
  // Function to process the content with links and capitalization
  export const processContent = (content) => {
    if (typeof content !== 'string') {
      return content; // Return content as is if it's not a string
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let isFirstTextSegment = true;

    return content.trim().split(urlRegex).map((part, index) => {
      if (urlRegex.test(part)) {
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
      } else if (isFirstTextSegment && typeof part === 'string') {
        isFirstTextSegment = false;
        return part.charAt(0).toUpperCase() + part.slice(1); // Capitalize first text segment
      }
      return part; // Return subsequent non-URL parts as-is
    });
  };