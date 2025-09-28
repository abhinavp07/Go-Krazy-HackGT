// Content script for reading page content
(function() {
  'use strict';

  // Function to extract text from the page
  function extractPageText() {
    // Clone the document to avoid modifying the original
    const clonedDoc = document.cloneNode(true);
    
    // Remove script and style elements from the clone
    const scripts = clonedDoc.querySelectorAll('script, style, nav, header, footer, aside');
    scripts.forEach(el => el.remove());

    // Get main content areas from the clone
    const mainContent = clonedDoc.querySelector('main, article, .content, #content, .main-content');
    const body = clonedDoc.body;
    
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
  } else if (request.action === 'jumpToRedFlag') {
    jumpToRedFlagInDocument(request.term, request.context);
    sendResponse({ success: true });
  }
});

// Function to jump to a specific section in the document
function jumpToSectionInDocument(sectionNumber) {
  // Enhanced section patterns for better matching
  const sectionPatterns = [
    // Pattern 1: "1. Section Title" or "1 Section Title"
    new RegExp(`^\\s*${sectionNumber}[\\s\\.\\-:]+`, 'i'),
    // Pattern 2: "Section 1:" or "Article 1:" or "Clause 1:"
    new RegExp(`(?:section|article|clause|part|chapter)\\s*${sectionNumber}[\\s\\.\\-:]`, 'i'),
    // Pattern 3: "1.1" or "1.2" subsections
    new RegExp(`^\\s*${sectionNumber}\\.\\d+[\\s\\.\\-:]`, 'i'),
    // Pattern 4: Just the number at start of line
    new RegExp(`^\\s*${sectionNumber}\\s+`, 'i'),
    // Pattern 5: Number with parentheses "(1)" or "(1.)"
    new RegExp(`\\(\\s*${sectionNumber}\\s*\\)`, 'i'),
    // Pattern 6: Roman numerals "I.", "II.", etc.
    new RegExp(`^\\s*[IVX]+\\s*${sectionNumber}[\\s\\.\\-:]`, 'i')
  ];
  
  // Try to find section headers in order of preference
  const selectors = [
    'h1, h2, h3, h4, h5, h6',  // Headers first
    'p',                        // Paragraphs
    'div',                      // Divs
    'span',                     // Spans
    'li',                       // List items
    '*'                         // Everything else
  ];
  
  let foundElement = null;
  
  // Search through elements in order of preference
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    
    for (const element of elements) {
      const text = element.textContent || element.innerText || '';
      const trimmedText = text.trim();
      
      // Check each pattern
      for (const pattern of sectionPatterns) {
        if (pattern.test(trimmedText)) {
          // Additional validation: make sure it's not just a random number
          const words = trimmedText.split(' ');
          if (words.length > 1 || trimmedText.length > 3) {
            foundElement = element;
            break;
          }
        }
      }
      if (foundElement) break;
    }
    if (foundElement) break;
  }
  
  // If still not found, try a more aggressive search
  if (!foundElement) {
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      const text = element.textContent || element.innerText || '';
      const trimmedText = text.trim();
      
      // Look for exact number match at start of text
      if (trimmedText.match(new RegExp(`^\\s*${sectionNumber}[\\s\\.\\-:]`, 'i'))) {
        // Make sure it's not just a number in the middle of text
        const beforeNumber = trimmedText.substring(0, trimmedText.indexOf(sectionNumber.toString()));
        if (beforeNumber.length <= 5) { // Allow some whitespace/formatting
          foundElement = element;
          break;
        }
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
    const originalBorder = foundElement.style.border;
    foundElement.style.backgroundColor = '#fff3cd';
    foundElement.style.border = '2px solid #ffc107';
    foundElement.style.borderRadius = '4px';
    foundElement.style.padding = '8px';
    foundElement.style.margin = '4px';
    
    setTimeout(() => {
      foundElement.style.backgroundColor = originalBg;
      foundElement.style.border = originalBorder;
      foundElement.style.borderRadius = '';
      foundElement.style.padding = '';
      foundElement.style.margin = '';
    }, 3000);
  } else {
    // Fallback: scroll to top if section not found
    window.scrollTo({ top: 0, behavior: 'smooth' });
    console.log(`Section ${sectionNumber} not found`);
  }
}

// Function to jump to a red flag term in the document
function jumpToRedFlagInDocument(term, context) {
  const lowerTerm = term.toLowerCase();
  const lowerContext = context.toLowerCase();
  
  // Enhanced search strategy - prioritize smaller, more specific elements
  const searchSelectors = [
    'p', 'div', 'span', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'article', 'section', 'main', 'aside', 'blockquote', 'pre'
  ];
  
  let foundElement = null;
  let bestMatch = null;
  let bestScore = 0;
  
  // Search through elements in order of preference
  for (const selector of searchSelectors) {
    const elements = document.querySelectorAll(selector);
    
    for (const element of elements) {
      const text = element.textContent || element.innerText || '';
      const lowerText = text.toLowerCase();
      
      // Skip very large elements (likely containers)
      if (text.length > 2000) continue;
      
      // Check for exact term match
      if (lowerText.includes(lowerTerm)) {
        let score = 0;
        
        // Score based on context match
        if (lowerContext && lowerText.includes(lowerContext.substring(0, 30))) {
          score += 10;
        }
        
        // Score based on element size (prefer smaller, more specific elements)
        if (text.length < 200) score += 5;
        else if (text.length < 500) score += 3;
        else if (text.length < 1000) score += 1;
        
        // Score based on element type (prefer content elements)
        if (['p', 'span', 'li'].includes(selector)) score += 2;
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(selector)) score += 3;
        
        // Score based on term position (prefer terms at start of element)
        const termIndex = lowerText.indexOf(lowerTerm);
        if (termIndex < 50) score += 2;
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = element;
        }
        
        // If we have a good match with context, use it immediately
        if (score >= 10) {
          foundElement = element;
          break;
        }
      }
    }
    
    if (foundElement) break;
  }
  
  // Use best match if no immediate context match found
  if (!foundElement && bestMatch) {
    foundElement = bestMatch;
  }
  
  // If still not found, try a more aggressive search with word boundaries
  if (!foundElement) {
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      const text = element.textContent || element.innerText || '';
      const lowerText = text.toLowerCase();
      
      // Skip very large elements
      if (text.length > 3000) continue;
      
      // Look for term with word boundaries
      const wordBoundaryRegex = new RegExp(`\\b${lowerTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (wordBoundaryRegex.test(text)) {
        foundElement = element;
        break;
      }
    }
  }
  
  // If still not found, try partial matches
  if (!foundElement) {
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      const text = element.textContent || element.innerText || '';
      const lowerText = text.toLowerCase();
      
      // Skip very large elements
      if (text.length > 3000) continue;
      
      if (lowerText.includes(lowerTerm)) {
        foundElement = element;
        break;
      }
    }
  }
  
  // Scroll to the found element
  if (foundElement) {
    foundElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'nearest'
    });
    
    // Highlight the element briefly with red flag styling
    const originalBg = foundElement.style.backgroundColor;
    const originalBorder = foundElement.style.border;
    const originalBoxShadow = foundElement.style.boxShadow;
    
    foundElement.style.backgroundColor = '#ffebee';
    foundElement.style.border = '3px solid #f44336';
    foundElement.style.borderRadius = '6px';
    foundElement.style.padding = '12px';
    foundElement.style.margin = '8px';
    foundElement.style.boxShadow = '0 4px 8px rgba(244, 67, 54, 0.3)';
    foundElement.style.transition = 'all 0.3s ease';
    
    // Add a pulsing effect
    let pulseCount = 0;
    const pulseInterval = setInterval(() => {
      if (pulseCount >= 3) {
        clearInterval(pulseInterval);
        return;
      }
      
      foundElement.style.transform = 'scale(1.02)';
      setTimeout(() => {
        foundElement.style.transform = 'scale(1)';
      }, 200);
      pulseCount++;
    }, 600);
    
    setTimeout(() => {
      foundElement.style.backgroundColor = originalBg;
      foundElement.style.border = originalBorder;
      foundElement.style.borderRadius = '';
      foundElement.style.padding = '';
      foundElement.style.margin = '';
      foundElement.style.boxShadow = originalBoxShadow;
      foundElement.style.transform = '';
      foundElement.style.transition = '';
      clearInterval(pulseInterval);
    }, 4000);
    
    console.log(`Successfully jumped to red flag term: "${term}"`);
  } else {
    // Fallback: scroll to top if term not found
    window.scrollTo({ top: 0, behavior: 'smooth' });
    console.log(`Red flag term "${term}" not found in document`);
    
    // Show a brief notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
    `;
    notification.textContent = `Red flag "${term}" not found in document`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

})();
