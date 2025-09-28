// Popup script for SignSmarter extension
(function() {
  'use strict';

  let currentDocumentData = null;
  
  // Get API key from config
  const openaiApiKey = CONFIG.OPENAI_API_KEY;

  // DOM elements
  const readPageBtn = document.getElementById('readPage');
  const readSelectedBtn = document.getElementById('readSelected');
  const readCopiedBtn = document.getElementById('readCopied');
  const loading = document.getElementById('loading');
  const results = document.getElementById('results');
  const error = document.getElementById('error');
  const errorMessage = document.getElementById('errorMessage');
  
  // Contract rating elements
  const contractRatingDiv = document.getElementById('contractRating');
  const ratingScoreMain = document.getElementById('ratingScoreMain');
  const ratingDescriptionMain = document.getElementById('ratingDescriptionMain');
  
  // API status elements
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');

  // Event listeners
  readPageBtn.addEventListener('click', () => readPageText());
  readSelectedBtn.addEventListener('click', () => readSelectedText());
  readCopiedBtn.addEventListener('click', () => readCopiedText());
  
  
  // Initialize API status on load
  initializeApiStatus();
  
  // Collapsible functionality
  function toggleCollapsible(contentId) {
    const content = document.getElementById(contentId);
    const header = content.previousElementSibling;
    const icon = header.querySelector('.collapse-icon');
    
    if (content.classList.contains('collapsed')) {
      // Expand
      content.classList.remove('collapsed');
      header.classList.add('expanded');
      icon.textContent = '▲';
    } else {
      // Collapse
      content.classList.add('collapsed');
      header.classList.remove('expanded');
      icon.textContent = '▼';
    }
  }

  // Make toggleCollapsible globally available
  window.toggleCollapsible = toggleCollapsible;
  
  // Add event listener for collapsible headers
  document.addEventListener('DOMContentLoaded', function() {
    const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    collapsibleHeaders.forEach(header => {
      header.addEventListener('click', function() {
        const contentId = this.getAttribute('data-target');
        toggleCollapsible(contentId);
      });
    });
  });

  // Function to jump to section in document
  function jumpToSection(sectionNumber) {
    // Try to find and scroll to the section in the current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        action: 'jumpToSection', 
        sectionNumber: sectionNumber 
      });
    });
  }

  // Function to jump to red flag in document
  function jumpToRedFlag(term, context) {
    // Try to find and scroll to the red flag term in the current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { 
        action: 'jumpToRedFlag', 
        term: term,
        context: context
      });
    });
  }

  // Make jumpToSection globally available
  window.jumpToSection = jumpToSection;
  
  // Make jumpToRedFlag globally available
  window.jumpToRedFlag = jumpToRedFlag;
  
  // Function to add event listeners for section links
  function addSectionLinkListeners() {
    const summaryContainer = document.getElementById('summary');
    summaryContainer.addEventListener('click', function(event) {
      if (event.target.classList.contains('section-link')) {
        event.preventDefault();
        const sectionNumber = parseInt(event.target.getAttribute('data-section'));
        jumpToSection(sectionNumber);
      }
    });
  }

  // Function to add event listeners for collapsible section headers
  function addSectionHeaderListeners() {
    const summaryContainer = document.getElementById('summary');
    summaryContainer.addEventListener('click', function(event) {
      if (event.target.classList.contains('section-header') || event.target.closest('.section-header')) {
        const header = event.target.classList.contains('section-header') ? 
          event.target : event.target.closest('.section-header');
        const contentId = header.getAttribute('data-target');
        toggleSectionCollapsible(contentId, header);
      }
    });
  }

  // Function to toggle section collapsible
  function toggleSectionCollapsible(contentId, header) {
    const content = document.getElementById(contentId);
    const icon = header.querySelector('.collapse-icon');
    
    if (content.classList.contains('collapsed')) {
      // Expand
      content.classList.remove('collapsed');
      header.classList.add('expanded');
      icon.textContent = '▲';
    } else {
      // Collapse
      content.classList.add('collapsed');
      header.classList.remove('expanded');
      icon.textContent = '▼';
    }
  }

  // API Status Management Functions
  function initializeApiStatus() {
    if (openaiApiKey && openaiApiKey !== 'YOUR_API_KEY_HERE') {
      updateApiStatus('connected', 'OpenAI GPT-4 analysis enabled');
    } else {
      updateApiStatus('error', 'API key not configured - using local analysis only');
    }
  }

  function updateApiStatus(status, message) {
    statusIndicator.className = `status-indicator ${status}`;
    statusText.textContent = message;
    
    // Update status indicator emoji
    switch (status) {
      case 'connected':
        statusIndicator.textContent = '🟢';
        break;
      case 'error':
        statusIndicator.textContent = '🔴';
        break;
      case 'disconnected':
        statusIndicator.textContent = '🟡';
        break;
    }
  }

  // Function to read page text
  async function readPageText() {
    showLoading();
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageText' });
      
      if (response && response.text) {
        currentDocumentData = response;
        await analyzeDocument(response);
      } else {
        showError('No text found on this page. Please try a different page.');
      }
    } catch (err) {
      showError('Error reading page content. Please refresh the page and try again.');
    }
  }

  // Function to read selected text
  async function readSelectedText() {
    showLoading();
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' });
      
      if (response && response.text && response.text.length > 50) {
        currentDocumentData = response;
        await analyzeDocument(response);
      } else {
        showError('Please select some text on the page first.');
      }
    } catch (err) {
      showError('Error reading selected text. Please try again.');
    }
  }

  // Function to read copied text
  async function readCopiedText() {
    showLoading();
    try {
      const clipboardText = await navigator.clipboard.readText();
      
      if (clipboardText && clipboardText.length > 50) {
        const documentData = {
          text: clipboardText,
          documentType: detectDocumentType(clipboardText),
          redFlags: highlightImportantTerms(clipboardText),
          url: 'Clipboard',
          title: 'Copied Text'
        };
        
        currentDocumentData = documentData;
        await analyzeDocument(documentData);
      } else {
        showError('No text found in clipboard. Please copy some text first.');
      }
    } catch (err) {
      showError('Error reading clipboard. Please ensure clipboard access is allowed.');
    }
  }

  // Function to analyze document
  async function analyzeDocument(documentData) {
    try {
      const analysis = await performAnalysis(documentData);
      displayResults(analysis);
    } catch (err) {
      showError('Error analyzing document. Please try again.');
    }
  }

  // Function to perform document analysis
  async function performAnalysis(documentData) {
    const { text, documentType, redFlags } = documentData;
    
    // Try OpenAI analysis first, fallback to local analysis
    if (openaiApiKey) {
      try {
        const analysis = await performOpenAIAnalysis(text, documentType);
        analysis.contractRating = calculateContractRating(text, redFlags, documentType);
        return analysis;
      } catch (err) {
        console.log('OpenAI analysis failed, falling back to local analysis:', err);
      }
    }
    
    // Fallback to local analysis
    const analysis = await performLocalAnalysis(documentData);
    analysis.contractRating = calculateContractRating(text, redFlags, documentType);
    return analysis;
  }

  // OpenAI-powered analysis
  async function performOpenAIAnalysis(text, documentType) {
    const prompt = createAnalysisPrompt(text, documentType);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: CONFIG.OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a legal document analysis expert. Analyze the provided document and extract key information, red flags, and create a consent checklist. Respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: CONFIG.TEMPERATURE,
        max_tokens: CONFIG.MAX_TOKENS
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    try {
      const analysis = JSON.parse(analysisText);
      return {
        summary: analysis.summary,
        keyPoints: analysis.keyPoints,
        redFlags: analysis.redFlags,
        consentChecklist: analysis.consentChecklist,
        documentType: documentType,
        sections: analysis.sections || null,
        source: 'openai'
      };
    } catch (parseError) {
      throw new Error('Failed to parse OpenAI response');
    }
  }

  // Local analysis fallback
  async function performLocalAnalysis(documentData) {
    const { text, documentType, redFlags } = documentData;
    
    // For longer documents, break into sections for better analysis
    const sections = breakIntoSections(text, documentType);
    
    // Generate summary
    const summary = generateSummary(text, documentType);
    
    // Extract key points
    const keyPoints = extractKeyPoints(text, documentType);
    
    // Process red flags
    const processedRedFlags = processRedFlags(redFlags, documentType);
    
    // Generate consent checklist
    const consentChecklist = generateConsentChecklist(keyPoints, processedRedFlags, documentType);
    
    return {
      summary,
      keyPoints,
      redFlags: processedRedFlags,
      consentChecklist,
      documentType,
      sections: sections.length > 1 ? sections : null,
      source: 'local'
    };
  }

  // Create analysis prompt for OpenAI
  function createAnalysisPrompt(text, documentType) {
    return `Analyze this ${documentType} document and provide a comprehensive analysis in JSON format:

Document Text:
${text.substring(0, CONFIG.MAX_TEXT_LENGTH)} ${text.length > CONFIG.MAX_TEXT_LENGTH ? '...[truncated]' : ''}

Please provide your analysis in the following JSON format:
{
  "summary": [
    {
      "number": 1,
      "content": "• Key point 1 from section 1<br>• Key point 2 from section 1<br>• Key point 3 from section 1"
    },
    {
      "number": 2,
      "content": "• Key point 1 from section 2<br>• Key point 2 from section 2<br>• Key point 3 from section 2"
    }
  ],
  "keyPoints": [
    "List of 5-10 most important points the user should understand",
    "Focus on obligations, rights, payments, deadlines, and restrictions"
  ],
  "redFlags": [
    {
      "term": "specific legal term or clause",
      "description": "why this is important/risky",
      "severity": "high/medium/low",
      "context": "relevant excerpt from the document"
    }
  ],
  "consentChecklist": [
    {
      "text": "I understand: [key point in simple language]",
      "isRedFlag": false
    },
    {
      "text": "I acknowledge: [red flag in simple language]",
      "isRedFlag": true
    }
  ]
}

IMPORTANT: 
- Extract ALL sections from the document (if there are 6 sections, show all 6)
- Each section should have 3 bullet points maximum
- Keep bullet points brief (8-10 words each)
- Focus on the most important information from each section

Focus on identifying:
- Financial obligations (rent, fees, penalties)
- Important deadlines and dates
- Automatic renewals or subscriptions
- Liability and responsibility clauses
- Privacy and data handling
- Termination and cancellation terms
- Dispute resolution processes
- Any clauses that could be problematic for the user

Make the language simple and accessible for non-lawyers.`;
  }

  // Function to break longer documents into sections
  function breakIntoSections(text, documentType) {
    const sections = [];
    
    // Common section headers for different document types
    const sectionPatterns = {
      lease: [
        /(?:section|article|clause)\s*\d+[^.]*?(?:rent|payment|deposit|term|maintenance|utilities|pet|sublet|termination)/i,
        /(?:rent|payment|deposit|term|maintenance|utilities|pet|sublet|termination)[^.]*?(?:section|article|clause)/i
      ],
      terms: [
        /(?:section|article|clause)\s*\d+[^.]*?(?:service|user|liability|privacy|termination|dispute)/i,
        /(?:service|user|liability|privacy|termination|dispute)[^.]*?(?:section|article|clause)/i
      ],
      privacy: [
        /(?:section|article|clause)\s*\d+[^.]*?(?:collection|use|sharing|retention|rights)/i,
        /(?:collection|use|sharing|retention|rights)[^.]*?(?:section|article|clause)/i
      ],
      agreement: [
        /(?:section|article|clause)\s*\d+[^.]*?(?:parties|performance|breach|remedies|governing)/i,
        /(?:parties|performance|breach|remedies|governing)[^.]*?(?:section|article|clause)/i
      ]
    };
    
    // If document is very long (>5000 characters), try to break into sections
    if (text.length > 5000) {
      const patterns = sectionPatterns[documentType] || sectionPatterns.agreement;
      
      patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          const sectionStart = text.indexOf(matches[0]);
          if (sectionStart > 0) {
            sections.push({
              title: matches[0].substring(0, 100),
              content: text.substring(sectionStart, sectionStart + 1000),
              startIndex: sectionStart
            });
          }
        }
      });
    }
    
    return sections;
  }

  // Function to generate summary
  function generateSummary(text, documentType) {
    // First, try to detect actual document sections
    const detectedSections = detectDocumentSections(text);
    
    if (detectedSections.length > 0) {
      return detectedSections.map((section, index) => ({
        number: index + 1,
        content: createBulletPointSummary(section.content, documentType)
      }));
    }
    
    // Fallback: create sections from important sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const scoredSentences = sentences.map(sentence => ({
      text: sentence,
      score: calculateSentenceScore(sentence, documentType)
    }));
    
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(18, Math.max(12, Math.floor(sentences.length * 0.2))))
      .map(s => s.text);
    
    // Group into sections (2 sentences each) and convert to bullet points
    const sections = [];
    for (let i = 0; i < topSentences.length; i += 2) {
      const sectionSentences = topSentences.slice(i, i + 2);
      sections.push({
        number: Math.floor(i / 2) + 1,
        content: createBulletPointSummary(sectionSentences.join('. '), documentType)
      });
    }
    
    console.log('Fallback sections created:', sections.length);
    return sections;
  }

  // Function to detect actual document sections
  function detectDocumentSections(text) {
    const sections = [];
    
    // Split text into lines for better analysis
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Enhanced section patterns for terms of service (including Spotify format)
    const sectionPatterns = [
      // Pattern 1: "1. Section Title" or "1 Section Title"
      /^(\d+)[\.\s]+(.+)$/,
      // Pattern 2: "Section 1:" or "Article 1:"
      /(?:section|article|clause)\s*(\d+)[:\s]+(.+)$/i,
      // Pattern 3: "1.1" or "1.2" subsections
      /^(\d+\.\d+)[\.\s]+(.+)$/,
      // Pattern 4: "Part 1" or "Chapter 1"
      /(?:part|chapter)\s*(\d+)[:\s]+(.+)$/i,
      // Pattern 5: Just numbers at start of line
      /^(\d+)[\.\s]+(.+)$/
    ];
    
    // Check each line for section patterns
    lines.forEach((line, index) => {
      sectionPatterns.forEach(pattern => {
        const match = line.match(pattern);
        if (match) {
          const sectionNumber = parseInt(match[1].replace('.', ''));
          const sectionContent = match[2].trim();
          
          // Filter out very short content and ensure it looks like a section title
          if (sectionContent.length > 10 && sectionContent.length < 200 && 
              !sectionContent.includes('http') && 
              !sectionContent.match(/^\d+$/) &&
              sectionNumber <= 20) { // Reasonable section number limit
            
            // Get content for this section (collect more content)
            let sectionText = sectionContent;
            let contentLines = 0;
            
            // Collect content until we hit another section or run out of lines
            for (let i = index + 1; i < lines.length && contentLines < 15; i++) {
              const nextLine = lines[i];
              
              // Stop if we hit another section header
              if (nextLine.match(/^\d+[\.\s]/) || nextLine.match(/^(?:section|article|clause|part|chapter)\s*\d+/i)) {
                break;
              }
              
              // Add meaningful content
              if (nextLine.length > 10) {
                sectionText += ' ' + nextLine;
                contentLines++;
              }
            }
            
            sections.push({
              number: sectionNumber,
              content: sectionText // No length limit - keep full content
            });
          }
        }
      });
    });
    
    // Remove duplicates and sort by section number
    const uniqueSections = sections.filter((section, index, self) => 
      index === self.findIndex(s => s.number === section.number)
    ).sort((a, b) => a.number - b.number);
    
    console.log('Detected sections:', uniqueSections.length, uniqueSections);
    
    // If we found sections, return them; otherwise return empty array for fallback
    return uniqueSections.length > 0 ? uniqueSections : [];
  }

  // Function to create sentence summary (no bullet points)
  function createBulletPointSummary(text, documentType) {
    // Clean the text first
    let cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Split into sentences more carefully
    const sentences = cleanText.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 300)
      .slice(0, 8); // Limit to first 8 sentences
    
    if (sentences.length === 0) {
      return "This section contains important terms and conditions that require careful review.";
    }
    
    // Extract the most important information
    const importantInfo = [];
    
    sentences.forEach(sentence => {
      // Look for key terms and extract meaningful content
      const keyTerms = ['payment', 'fee', 'cost', 'deadline', 'termination', 'liability', 
                       'obligation', 'responsibility', 'privacy', 'data', 'service', 
                       'agreement', 'contract', 'rights', 'restrictions', 'penalty'];
      
      const lowerSentence = sentence.toLowerCase();
      const hasKeyTerm = keyTerms.some(term => lowerSentence.includes(term));
      
      if (hasKeyTerm && sentence.length > 30) {
        // Clean up the sentence
        let cleanSentence = sentence
          .replace(/^[^a-zA-Z]*/, '') // Remove leading non-letters
          .replace(/[^a-zA-Z]*$/, '') // Remove trailing non-letters
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        if (cleanSentence.length > 20) {
          importantInfo.push(cleanSentence);
        }
      }
    });
    
    // If no key terms found, use the first few sentences
    if (importantInfo.length === 0) {
      importantInfo.push(...sentences.slice(0, 3).map(s => 
        s.replace(/^[^a-zA-Z]*/, '').replace(/[^a-zA-Z]*$/, '').trim()
      ).filter(s => s.length > 20));
    }
    
    // Create two well-formed sentences
    let sentence1 = "";
    let sentence2 = "";
    
    if (importantInfo.length >= 2) {
      // Take the first important point and make it a complete sentence
      const firstPoint = importantInfo[0];
      sentence1 = firstPoint.endsWith('.') ? firstPoint : firstPoint + '.';
      
      // Take the second important point and make it a complete sentence
      const secondPoint = importantInfo[1];
      sentence2 = secondPoint.endsWith('.') ? secondPoint : secondPoint + '.';
    } else if (importantInfo.length === 1) {
      // Use the one point we have
      const point = importantInfo[0];
      sentence1 = point.endsWith('.') ? point : point + '.';
      sentence2 = "This section contains important terms that require careful consideration.";
    } else {
      // Fallback
      sentence1 = "This section outlines key terms and conditions.";
      sentence2 = "Please review all details carefully before proceeding.";
    }
    
    // Ensure proper capitalization
    sentence1 = sentence1.charAt(0).toUpperCase() + sentence1.slice(1);
    sentence2 = sentence2.charAt(0).toUpperCase() + sentence2.slice(1);
    
    // Ensure sentences end with periods
    if (!sentence1.endsWith('.')) sentence1 += '.';
    if (!sentence2.endsWith('.')) sentence2 += '.';
    
    return sentence1 + ' ' + sentence2;
  }

  // Function to create concise bullet points
  function createConciseBulletPoint(sentence, documentType) {
    // Clean up the sentence first
    let cleanedSentence = sentence.trim();
    
    // Remove extra whitespace and clean up punctuation
    cleanedSentence = cleanedSentence.replace(/\s+/g, ' ');
    cleanedSentence = cleanedSentence.replace(/^[^a-zA-Z]*/, '').replace(/[^a-zA-Z]*$/, '');
    
    // For very long sentences, try to extract the most important part
    if (cleanedSentence.length > 200) {
      // Look for key phrases and extract around them
      const keyPhrases = ['payment', 'fee', 'cost', 'rent', 'deposit', 'termination', 
                         'liability', 'privacy', 'data', 'service', 'user', 'agreement',
                         'obligation', 'responsibility', 'deadline', 'penalty', 'refund'];
      
      for (const phrase of keyPhrases) {
        const phraseIndex = cleanedSentence.toLowerCase().indexOf(phrase);
        if (phraseIndex !== -1) {
          // Extract more context around the key phrase
          const start = Math.max(0, phraseIndex - 50);
          const end = Math.min(cleanedSentence.length, phraseIndex + phrase.length + 50);
          const context = cleanedSentence.substring(start, end).trim();
          
          // Clean up the context
          return context.replace(/^[^a-zA-Z]*/, '').replace(/[^a-zA-Z]*$/, '');
        }
      }
      
      // If no key phrase found, take the first meaningful part but make it longer
      const words = cleanedSentence.split(' ');
      if (words.length > 15) {
        return words.slice(0, 15).join(' ');
      }
    }
    
    return cleanedSentence;
  }
  
  // Function to extract additional key points
  function extractAdditionalPoints(text) {
    const keyPhrases = [
      'payment', 'fee', 'cost', 'price', 'subscription',
      'termination', 'cancellation', 'refund', 'liability',
      'privacy', 'data', 'personal information', 'account',
      'service', 'user', 'agreement', 'terms', 'conditions'
    ];
    
    const points = [];
    keyPhrases.forEach(phrase => {
      const regex = new RegExp(`[^.]*${phrase}[^.]*`, 'gi');
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        const match = matches[0].trim();
        if (match.length > 10 && match.length < 50) {
          // Clean up the match and make it concise
          const cleanMatch = match.replace(/^[^a-zA-Z]*/, '').replace(/[^a-zA-Z]*$/, '');
          points.push(cleanMatch);
        }
      }
    });
    
    return points.slice(0, 3);
  }

  // Function to calculate sentence importance score
  function calculateSentenceScore(sentence, documentType) {
    const lower = sentence.toLowerCase();
    let score = 0;
    
    // Legal importance keywords
    const legalKeywords = {
      high: ['agreement', 'terms', 'obligation', 'responsibility', 'liability', 'penalty', 'breach', 'termination', 'renewal', 'amendment'],
      medium: ['payment', 'fee', 'cost', 'deposit', 'refund', 'warranty', 'guarantee', 'dispute', 'arbitration', 'jurisdiction'],
      low: ['service', 'user', 'account', 'access', 'privacy', 'data', 'information', 'notification', 'contact']
    };
    
    // Score based on keyword importance
    Object.entries(legalKeywords).forEach(([level, keywords]) => {
      const multiplier = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
      keywords.forEach(keyword => {
        if (lower.includes(keyword)) score += multiplier;
      });
    });
    
    // Boost score for document type specific terms
    const documentSpecificTerms = {
      lease: ['rent', 'tenant', 'landlord', 'property', 'lease term', 'security deposit', 'maintenance', 'utilities'],
      terms: ['service', 'user agreement', 'account', 'usage', 'restrictions', 'prohibited', 'acceptable use'],
      privacy: ['personal information', 'data collection', 'cookies', 'tracking', 'third party', 'sharing'],
      agreement: ['contract', 'parties', 'consideration', 'performance', 'breach', 'remedies', 'governing law']
    };
    
    if (documentSpecificTerms[documentType]) {
      documentSpecificTerms[documentType].forEach(term => {
        if (lower.includes(term)) score += 2;
      });
    }
    
    // Boost score for sentences with numbers (dates, amounts, percentages)
    if (/\d+/.test(sentence)) score += 1;
    
    // Boost score for sentences with specific legal phrases
    const legalPhrases = ['shall be', 'must be', 'will be', 'is required', 'is obligated', 'is liable', 'is responsible'];
    legalPhrases.forEach(phrase => {
      if (lower.includes(phrase)) score += 1;
    });
    
    return score;
  }

  // Function to extract key points
  function extractKeyPoints(text, documentType) {
    const keyPoints = [];
    const lowerText = text.toLowerCase();
    
    // Enhanced key point extraction with specific patterns
    const keyPointPatterns = {
      lease: [
        { pattern: /rent[^.]*?(\$[\d,]+|\d+[^.]*dollars?)/i, description: 'Monthly rent amount and payment terms' },
        { pattern: /deposit[^.]*?(\$[\d,]+|\d+[^.]*dollars?)/i, description: 'Security deposit requirements' },
        { pattern: /lease[^.]*?term[^.]*?(\d+[^.]*months?|\d+[^.]*years?)/i, description: 'Lease duration and renewal terms' },
        { pattern: /maintenance[^.]*?(responsibilit|obligation|duty)/i, description: 'Maintenance responsibilities' },
        { pattern: /utilities[^.]*?(included|excluded|separate)/i, description: 'Utility payment responsibilities' },
        { pattern: /pet[^.]*?(allowed|prohibited|deposit|fee)/i, description: 'Pet policy and restrictions' },
        { pattern: /sublet[^.]*?(allowed|prohibited|permission)/i, description: 'Subletting and assignment rights' }
      ],
      terms: [
        { pattern: /service[^.]*?(description|scope|provided)/i, description: 'Service description and scope' },
        { pattern: /user[^.]*?(obligation|responsibilit|restriction)/i, description: 'User obligations and restrictions' },
        { pattern: /liability[^.]*?(limit|exclusion|disclaimer)/i, description: 'Limitation of liability' },
        { pattern: /termination[^.]*?(account|service|agreement)/i, description: 'Account termination conditions' },
        { pattern: /intellectual[^.]*?(property|copyright|trademark)/i, description: 'Intellectual property rights' },
        { pattern: /acceptable[^.]*?(use|behavior|conduct)/i, description: 'Acceptable use policy' }
      ],
      privacy: [
        { pattern: /personal[^.]*?(information|data)[^.]*?(collect|gather|obtain)/i, description: 'Personal information collection' },
        { pattern: /data[^.]*?(sharing|disclosure|third[^.]*party)/i, description: 'Data sharing and disclosure' },
        { pattern: /cookies[^.]*?(use|track|store)/i, description: 'Cookie usage and tracking' },
        { pattern: /privacy[^.]*?(rights|control|access)/i, description: 'Privacy rights and controls' },
        { pattern: /data[^.]*?(retention|storage|deletion)/i, description: 'Data retention and deletion' }
      ],
      agreement: [
        { pattern: /parties[^.]*?(agreement|contract)/i, description: 'Contracting parties and their roles' },
        { pattern: /consideration[^.]*?(\$[\d,]+|\d+[^.]*dollars?)/i, description: 'Payment and consideration terms' },
        { pattern: /performance[^.]*?(obligation|requirement|deliverable)/i, description: 'Performance obligations' },
        { pattern: /breach[^.]*?(remedy|damage|penalty)/i, description: 'Breach and remedies' },
        { pattern: /governing[^.]*?(law|jurisdiction|venue)/i, description: 'Governing law and jurisdiction' }
      ]
    };
    
    // Extract document-specific key points
    if (keyPointPatterns[documentType]) {
      keyPointPatterns[documentType].forEach(pattern => {
        if (pattern.pattern.test(text)) {
          keyPoints.push(pattern.description);
        }
      });
    }
    
    // Generic key points with enhanced patterns
    const genericPatterns = [
      { pattern: /payment[^.]*?(\$[\d,]+|\d+[^.]*dollars?)[^.]*?(due|monthly|annual)/i, description: 'Payment terms and methods' },
      { pattern: /refund[^.]*?(policy|condition|eligibility)/i, description: 'Refund and cancellation policy' },
      { pattern: /privacy[^.]*?(policy|protection|data)/i, description: 'Privacy and data handling' },
      { pattern: /dispute[^.]*?(resolution|arbitration|mediation)/i, description: 'Dispute resolution process' },
      { pattern: /automatic[^.]*?(renewal|extension|continuation)/i, description: 'Automatic renewal terms' },
      { pattern: /modification[^.]*?(amendment|change|update)/i, description: 'Modification and amendment rights' },
      { pattern: /force[^.]*?(majeure|circumstance|event)/i, description: 'Force majeure and unforeseen circumstances' },
      { pattern: /severability[^.]*?(clause|provision|invalidity)/i, description: 'Severability and invalidity provisions' }
    ];
    
    genericPatterns.forEach(pattern => {
      if (pattern.pattern.test(text) && !keyPoints.includes(pattern.description)) {
        keyPoints.push(pattern.description);
      }
    });
    
    // Extract specific dates and deadlines
    const datePatterns = [
      /due[^.]*?date[^.]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /deadline[^.]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /expir[^.]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
    ];
    
    datePatterns.forEach(pattern => {
      const match = text.match(pattern);
      if (match) {
        keyPoints.push(`Important deadline: ${match[1] || match[0]}`);
      }
    });
    
    return keyPoints;
  }

  // Function to process red flags
  function processRedFlags(redFlags, documentType) {
    const processedFlags = redFlags.map(flag => ({
      term: flag.term,
      context: flag.context,
      severity: getSeverity(flag.term, documentType),
      description: getRedFlagDescription(flag.term),
      suggestion: getRedFlagSuggestion(flag.term, flag.context, documentType)
    }));
    
    // Sort by severity: high first, then medium, then low
    return processedFlags.sort((a, b) => {
      const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  // Function to get severity level
  function getSeverity(term, documentType) {
    const highSeverityTerms = ['penalty', 'fee', 'charge', 'liability', 'termination', 'automatic renewal'];
    const mediumSeverityTerms = ['restriction', 'limitation', 'obligation', 'responsibility'];
    
    if (highSeverityTerms.some(t => term.includes(t))) return 'high';
    if (mediumSeverityTerms.some(t => term.includes(t))) return 'medium';
    return 'low';
  }

  // Function to get red flag description
  function getRedFlagDescription(term) {
    const descriptions = {
      'due date': 'Important deadline that must be met',
      'penalty': 'Financial penalty for non-compliance',
      'fee': 'Additional charges or costs',
      'liability': 'Legal responsibility and potential consequences',
      'automatic renewal': 'Contract will renew automatically without notice',
      'termination': 'Conditions for ending the agreement',
      'restriction': 'Limitations on your rights or usage',
      'privacy': 'How your personal data will be used'
    };
    
    return descriptions[term] || 'Important clause requiring attention';
  }

  // Function to get red flag suggestion
  function getRedFlagSuggestion(term, context, documentType) {
    const suggestions = {
      'due date': '⚠️ Set calendar reminders and ensure you meet this deadline to avoid penalties.',
      'deadline': '⚠️ Mark this date in your calendar and prepare necessary actions in advance.',
      'expiration': '⚠️ Track this expiration date closely to avoid automatic renewals or penalties.',
      'penalty': '💰 This could result in financial loss. Consider negotiating or avoiding this clause.',
      'fee': '💰 Additional costs may apply. Budget for these expenses or negotiate removal.',
      'charge': '💰 You may be charged extra. Review if this is necessary for your needs.',
      'cost': '💰 Financial implications exist. Ensure this aligns with your budget.',
      'payment': '💰 Payment obligations exist. Understand the terms and amounts involved.',
      'fine': '💰 Financial penalties possible. Consider the risk vs. benefit of this agreement.',
      'liability': '⚖️ You may be held legally responsible. Consider liability insurance or negotiation.',
      'responsibility': '⚖️ Legal obligations exist. Ensure you can fulfill these requirements.',
      'obligation': '⚖️ You have binding duties. Make sure you can meet these commitments.',
      'termination': '🚪 Understand how to end this agreement. Check notice requirements and penalties.',
      'cancellation': '🚪 Review cancellation terms carefully. Some may have fees or restrictions.',
      'automatic renewal': '🔄 Contract renews automatically. Set reminders to cancel if needed.',
      'auto-renew': '🔄 Automatic renewal active. Monitor renewal dates to avoid unwanted charges.',
      'subscription': '🔄 Recurring charges apply. Track billing cycles and cancellation policies.',
      'recurring': '🔄 Ongoing charges exist. Monitor your account for unexpected fees.',
      'restriction': '🚫 Limitations on your rights. Ensure these don\'t conflict with your needs.',
      'limitation': '🚫 Your rights are limited. Consider if these restrictions are acceptable.',
      'prohibition': '🚫 Certain actions are forbidden. Make sure you can comply.',
      'exclusion': '🚫 Some protections are excluded. Consider additional coverage if needed.',
      'privacy': '🔒 Your data usage is defined. Review what information is collected and shared.',
      'data': '🔒 Personal information handling. Understand how your data is used and protected.',
      'personal information': '🔒 Data collection terms. Ensure you\'re comfortable with data sharing.',
      'arbitration': '⚖️ Disputes resolved through arbitration. You may lose right to court.',
      'legal action': '⚖️ Legal proceedings possible. Understand your rights and potential costs.',
      'litigation': '⚖️ Court proceedings may occur. Consider legal representation costs.',
      'dispute resolution': '⚖️ Conflict resolution process. Understand your options and costs.',
      'warranty': '📋 Service guarantees exist. Understand what\'s covered and excluded.',
      'guarantee': '📋 Promises made by provider. Ensure these meet your expectations.',
      'refund': '💸 Return policy defined. Understand refund conditions and timelines.',
      'return': '💸 Return terms specified. Check if return conditions work for you.',
      'modification': '📝 Agreement can be changed. Understand how changes are communicated.',
      'amendment': '📝 Contract modifications possible. Monitor for changes that affect you.',
      'change': '📝 Terms may be updated. Stay informed about modifications.',
      'update': '📝 Agreement updates occur. Review changes to ensure they\'re acceptable.'
    };
    
    // Try to find a specific suggestion for the term
    const lowerTerm = term.toLowerCase();
    for (const [key, suggestion] of Object.entries(suggestions)) {
      if (lowerTerm.includes(key)) {
        return suggestion;
      }
    }
    
    // Default suggestion based on severity
    return '⚠️ This clause requires careful review. Consider consulting with a professional if unclear.';
  }

  // Function to generate consent checklist
  function generateConsentChecklist(keyPoints, redFlags, documentType) {
    const checklist = [];
    const usedTerms = new Set();
    
    // Add only high and medium severity red flags as checklist items (most important)
    redFlags.forEach(flag => {
      if (flag.severity === 'high' || flag.severity === 'medium') {
        const conciseText = createConciseConsentText(flag.term, flag.severity);
        if (!usedTerms.has(flag.term.toLowerCase())) {
          checklist.push({
            text: conciseText,
            isRedFlag: true,
            severity: flag.severity,
            context: flag.context
          });
          usedTerms.add(flag.term.toLowerCase());
        }
      }
    });
    
    // Add a few key points if we have space (limit to 3 most important)
    const importantKeyPoints = keyPoints.slice(0, 3);
    importantKeyPoints.forEach(point => {
      const concisePoint = createConciseKeyPointText(point);
      checklist.push({
        text: concisePoint,
        isRedFlag: false
      });
    });
    
    return checklist;
  }

  // Function to create concise consent text for red flags
  function createConciseConsentText(term, severity) {
    const conciseTexts = {
      'due date': 'I understand the deadline requirements and the consequences of missing them',
      'deadline': 'I understand the deadline requirements and the consequences of missing them',
      'expiration': 'I understand the expiration terms and what happens when they expire',
      'penalty': 'I acknowledge potential penalties and financial consequences for non-compliance',
      'fee': 'I understand additional fees may apply and will be charged to my account',
      'charge': 'I acknowledge potential charges that may be applied to my payment method',
      'cost': 'I understand the cost implications and total financial commitment required',
      'payment': 'I understand payment obligations and the consequences of late or missed payments',
      'fine': 'I acknowledge potential fines and penalties for violating the agreement terms',
      'liability': 'I understand liability implications and my legal responsibility for damages',
      'responsibility': 'I acknowledge my responsibilities and obligations under this agreement',
      'obligation': 'I understand my obligations and the legal consequences of not fulfilling them',
      'termination': 'I understand termination terms and the process for ending this agreement',
      'cancellation': 'I understand cancellation policies and any fees associated with cancellation',
      'automatic renewal': 'I understand automatic renewal terms and how to prevent unwanted renewals',
      'auto-renew': 'I understand automatic renewal terms and how to prevent unwanted renewals',
      'subscription': 'I understand subscription terms and recurring billing cycles',
      'recurring': 'I understand recurring charges and how they will be processed',
      'restriction': 'I understand usage restrictions and limitations on my rights',
      'limitation': 'I understand limitations on my rights and available remedies',
      'prohibition': 'I understand prohibited actions and the consequences of violating them',
      'exclusion': 'I understand exclusions and what is not covered by this agreement',
      'privacy': 'I understand privacy terms and how my personal information will be used',
      'data': 'I understand data handling practices and how my information is processed',
      'personal information': 'I understand data collection practices and third-party sharing policies',
      'arbitration': 'I understand arbitration terms and that I may lose the right to court proceedings',
      'legal action': 'I understand legal implications and potential court proceedings',
      'litigation': 'I understand litigation terms and the costs associated with legal disputes',
      'dispute resolution': 'I understand dispute resolution processes and available options',
      'warranty': 'I understand warranty terms and what is covered or excluded',
      'guarantee': 'I understand guarantee terms and the limitations of service promises',
      'refund': 'I understand refund policies and the conditions for receiving money back',
      'return': 'I understand return terms and any fees or conditions for returns',
      'modification': 'I understand modification rights and how changes will be communicated',
      'amendment': 'I understand amendment terms and how the agreement can be changed',
      'change': 'I understand change policies and notification requirements for updates',
      'update': 'I understand update terms and how modifications will be implemented'
    };
    
    const lowerTerm = term.toLowerCase();
    for (const [key, text] of Object.entries(conciseTexts)) {
      if (lowerTerm.includes(key)) {
        return text;
      }
    }
    
    return `I understand the ${term} terms and their implications`;
  }

  // Function to create concise key point text
  function createConciseKeyPointText(point) {
    // Extract the most important part of the key point
    const words = point.split(' ');
    if (words.length > 8) {
      return `I understand: ${words.slice(0, 8).join(' ')}`;
    }
    return `I understand: ${point}`;
  }

  // Function to calculate contract binding/ethical rating (1-10)
  function calculateContractRating(text, redFlags, documentType) {
    let score = 10; // Start with perfect score
    const lowerText = text.toLowerCase();
    
    // High severity red flags (major deductions)
    const highSeverityTerms = [
      'automatic renewal', 'auto-renew', 'binding arbitration', 'class action waiver',
      'liquidated damages', 'penalty clause', 'excessive late fees', 'unilateral modification',
      'data selling', 'third party sharing', 'no refund', 'no cancellation',
      'forced arbitration', 'waiver of rights', 'indemnification', 'hold harmless'
    ];
    
    // Medium severity red flags (moderate deductions)
    const mediumSeverityTerms = [
      'liability limitation', 'disclaimer of warranty', 'limited liability',
      'termination fees', 'cancellation fees', 'modification rights',
      'privacy policy changes', 'terms changes', 'service interruption',
      'data collection', 'tracking', 'cookies', 'personal information'
    ];
    
    // Low severity red flags (minor deductions)
    const lowSeverityTerms = [
      'terms of service', 'user agreement', 'acceptable use', 'prohibited use',
      'account suspension', 'content removal', 'service availability',
      'technical support', 'maintenance', 'updates'
    ];
    
    // Check for high severity issues
    highSeverityTerms.forEach(term => {
      if (lowerText.includes(term)) {
        score -= 2; // Major deduction
      }
    });
    
    // Check for medium severity issues
    mediumSeverityTerms.forEach(term => {
      if (lowerText.includes(term)) {
        score -= 1; // Moderate deduction
      }
    });
    
    // Check for low severity issues
    lowSeverityTerms.forEach(term => {
      if (lowerText.includes(term)) {
        score -= 0.5; // Minor deduction
      }
    });
    
    // Additional factors
    const redFlagCount = redFlags.length;
    if (redFlagCount > 10) score -= 1;
    if (redFlagCount > 20) score -= 1;
    
    // Check for positive indicators
    const positiveTerms = [
      'refund policy', 'cancellation rights', 'privacy protection',
      'data security', 'user rights', 'dispute resolution',
      'customer service', 'transparent pricing', 'fair use'
    ];
    
    positiveTerms.forEach(term => {
      if (lowerText.includes(term)) {
        score += 0.5; // Small bonus
      }
    });
    
    // Ensure score is between 1 and 10
    score = Math.max(1, Math.min(10, score));
    
    // Round to nearest 0.5
    score = Math.round(score * 2) / 2;
    
    return {
      score: score,
      description: getRatingDescription(score),
      color: getRatingColor(score)
    };
  }

  // Function to get rating description
  function getRatingDescription(score) {
    if (score >= 9) return 'Excellent - Very fair and transparent';
    if (score >= 8) return 'Very Good - Generally fair terms';
    if (score >= 7) return 'Good - Mostly reasonable terms';
    if (score >= 6) return 'Fair - Some concerns but acceptable';
    if (score >= 5) return 'Average - Mixed terms, proceed with caution';
    if (score >= 4) return 'Below Average - Several concerning terms';
    if (score >= 3) return 'Poor - Many problematic clauses';
    if (score >= 2) return 'Very Poor - Highly restrictive terms';
    return 'Extremely Poor - Avoid if possible';
  }

  // Function to get rating color
  function getRatingColor(score) {
    if (score >= 8) return '#2ed573'; // Green
    if (score >= 6) return '#ffa502'; // Orange
    if (score >= 4) return '#ff6348'; // Red-orange
    return '#ff4757'; // Red
  }


  // Function to display contract rating on main page
  function displayContractRating(contractRating) {
    ratingScoreMain.textContent = `${contractRating.score}/10`;
    ratingScoreMain.style.color = contractRating.color;
    ratingDescriptionMain.textContent = contractRating.description;
  }


  // Function to display results
  function displayResults(analysis) {
    hideLoading();
    
    // Display analysis source indicator
    const sourceIndicator = analysis.source === 'openai' ? 
      '<div class="source-indicator openai">🤖 Powered by OpenAI GPT-4</div>' : 
      '<div class="source-indicator local">⚡ Local Analysis</div>';
    
    // Display contract rating on main page
    displayContractRating(analysis.contractRating);
    
    // Display summary with source and sections (excluding sections 8 and 9)
    const summaryHtml = sourceIndicator + 
      analysis.summary
        .filter(section => section.number !== 8 && section.number !== 9)
        .map(section => 
          `<div class="summary-section-item">
            <h4 class="section-header collapsible-header" data-target="section-${section.number}-content">
              Section ${section.number}
              <span class="collapse-icon">▼</span>
              <a href="#" class="section-link" data-section="${section.number}" onclick="event.stopPropagation();">
                Jump to Section
              </a>
            </h4>
            <div id="section-${section.number}-content" class="section-content collapsible-content collapsed">
              ${section.content}
            </div>
          </div>`
        ).join('');
    
    document.getElementById('summary').innerHTML = summaryHtml;
    
    // Add event listeners for section links
    addSectionLinkListeners();
    
    // Add event listeners for collapsible section headers
    addSectionHeaderListeners();
    
    // Display key points
    const keyPointsHtml = analysis.keyPoints.map(point => 
      `<div class="key-point">• ${point}</div>`
    ).join('');
    document.getElementById('keyPoints').innerHTML = keyPointsHtml;
    
    // Display red flags with severity indicators
    const redFlagsHtml = analysis.redFlags.map((flag, index) => 
      `<div class="red-flag-item ${flag.severity}-severity">
        <div class="severity-indicator ${flag.severity}">${flag.severity.toUpperCase()}</div>
        <div class="flag-content">
          <strong>${flag.term}</strong><br>
          <small>${flag.description}</small><br>
          <div class="suggestion">${flag.suggestion}</div>
          <em>Context: "${flag.context.substring(0, 100)}..."</em>
        </div>
      </div>`
    ).join('');
    document.getElementById('redFlags').innerHTML = redFlagsHtml;
    
    
    // Display consent checklist
    const checklistHtml = analysis.consentChecklist.map((item, index) => 
      `<div class="checkbox-item ${item.isRedFlag ? 'red-flag-item' : ''}">
        <input type="checkbox" id="consent-${index}" name="consent">
        <label for="consent-${index}">${item.text}</label>
      </div>`
    ).join('');
    document.getElementById('consentChecklist').innerHTML = checklistHtml;
    
    // Add submit button event listener
    document.getElementById('submitConsent').addEventListener('click', submitConsent);
    
    
    results.style.display = 'block';
  }

  // Function to submit consent
  function submitConsent() {
    const checkboxes = document.querySelectorAll('input[name="consent"]');
    const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);
    
    if (checkedBoxes.length === checkboxes.length) {
      alert('✅ Consent submitted successfully! You have acknowledged all key points and red flags.');
      // Close the extension after successful consent submission
      setTimeout(() => {
        window.close();
      }, 1000); // Wait 1 second to allow user to see the confirmation
    } else {
      alert('⚠️ Please review and check all items before submitting consent.');
    }
  }

  // Utility functions
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

  function highlightImportantTerms(text) {
    const importantTerms = [
      // High priority red flags
      'due date', 'deadline', 'expiration', 'termination', 'breach',
      'penalty', 'fee', 'charge', 'cost', 'payment', 'fine',
      'liability', 'responsibility', 'obligation', 'indemnification',
      'restriction', 'limitation', 'prohibition', 'exclusion',
      'automatic renewal', 'auto-renew', 'subscription', 'recurring',
      'arbitration', 'legal action', 'litigation', 'dispute resolution',
      
      // Medium priority red flags
      'warranty', 'guarantee', 'refund', 'return', 'cancellation',
      'modification', 'amendment', 'change', 'update',
      'privacy', 'data', 'personal information', 'confidential',
      'intellectual property', 'copyright', 'trademark', 'patent',
      'force majeure', 'act of god', 'unforeseen circumstances',
      'severability', 'invalidity', 'unenforceable',
      
      // Financial red flags
      'interest rate', 'late fee', 'overdue', 'default',
      'collateral', 'security', 'lien', 'mortgage',
      'tax', 'withholding', 'deduction', 'exemption',
      
      // Legal red flags
      'governing law', 'jurisdiction', 'venue', 'choice of law',
      'waiver', 'release', 'disclaimer', 'limitation of liability',
      'consequential damages', 'punitive damages', 'liquidated damages',
      'injunctive relief', 'specific performance', 'equitable relief'
    ];

    const redFlags = [];
    const lowerText = text.toLowerCase();

    importantTerms.forEach(term => {
      if (lowerText.includes(term)) {
        redFlags.push({
          term: term,
          context: extractContext(text, term),
          severity: getTermSeverity(term)
        });
      }
    });

    // Remove duplicates and sort by severity
    const uniqueRedFlags = redFlags.filter((flag, index, self) => 
      index === self.findIndex(f => f.term === flag.term)
    );
    
    return uniqueRedFlags.sort((a, b) => {
      const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  function getTermSeverity(term) {
    const highSeverityTerms = [
      'penalty', 'fee', 'charge', 'fine', 'liability', 'breach', 'termination',
      'automatic renewal', 'arbitration', 'legal action', 'indemnification'
    ];
    
    const mediumSeverityTerms = [
      'restriction', 'limitation', 'prohibition', 'warranty', 'guarantee',
      'privacy', 'data', 'intellectual property', 'force majeure'
    ];
    
    if (highSeverityTerms.some(t => term.includes(t))) return 'high';
    if (mediumSeverityTerms.some(t => term.includes(t))) return 'medium';
    return 'low';
  }

  function extractContext(text, term, contextLength = 100) {
    const index = text.toLowerCase().indexOf(term);
    if (index === -1) return '';

    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + term.length + contextLength);
    
    return text.substring(start, end).trim();
  }

  function showLoading() {
    loading.style.display = 'block';
    results.style.display = 'none';
    error.style.display = 'none';
  }

  function hideLoading() {
    loading.style.display = 'none';
  }

  function showError(message) {
    hideLoading();
    errorMessage.textContent = message;
    error.style.display = 'block';
    results.style.display = 'none';
  }

})();
