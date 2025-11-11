import React from 'react';

/**
 * Comprehensive function to parse and format note content
 * @param {Object} params
 * @param {string} params.content - The note content
 * @param {string} params.searchTerm - Search term for highlighting
 * @returns {Array<React.ReactElement>} Array of formatted React elements
 */
export const parseNoteContent = ({ content, searchTerm, onAddText, onEditText, allNotes = [], onNavigateToNote = null }) => {
  
  if (!content) return [];

  // First, detect code blocks marked with triple backticks (```)
  const allLines = content.split('\n');
  const codeBlockRanges = [];
  const singleLineCodeBlocks = new Set(); // Track single-line code blocks
  let inCodeBlock = false;
  let codeBlockStart = -1;
  let codeBlockStartLine = null; // Track if opening backticks are on same line as content
  
  allLines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Check for single-line code block: ```text``` (with optional whitespace)
    const singleLineMatch = trimmed.match(/^```\s*(.+?)\s*```$/);
    if (singleLineMatch) {
      singleLineCodeBlocks.add(index);
      return; // Skip this line for multi-line code block detection
    }
    
    // Check if line starts with ``` (opening delimiter with content on same line)
    const startsWithBackticks = trimmed.match(/^```\s*(.+)$/);
    // Check if line ends with ``` (closing delimiter with content on same line)
    const endsWithBackticks = trimmed.match(/^(.+?)\s*```$/);
    // Check for standalone ``` delimiter
    const isStandaloneDelimiter = trimmed === '```';
    
    if (!inCodeBlock) {
      // Not in a code block yet
      if (startsWithBackticks) {
        // Opening backticks on same line as content
        codeBlockStart = index;
        codeBlockStartLine = startsWithBackticks[1]; // Store the content after ```
        inCodeBlock = true;
      } else if (isStandaloneDelimiter) {
        // Standalone opening delimiter
        codeBlockStart = index;
        codeBlockStartLine = null;
        inCodeBlock = true;
      }
    } else {
      // Already in a code block
      if (endsWithBackticks) {
        // Closing backticks on same line as content
        if (codeBlockStart !== -1) {
          codeBlockRanges.push({ 
            start: codeBlockStart, 
            end: index,
            startLine: codeBlockStartLine,
            endLine: endsWithBackticks[1]
          });
        }
        codeBlockStart = -1;
        codeBlockStartLine = null;
        inCodeBlock = false;
      } else if (isStandaloneDelimiter) {
        // Standalone closing delimiter
        if (codeBlockStart !== -1) {
          codeBlockRanges.push({ 
            start: codeBlockStart, 
            end: index,
            startLine: codeBlockStartLine,
            endLine: null
          });
        }
        codeBlockStart = -1;
        codeBlockStartLine = null;
        inCodeBlock = false;
      }
    }
  });
  
  // Helper function to check if a line index is inside a code block
  const isInCodeBlock = (lineIndex) => {
    return codeBlockRanges.some(range => 
      (lineIndex > range.start && lineIndex < range.end) ||
      (lineIndex === range.start && range.startLine !== null) ||
      (lineIndex === range.end && range.endLine !== null)
    );
  };
  
  // Helper function to check if a line is a code block delimiter
  const isCodeBlockDelimiter = (lineIndex) => {
    return codeBlockRanges.some(range => lineIndex === range.start || lineIndex === range.end);
  };
  
  // Helper function to check if a line is a single-line code block
  const isSingleLineCodeBlock = (lineIndex) => {
    return singleLineCodeBlocks.has(lineIndex);
  };

  // Split into lines and process each line
  // Map first to preserve original index, then filter
  const lines = allLines
    .map((line, originalIndex) => {
      
      // First extract any color value wrapped in @$%^ markers
      const colorMatch = line.match(/@\$%\^([^@]+)@\$%\^/);
      const color = colorMatch ? colorMatch[1] : null;

      // Remove the color markers and get clean text
      const cleanLine = line.replace(/@\$%\^[^@]+@\$%\^/, '');
      
      // Track the original index to check code blocks
      return { line: cleanLine, color, originalIndex };
    })
    .filter(({ line }) => !line.trim().startsWith('meta::'));

  // Process lines
  const processedElements = [];
  
  lines.forEach(({ line, color, originalIndex }, lineIndex) => {
    // Check if this line is a code block delimiter (```)
    const trimmed = line.trim();
    const isCodeDelimiter = trimmed === '```';
    
    // Check if this line is inside a code block
    const isCodeBlockLine = isInCodeBlock(originalIndex);
    
    // Check if this is a single-line code block
    const isSingleLineCode = isSingleLineCodeBlock(originalIndex);
    
    // Find the code block range this line belongs to (if any)
    const codeBlockRange = codeBlockRanges.find(range => 
      originalIndex > range.start && originalIndex < range.end ||
      originalIndex === range.start || originalIndex === range.end
    );
    
    // Check if this is an h2 header
    const isH2 = trimmed.startsWith('##') && !trimmed.startsWith('###') && trimmed.endsWith('##');
    
    // Step 1: Parse inline formatting (skip for code blocks and delimiters)
    let formattedContent;
    let codeBlockContent = null;
    
    if (isCodeDelimiter && !codeBlockRange) {
      // Standalone delimiter that's not part of a range (shouldn't happen, but handle it)
      return;
    } else if (isSingleLineCode) {
      // Extract content from single-line code block: ```text``` (with optional whitespace)
      const match = trimmed.match(/^```\s*(.+?)\s*```$/);
      if (match) {
        codeBlockContent = match[1].trim();
        formattedContent = [codeBlockContent];
      } else {
        formattedContent = [line];
      }
    } else if (codeBlockRange) {
      // This line is part of a code block
      if (originalIndex === codeBlockRange.start && codeBlockRange.startLine) {
        // First line with opening backticks and content
        formattedContent = [codeBlockRange.startLine];
      } else if (originalIndex === codeBlockRange.end && codeBlockRange.endLine) {
        // Last line with content and closing backticks
        formattedContent = [codeBlockRange.endLine];
      } else if (originalIndex === codeBlockRange.start || originalIndex === codeBlockRange.end) {
        // Standalone delimiter line, don't render
        return;
      } else {
        // Middle line of code block
        formattedContent = [line];
      }
    } else if (isCodeBlockLine) {
      // For code block lines, render as plain text (no formatting)
      formattedContent = [line];
    } else {
      formattedContent = parseInlineFormatting({
        content: line,
        searchTerm,
        lineIndex,
        onAddText,
        onEditText,
        noteContent: content,
        allNotes,
        onNavigateToNote
      });
    }

    // Step 2: Check if this is a heading or code block by looking at the original line
    let type = 'normal';
    if (codeBlockRange || isCodeBlockLine || isSingleLineCode) {
      type = 'codeblock';
    } else if (trimmed.startsWith('###') && trimmed.endsWith('###')) {
      type = 'heading1';
    } else if (isH2) {
      type = 'heading2';
    } else if (trimmed.startsWith('- ')) {
      type = 'bullet';
    }

    // Step 3: Determine if this is the first or last line of a code block
    let isCodeBlockStart = false;
    let isCodeBlockEnd = false;
    
    if (codeBlockRange) {
      // Check if this is the first line of the code block
      if (originalIndex === codeBlockRange.start) {
        isCodeBlockStart = true;
      }
      // Check if this is the last line of the code block
      if (originalIndex === codeBlockRange.end) {
        isCodeBlockEnd = true;
      }
    } else if (isCodeBlockLine) {
      // For old-style code blocks (without range tracking)
      isCodeBlockStart = codeBlockRanges.some(r => originalIndex === r.start + 1);
      isCodeBlockEnd = codeBlockRanges.some(r => originalIndex === r.end - 1);
    }
    
    // Step 4: Wrap in appropriate container based on line type
    let element = wrapInContainer({
      content: formattedContent,
      type,
      lineIndex,
      isCodeBlockStart: isCodeBlockStart || isSingleLineCode,
      isCodeBlockEnd: isCodeBlockEnd || isSingleLineCode,
      isSingleLineCodeBlock: isSingleLineCode
    });

    // Step 4: If we have a color value, wrap the final element in a colored span
    if (color) {
      element = React.cloneElement(element, {
        style: { color }
      });
    }

    processedElements.push(element);
  });

  return processedElements;
};

/**
 * Detect the type of link and return an appropriate indicator
 * @param {string} url - The URL to analyze
 * @returns {string} - The indicator text for the link type
 */
const getLinkTypeIndicator = (url) => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    // Instagram
    if (hostname.includes('instagram.com')) {
      return '[Instagram]';
    }
    
    // Google services
    if (hostname.includes('docs.google.com')) {
      if (pathname.includes('/document/')) {
        return '[Google Docs]';
      } else if (pathname.includes('/spreadsheets/')) {
        return '[Google Sheets]';
      } else if (pathname.includes('/presentation/')) {
        return '[Google Slides]';
      } else if (pathname.includes('/forms/')) {
        return '[Google Forms]';
      }
    }
    
    // Gmail
    if (hostname.includes('mail.google.com') || hostname.includes('gmail.com')) {
      return '[Gmail]';
    }
    
    // Slack
    if (hostname.includes('slack.com')) {
      return '[Slack]';
    }
    
    // Discord
    if (hostname.includes('discord.com') || hostname.includes('discord.gg')) {
      return '[Discord]';
    }
    
    // GitHub
    if (hostname.includes('github.com')) {
      return '[GitHub]';
    }
    
    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return '[YouTube]';
    }
    
    // Twitter/X
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return '[Twitter]';
    }
    
    // LinkedIn
    if (hostname.includes('linkedin.com')) {
      return '[LinkedIn]';
    }
    
    // Facebook
    if (hostname.includes('facebook.com')) {
      return '[Facebook]';
    }
    
    // Reddit
    if (hostname.includes('reddit.com')) {
      return '[Reddit]';
    }
    
    // Notion
    if (hostname.includes('notion.so')) {
      return '[Notion]';
    }
    
    // Figma
    if (hostname.includes('figma.com')) {
      return '[Figma]';
    }
    
    // Zoom
    if (hostname.includes('zoom.us')) {
      return '[Zoom]';
    }
    
    // Teams
    if (hostname.includes('teams.microsoft.com')) {
      return '[Teams]';
    }
    
    // Dropbox
    if (hostname.includes('dropbox.com')) {
      return '[Dropbox]';
    }
    
    // Google Drive
    if (hostname.includes('drive.google.com')) {
      return '[Google Drive]';
    }
    
    // OneDrive
    if (hostname.includes('onedrive.live.com') || hostname.includes('1drv.ms')) {
      return '[OneDrive]';
    }
    
    // iCloud
    if (hostname.includes('icloud.com')) {
      return '[iCloud]';
    }
    
    // Spotify
    if (hostname.includes('open.spotify.com')) {
      return '[Spotify]';
    }
    
    // Apple Music
    if (hostname.includes('music.apple.com')) {
      return '[Apple Music]';
    }
    
    // Netflix
    if (hostname.includes('netflix.com')) {
      return '[Netflix]';
    }
    
    // Amazon
    if (hostname.includes('amazon.com') || hostname.includes('amazon.co.uk') || hostname.includes('amazon.ca')) {
      return '[Amazon]';
    }
    
    // eBay
    if (hostname.includes('ebay.com')) {
      return '[eBay]';
    }
    
    // PayPal
    if (hostname.includes('paypal.com')) {
      return '[PayPal]';
    }
    
    // Stripe
    if (hostname.includes('stripe.com')) {
      return '[Stripe]';
    }
    
    // Shopify
    if (hostname.includes('shopify.com')) {
      return '[Shopify]';
    }
    
    // WordPress
    if (hostname.includes('wordpress.com')) {
      return '[WordPress]';
    }
    
    // Medium
    if (hostname.includes('medium.com')) {
      return '[Medium]';
    }
    
    // Substack
    if (hostname.includes('substack.com')) {
      return '[Substack]';
    }
    
    // Calendly
    if (hostname.includes('calendly.com')) {
      return '[Calendly]';
    }
    
    // Typeform
    if (hostname.includes('typeform.com')) {
      return '[Typeform]';
    }
    
    // Airtable
    if (hostname.includes('airtable.com')) {
      return '[Airtable]';
    }
    
    // Trello
    if (hostname.includes('trello.com')) {
      return '[Trello]';
    }
    
    // Asana
    if (hostname.includes('asana.com')) {
      return '[Asana]';
    }
    
    // Monday.com
    if (hostname.includes('monday.com')) {
      return '[Monday]';
    }
    
    // Jira
    if (hostname.includes('atlassian.net') || hostname.includes('jira.com')) {
      return '[Jira]';
    }
    
    // Confluence
    if (hostname.includes('atlassian.net') && pathname.includes('/wiki/')) {
      return '[Confluence]';
    }
    
    // Linear
    if (hostname.includes('linear.app')) {
      return '[Linear]';
    }
    
    // ClickUp
    if (hostname.includes('clickup.com')) {
      return '[ClickUp]';
    }
    
    // Notion
    if (hostname.includes('notion.so')) {
      return '[Notion]';
    }
    
    // Obsidian
    if (hostname.includes('obsidian.md')) {
      return '[Obsidian]';
    }
    
    // Roam Research
    if (hostname.includes('roamresearch.com')) {
      return '[Roam]';
    }
    
    // Logseq
    if (hostname.includes('logseq.com')) {
      return '[Logseq]';
    }
    
    // Default for unknown services
    return '';
    
  } catch (error) {
    // If URL parsing fails, return empty string
    return '';
  }
};

/**
 * Parse inline formatting (bold, links, colors)
 */
const parseInlineFormatting = ({ content, searchTerm, lineIndex, onAddText, onEditText, noteContent, allNotes = [], onNavigateToNote = null }) => {
  
  
  
  
  // Check if this note has reversed URLs
  const hasReversedUrls = noteContent && noteContent.includes('meta::url_reversed');
  
  
  // Helper function to reverse a string
  const reverseString = (str) => {
    return str.split('').reverse().join('');
  };

  // First handle any heading markers by temporarily replacing them
  let processedContent = content;
  const trimmed = content.trim();
  const isH1 = trimmed.startsWith('###') && trimmed.endsWith('###');
  const isH2 = trimmed.startsWith('##') && !trimmed.startsWith('###') && trimmed.endsWith('##');

  if (isH1) {
    processedContent = content.slice(3, -3);
  } else if (isH2) {
    processedContent = content.slice(2, -2);
  }

  const elements = [];
  let currentText = '';
  let isBold = false;
  let isItalic = false;

  // Check if this is a reversed URL (ends with ptth)
  const testString = processedContent.trim();
  
  
 
  const isReversedUrl = testString.match(/^[^\s]+\/\/[^\s]+ptth$/);
  
  


  
  if (processedContent.trim().startsWith("http:") || processedContent.trim().startsWith("https:")) {
    
    const url = processedContent.trim();
    const hostname = new URL(url).hostname;
    
    let urlElement = (
      <span key={`url-${lineIndex}`} className="inline-flex items-center gap-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
          onClick={(e) => e.stopPropagation()}
        >
          {hostname}
        </a>
        <button
          onClick={() => onAddText && onAddText(url)}
          className="px-1 py-0.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors duration-150"
          title="Add custom text for this link"
        >
          Add text
        </button>
      </span>
    );
    elements.push(urlElement);
  } else if (isReversedUrl && hasReversedUrls) {
    
    // Handle reversed URL
    const reversedUrl = processedContent.trim();
    const originalUrl = reverseString(reversedUrl);
    
    
    const hostname = new URL(originalUrl).hostname;
    
    
    let urlElement = (
      <span key={`url-${lineIndex}`} className="inline-flex items-center gap-1">
        <a
          href={originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
          onClick={(e) => e.stopPropagation()}
        >
          {hostname}
        </a>
        <button
          onClick={() => onAddText && onAddText(originalUrl)}
          className="px-1 py-0.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors duration-150"
          title="Add custom text for this link"
        >
          Add text
        </button>
      </span>
    );
    
    elements.push(urlElement);
  } else {
    // Process mixed content with wiki-links and markdown links
    let processedText = processedContent;
    
    // First, find all wiki-links [[Note Title]]
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    let wikiMatch;
    let wikiLastIndex = 0;
    const wikiLinkMatches = [];
    
    // Collect all wiki-link matches
    while ((wikiMatch = wikiLinkRegex.exec(processedText)) !== null) {
      wikiLinkMatches.push({
        fullMatch: wikiMatch[0],
        noteTitle: wikiMatch[1],
        startIndex: wikiMatch.index,
        endIndex: wikiMatch.index + wikiMatch[0].length
      });
    }
    
    // Find all markdown links in the content (including reversed URLs)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    let lastIndex = 0;
    const linkMatches = [];
    
    
    
    // Collect all markdown link matches
    while ((match = markdownLinkRegex.exec(processedText)) !== null) {
      
      linkMatches.push({
        fullMatch: match[0],
        customText: match[1],
        url: match[2],
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
    
    // Helper function to find note by title
    const findNoteByTitle = (title) => {
      if (!allNotes || allNotes.length === 0) return null;
      const titleLower = title.toLowerCase().trim();
      return allNotes.find(note => {
        const firstLine = note.content.split('\n')[0]?.toLowerCase().trim() || '';
        return firstLine === titleLower || firstLine.includes(titleLower);
      });
    };
    
    // Process wiki-links first (they take precedence)
    if (wikiLinkMatches.length > 0) {
      for (let i = 0; i < wikiLinkMatches.length; i++) {
        const wikiLinkMatch = wikiLinkMatches[i];
        
        // Add text before the wiki-link
        if (wikiLinkMatch.startIndex > wikiLastIndex) {
          const textBefore = processedText.slice(wikiLastIndex, wikiLinkMatch.startIndex);
          if (textBefore) {
            // Process text before for markdown links and other formatting
            const tempElements = [];
            const beforeMarkdownLinks = [];
            let beforeLastIndex = 0;
            
            // Check for markdown links in text before
            const beforeMarkdownRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
            let beforeMatch;
            while ((beforeMatch = beforeMarkdownRegex.exec(textBefore)) !== null) {
              beforeMarkdownLinks.push({
                fullMatch: beforeMatch[0],
                customText: beforeMatch[1],
                url: beforeMatch[2],
                startIndex: beforeMatch.index,
                endIndex: beforeMatch.index + beforeMatch[0].length
              });
            }
            
            if (beforeMarkdownLinks.length > 0) {
              for (let j = 0; j < beforeMarkdownLinks.length; j++) {
                const beforeLink = beforeMarkdownLinks[j];
                if (beforeLink.startIndex > beforeLastIndex) {
                  const beforeText = textBefore.slice(beforeLastIndex, beforeLink.startIndex);
                  if (beforeText) {
                    tempElements.push(...highlightSearchTerm(beforeText, searchTerm, `text-${lineIndex}-before-wiki-${i}-${j}`));
                  }
                }
                const isReversedUrlInMarkdown = hasReversedUrls && beforeLink.url.match(/[^\s]+\/\/[^\s]+ptth/);
                const originalUrl = isReversedUrlInMarkdown ? reverseString(beforeLink.url) : beforeLink.url;
                const linkIndicator = getLinkTypeIndicator(originalUrl);
                tempElements.push(
                  <span key={`url-${lineIndex}-before-wiki-${i}-${j}`} className="inline-flex items-center gap-1">
                    <a
                      href={originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {linkIndicator ? (
                        <>
                          {beforeLink.customText} <span className="text-xs text-gray-500 font-normal">{linkIndicator}</span>
                        </>
                      ) : beforeLink.customText}
                    </a>
                  </span>
                );
                beforeLastIndex = beforeLink.endIndex;
              }
              if (beforeLastIndex < textBefore.length) {
                const afterText = textBefore.slice(beforeLastIndex);
                if (afterText) {
                  tempElements.push(...highlightSearchTerm(afterText, searchTerm, `text-${lineIndex}-after-markdown-before-wiki-${i}`));
                }
              }
            } else {
              tempElements.push(...highlightSearchTerm(textBefore, searchTerm, `text-${lineIndex}-before-wiki-${i}`));
            }
            elements.push(...tempElements);
          }
        }
        
        // Find the note by title
        const linkedNote = findNoteByTitle(wikiLinkMatch.noteTitle);
        
        // Add the wiki-link element
        const wikiLinkElement = (
          <span
            key={`wiki-${lineIndex}-${i}`}
            className={`inline-flex items-center gap-1 ${
              linkedNote
                ? 'text-purple-600 hover:text-purple-800 cursor-pointer underline font-medium'
                : 'text-gray-500 hover:text-gray-700 cursor-not-allowed'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (linkedNote && onNavigateToNote) {
                onNavigateToNote(linkedNote.id);
              }
            }}
            title={linkedNote ? `Link to: ${wikiLinkMatch.noteTitle}` : `Note not found: ${wikiLinkMatch.noteTitle}`}
          >
            [[{wikiLinkMatch.noteTitle}]]
          </span>
        );
        elements.push(wikiLinkElement);
        
        wikiLastIndex = wikiLinkMatch.endIndex;
      }
      
      // Process remaining text after last wiki-link for markdown links
      if (wikiLastIndex < processedText.length) {
        const textAfterWiki = processedText.slice(wikiLastIndex);
        
        // Check for markdown links in remaining text
        const afterMarkdownLinks = [];
        let afterLastIndex = 0;
        const afterMarkdownRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let afterMatch;
        while ((afterMatch = afterMarkdownRegex.exec(textAfterWiki)) !== null) {
          afterMarkdownLinks.push({
            fullMatch: afterMatch[0],
            customText: afterMatch[1],
            url: afterMatch[2],
            startIndex: afterMatch.index,
            endIndex: afterMatch.index + afterMatch[0].length
          });
        }
        
        if (afterMarkdownLinks.length > 0) {
          for (let j = 0; j < afterMarkdownLinks.length; j++) {
            const afterLink = afterMarkdownLinks[j];
            if (afterLink.startIndex > afterLastIndex) {
              const beforeText = textAfterWiki.slice(afterLastIndex, afterLink.startIndex);
              if (beforeText) {
                elements.push(...highlightSearchTerm(beforeText, searchTerm, `text-${lineIndex}-after-wiki-${j}`));
              }
            }
            const isReversedUrlInMarkdown = hasReversedUrls && afterLink.url.match(/[^\s]+\/\/[^\s]+ptth/);
            const originalUrl = isReversedUrlInMarkdown ? reverseString(afterLink.url) : afterLink.url;
            const linkIndicator = getLinkTypeIndicator(originalUrl);
            elements.push(
              <span key={`url-${lineIndex}-after-wiki-${j}`} className="inline-flex items-center gap-1">
                <a
                  href={originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline hover:text-blue-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  {linkIndicator ? (
                    <>
                      {afterLink.customText} <span className="text-xs text-gray-500 font-normal">{linkIndicator}</span>
                    </>
                  ) : afterLink.customText}
                </a>
              </span>
            );
            afterLastIndex = afterLink.endIndex;
          }
          if (afterLastIndex < textAfterWiki.length) {
            const finalText = textAfterWiki.slice(afterLastIndex);
            if (finalText) {
              elements.push(...highlightSearchTerm(finalText, searchTerm, `text-${lineIndex}-final`));
            }
          }
        } else {
          // No markdown links, just process remaining text normally
          elements.push(...highlightSearchTerm(textAfterWiki, searchTerm, `text-${lineIndex}-after-wiki`));
        }
      }
    } else if (linkMatches.length > 0) {
      // If we found markdown links but no wiki-links, process them
      for (let i = 0; i < linkMatches.length; i++) {
        const linkMatch = linkMatches[i];
        
        // Add text before the link
        if (linkMatch.startIndex > lastIndex) {
          const textBefore = processedText.slice(lastIndex, linkMatch.startIndex);
          if (textBefore) {
            elements.push(...highlightSearchTerm(textBefore, searchTerm, `text-${lineIndex}-before-${i}`));
          }
        }
        
        // Check if this is a reversed URL in markdown
        const isReversedUrlInMarkdown = hasReversedUrls && linkMatch.url.match(/[^\s]+\/\/[^\s]+ptth/);
        const originalUrl = isReversedUrlInMarkdown ? reverseString(linkMatch.url) : linkMatch.url;
        
        
        
        
        
        
        // Add the markdown link
        const linkIndicator = getLinkTypeIndicator(originalUrl);
        const linkElement = (
          <span key={`url-${lineIndex}-${i}`} className="inline-flex items-center gap-1">
            <a
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
              onClick={(e) => e.stopPropagation()}
            >
              {linkIndicator ? (
                <>
                  {linkMatch.customText} <span className="text-xs text-gray-500 font-normal">{linkIndicator}</span>
                </>
              ) : linkMatch.customText}
            </a>
            <button
              onClick={() => onEditText && onEditText(originalUrl, linkMatch.customText)}
              className="px-1 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors duration-150"
              title="Edit link text"
            >
              Edit
            </button>
          </span>
        );
        elements.push(linkElement);
        
        lastIndex = linkMatch.endIndex;
      }
      
      // Add any remaining text after the last link
      if (lastIndex < processedText.length) {
        const textAfter = processedText.slice(lastIndex);
        if (textAfter) {
          // Check for wiki-links in remaining text
          const afterWikiLinks = [];
          let afterWikiLastIndex = 0;
          const afterWikiRegex = /\[\[([^\]]+)\]\]/g;
          let afterWikiMatch;
          while ((afterWikiMatch = afterWikiRegex.exec(textAfter)) !== null) {
            afterWikiLinks.push({
              fullMatch: afterWikiMatch[0],
              noteTitle: afterWikiMatch[1],
              startIndex: afterWikiMatch.index,
              endIndex: afterWikiMatch.index + afterWikiMatch[0].length
            });
          }
          
          if (afterWikiLinks.length > 0) {
            for (let j = 0; j < afterWikiLinks.length; j++) {
              const afterWikiLink = afterWikiLinks[j];
              if (afterWikiLink.startIndex > afterWikiLastIndex) {
                const beforeText = textAfter.slice(afterWikiLastIndex, afterWikiLink.startIndex);
                if (beforeText) {
                  elements.push(...highlightSearchTerm(beforeText, searchTerm, `text-${lineIndex}-after-markdown-wiki-${j}`));
                }
              }
              const linkedNote = findNoteByTitle(afterWikiLink.noteTitle);
              elements.push(
                <span
                  key={`wiki-${lineIndex}-after-markdown-${j}`}
                  className={`inline-flex items-center gap-1 ${
                    linkedNote
                      ? 'text-purple-600 hover:text-purple-800 cursor-pointer underline font-medium'
                      : 'text-gray-500 hover:text-gray-700 cursor-not-allowed'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (linkedNote && onNavigateToNote) {
                      onNavigateToNote(linkedNote.id);
                    }
                  }}
                  title={linkedNote ? `Link to: ${afterWikiLink.noteTitle}` : `Note not found: ${afterWikiLink.noteTitle}`}
                >
                  [[{afterWikiLink.noteTitle}]]
                </span>
              );
              afterWikiLastIndex = afterWikiLink.endIndex;
            }
            if (afterWikiLastIndex < textAfter.length) {
              const finalText = textAfter.slice(afterWikiLastIndex);
              if (finalText) {
                elements.push(...highlightSearchTerm(finalText, searchTerm, `text-${lineIndex}-after-markdown-final`));
              }
            }
          } else {
            elements.push(...highlightSearchTerm(textAfter, searchTerm, `text-${lineIndex}-after`));
          }
        }
      }
    } else {
      // No markdown links found, process character by character
      // (wiki-links would have been processed in the first if block)
      for (let i = 0; i < processedContent.length; i++) {
        const char = processedContent[i];
        const nextChar = processedContent[i + 1];

        // Handle bold markers
        if (char === '*' && nextChar === '*') {
          if (currentText) {
            elements.push(...highlightSearchTerm(currentText, searchTerm, `text-${lineIndex}-${i}`));
            currentText = '';
          }
          isBold = !isBold;
          i++; // Skip next asterisk
          continue;
        }

        // Handle italic markers
        if (char === '*' && !isBold) {
          if (currentText) {
            elements.push(...highlightSearchTerm(currentText, searchTerm, `text-${lineIndex}-${i}`));
            currentText = '';
          }
          isItalic = !isItalic;
          continue;
        }

        // Handle URLs
        if ((char === 'h' && processedContent.slice(i, i + 7) === 'http://') ||
          (char === 'h' && processedContent.slice(i, i + 8) === 'https://')) {
          if (currentText) {
            elements.push(...highlightSearchTerm(currentText, searchTerm, `text-${lineIndex}-${i}`));
            currentText = '';
          }

          // Find the end of the URL (space or end of string)
          let urlEnd = i;
          while (urlEnd < processedContent.length && processedContent[urlEnd] !== ' ') {
            urlEnd++;
          }
          const url = processedContent.slice(i, urlEnd);
          const hostname = new URL(url).hostname;
          
          elements.push(
            <span key={`url-${lineIndex}-${i}`} className="inline-flex items-center gap-1">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                {hostname}
              </a>
              <button
                onClick={() => onAddText && onAddText(url)}
                className="px-1 py-0.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors duration-150"
                title="Add custom text for this link"
              >
                Add text
              </button>
            </span>
          );
          i = urlEnd - 1;
          continue;
        }

        currentText += char;
      }
    }
  }

  // Add any remaining text
  if (currentText) {
    let textElement = highlightSearchTerm(currentText, searchTerm, `text-${lineIndex}-end`);
    if (isBold) {
      textElement = textElement.map((el, idx) =>
        <strong key={`bold-${lineIndex}-end-${idx}`}>{el}</strong>
      );
    }
    if (isItalic) {
      textElement = textElement.map((el, idx) =>
        <em key={`italic-${lineIndex}-end-${idx}`}>{el}</em>
      );
    }
    elements.push(...textElement);
  }

  return elements;
};

/**
 * Highlight search terms in text
 */
const highlightSearchTerm = (text, searchTerm, keyPrefix) => {
  if (!searchTerm || !text) return [text];

  // Split search term into individual words and escape special regex characters
  const searchWords = searchTerm.split(/\s+/)
    .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(word => word.length > 0);

  if (searchWords.length === 0) return [text];

  // Create a regex that matches any of the search words
  const regex = new RegExp(`(${searchWords.join('|')})`, 'gi');
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add the highlighted match
    parts.push(
      <span key={`${keyPrefix}-${match.index}`} className="bg-yellow-200">
        {match[0]}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

/**
 * Convert text to sentence case (first letter capitalized, rest lowercase)
 */
const toSentenceCase = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Wrap content in appropriate container based on line type
 */
const wrapInContainer = ({ content, type, lineIndex, isCodeBlockStart, isCodeBlockEnd, isSingleLineCodeBlock }) => {
  switch (type) {
    case 'heading1':
      return (
        <h1 key={`h1-${lineIndex}`} className="text-2xl font-bold">
          {toSentenceCase(content)}
        </h1>
      );
    case 'heading2':
      return (
        <h2 key={`h2-${lineIndex}`} className="text-lg font-semibold text-gray-900">
          {content}
        </h2>
      );
    case 'bullet':
      return (
        <div key={`bullet-${lineIndex}`} className="flex">
          <span className="mr-2">•</span>
          <div>{content}</div>
        </div>
      );
    case 'codeblock':
      const codeBlockStyle = {
        backgroundColor: '#e5e7eb',
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        lineHeight: '1.25rem',
        paddingLeft: '8px',
        paddingRight: '8px',
        paddingTop: (isCodeBlockStart || isSingleLineCodeBlock) ? '8px' : '0',
        paddingBottom: (isCodeBlockEnd || isSingleLineCodeBlock) ? '8px' : '0',
        marginLeft: '2rem',
        // Counteract space-y-1 from parent (0.25rem = 4px) and ensure no gaps between consecutive code block lines
        marginTop: (isCodeBlockStart || isSingleLineCodeBlock) ? '4px' : '-4px',
        marginBottom: '0',
        borderLeft: '1px solid #d1d5db',
        borderRight: '1px solid #d1d5db',
        borderTop: (isCodeBlockStart || isSingleLineCodeBlock) ? '1px solid #d1d5db' : 'none',
        borderBottom: (isCodeBlockEnd || isSingleLineCodeBlock) ? '1px solid #d1d5db' : 'none',
        borderTopLeftRadius: (isCodeBlockStart || isSingleLineCodeBlock) ? '6px' : '0',
        borderTopRightRadius: (isCodeBlockStart || isSingleLineCodeBlock) ? '6px' : '0',
        borderBottomLeftRadius: (isCodeBlockEnd || isSingleLineCodeBlock) ? '6px' : '0',
        borderBottomRightRadius: (isCodeBlockEnd || isSingleLineCodeBlock) ? '6px' : '0',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        display: 'block'
      };
      return (
        <div key={`codeblock-${lineIndex}`} className="code-block-triple-backtick" style={codeBlockStyle}>
          {content}
        </div>
      );
    default:
      return <div key={`line-${lineIndex}`}>{content}</div>;
  }
};



// Export for use in tests
export const __testing__ = {
  parseInlineFormatting,
  highlightSearchTerm,
  wrapInContainer
};

