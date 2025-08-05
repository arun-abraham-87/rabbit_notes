import React, { useState } from 'react';
import LinkPreview from '../components/LinkPreview';
import LinkWithPreview from '../components/LinkWithPreview';

/**
 * Comprehensive function to parse and format note content
 * @param {Object} params
 * @param {string} params.content - The note content
 * @param {string} params.searchTerm - Search term for highlighting
 * @returns {Array<React.ReactElement>} Array of formatted React elements
 */
export const parseNoteContent = ({ content, searchTerm, onAddText, onEditText }) => {
  
  if (!content) return [];

  // Split into lines and process each line
  const lines = content.split('\n')
    .filter(line => !line.trim().startsWith('meta::'))
    .map(line => {
      
      // First extract any color value wrapped in @$%^ markers
      const colorMatch = line.match(/@\$%\^([^@]+)@\$%\^/);
      const color = colorMatch ? colorMatch[1] : null;

      // Remove the color markers and get clean text
      const cleanLine = line.replace(/@\$%\^[^@]+@\$%\^/, '');
      

      return { line: cleanLine, color };
    });

  // Process lines
  const processedElements = [];
  
  lines.forEach(({ line, color }, lineIndex) => {
    // Check if this is an h2 header
    const trimmed = line.trim();
    const isH2 = trimmed.startsWith('##') && !trimmed.startsWith('###') && trimmed.endsWith('##');
    
    // Step 1: Parse inline formatting first
    
    const formattedContent = parseInlineFormatting({
      content: line,
      searchTerm,
      lineIndex,
      onAddText,
      onEditText,
      noteContent: content
    });
    

    // Step 2: Check if this is a heading by looking at the original line
    let type = 'normal';
    if (trimmed.startsWith('###') && trimmed.endsWith('###')) {
      type = 'heading1';
    } else if (isH2) {
      type = 'heading2';
    } else if (trimmed.startsWith('- ')) {
      type = 'bullet';
    }

    // Step 3: Wrap in appropriate container based on line type
    let element = wrapInContainer({
      content: formattedContent,
      type,
      lineIndex
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
 * Parse and format a URL for display
 * @param {string} url - The URL to parse
 * @returns {string} - The formatted display text for the URL
 */
const parseUrl = (url) => {
  //('url', url);
  return url;

};

/**
 * Extract URL from markdown link format [text](url)
 * @param {string} text - The text containing the markdown link
 * @returns {string|null} - The extracted URL or null if not found
 */
const extractUrlFromMarkdown = (text) => {
  const match = text.match(/\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/);
  return match ? match[1] : null;
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
const parseInlineFormatting = ({ content, searchTerm, lineIndex, onAddText, onEditText, noteContent }) => {
  
  
  
  
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
        <LinkWithPreview url={url}>
          {hostname}
        </LinkWithPreview>
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
        <LinkWithPreview url={originalUrl}>
          {hostname}
        </LinkWithPreview>
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
    // Process mixed content with markdown links
    let processedText = processedContent;
    
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
    
    
    
    // If we found markdown links, process them
    if (linkMatches.length > 0) {
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
            <LinkWithPreview url={originalUrl}>
              {linkIndicator ? (
                <>
                  {linkMatch.customText} <span className="text-xs text-gray-500 font-normal">{linkIndicator}</span>
                </>
              ) : linkMatch.customText}
            </LinkWithPreview>
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
          elements.push(...highlightSearchTerm(textAfter, searchTerm, `text-${lineIndex}-after`));
        }
      }
    } else {
      // No markdown links found, process character by character
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
        if (char === 'h' && processedContent.slice(i, i + 7) === 'http://' ||
          char === 'h' && processedContent.slice(i, i + 8) === 'https://') {
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
const wrapInContainer = ({ content, type, lineIndex }) => {
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

