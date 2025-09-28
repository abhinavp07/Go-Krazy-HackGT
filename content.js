// Content script for reading page content
(function() {
  'use strict';

  // Function to extract text from the page
  function extractPageText() {
    // Remove script and style elements
    const scripts = document.querySelectorAll('script, style, nav, header, footer, aside');
    scripts.forEach(el => el.remove());

    // Get main content areas
    const mainContent = document.querySelector('main, article, .content, #content, .main-content');
    const body = document.body;
    
    const contentElement = mainContent || body;
    
    // Extract text content
    let text = contentElement.innerText || contentElement.textContent || '';
    
    // Clean up the text
    text = text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
    
    return text;
  }

  // Function to get selected text
  function getSelectedText() {
    const selection = window.getSelection();
    return selection.toString().trim();
  }

  // Function to highlight important terms
  function highlightImportantTerms(text) {
    const importantTerms = [
      'due date', 'deadline', 'expiration', 'termination',
      'penalty', 'fee', 'charge', 'cost', 'payment',
      'liability', 'responsibility', 'obligation',
      'restriction', 'limitation', 'prohibition',
      'warranty', 'guarantee', 'refund', 'return',
      'privacy', 'data', 'personal information',
      'cancellation', 'modification', 'amendment',
      'dispute', 'arbitration', 'legal action',
      'automatic renewal', 'auto-renew', 'subscription'
    ];

    const redFlags = [];
    const lowerText = text.toLowerCase();

    importantTerms.forEach(term => {
      if (lowerText.includes(term)) {
        redFlags.push({
          term: term,
          context: extractContext(text, term)
        });
      }
    });

    return redFlags;
  }

  // Function to extract context around a term
  function extractContext(text, term, contextLength = 100) {
    const index = text.toLowerCase().indexOf(term);
    if (index === -1) return '';

    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + term.length + contextLength);
    
    return text.substring(start, end).trim();
  }

  // Function to detect document type
  function detectDocumentType(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('lease') || lowerText.includes('rental') || lowerText.includes('tenant')) {
      return 'lease';
    } else if (lowerText.includes('terms of service') || lowerText.includes('terms and conditions')) {
      return 'terms';
    } else if (lowerText.includes('privacy policy')) {
      return 'privacy';
    } else if (lowerText.includes('agreement') || lowerText.includes('contract')) {
      return 'agreement';
    } else {
      return 'general';
    }
  }

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageText') {
    const text = extractPageText();
    const documentType = detectDocumentType(text);
    const redFlags = highlightImportantTerms(text);
    
    sendResponse({
      text: text,
      documentType: documentType,
      redFlags: redFlags,
      url: window.location.href,
      title: document.title
    });
  } else if (request.action === 'getSelectedText') {
    const selectedText = getSelectedText();
    const documentType = detectDocumentType(selectedText);
    const redFlags = highlightImportantTerms(selectedText);
    
    sendResponse({
      text: selectedText,
      documentType: documentType,
      redFlags: redFlags,
      url: window.location.href,
      title: document.title
    });
  } else if (request.action === 'jumpToSection') {
    jumpToSectionInDocument(request.sectionNumber);
    sendResponse({ success: true });
  }
});

// Function to jump to a specific section in the document
function jumpToSectionInDocument(sectionNumber) {
  // Common section patterns
  const sectionPatterns = [
    new RegExp(`(?:section|article|clause)\\s*${sectionNumber}[^\\d]`, 'i'),
    new RegExp(`(?:section|article|clause)\\s*${sectionNumber}\\s*[:\\-]`, 'i'),
    new RegExp(`^\\s*${sectionNumber}\\.`, 'i'),
    new RegExp(`^\\s*${sectionNumber}\\s+`, 'i')
  ];
  
  // Try to find section headers
  const headers = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div');
  let foundElement = null;
  
  for (const element of headers) {
    const text = element.textContent || element.innerText || '';
    for (const pattern of sectionPatterns) {
      if (pattern.test(text)) {
        foundElement = element;
        break;
      }
    }
    if (foundElement) break;
  }
  
  // If no specific section found, try to find numbered sections
  if (!foundElement) {
    const numberedElements = document.querySelectorAll('*');
    for (const element of numberedElements) {
      const text = element.textContent || element.innerText || '';
      if (text.match(new RegExp(`^\\s*${sectionNumber}[\\s\\.\\-:]`, 'i'))) {
        foundElement = element;
        break;
      }
    }
  }
  
  // Scroll to the found element
  if (foundElement) {
    foundElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start',
      inline: 'nearest'
    });
    
    // Highlight the section briefly
    const originalBg = foundElement.style.backgroundColor;
    foundElement.style.backgroundColor = '#fff3cd';
    setTimeout(() => {
      foundElement.style.backgroundColor = originalBg;
    }, 2000);
  } else {
    // Fallback: scroll to top if section not found
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

})();
