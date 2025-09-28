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
  const readFileBtn = document.getElementById('readFile');
  const fileInputContainer = document.getElementById('fileInputContainer');
  const fileInput = document.getElementById('fileInput');
  const analyzeFileBtn = document.getElementById('analyzeFile');
  const loading = document.getElementById('loading');
  const results = document.getElementById('results');
  const error = document.getElementById('error');
  const errorMessage = document.getElementById('errorMessage');
  
  // API status elements
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');

  // Event listeners
  readPageBtn.addEventListener('click', () => readPageText());
  readSelectedBtn.addEventListener('click', () => readSelectedText());
  readCopiedBtn.addEventListener('click', () => readCopiedText());
  readFileBtn.addEventListener('click', () => toggleFileInput());
  analyzeFileBtn.addEventListener('click', () => analyzeFile());
  
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

  // Make jumpToSection globally available
  window.jumpToSection = jumpToSection;
  
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

  // Function to toggle file input
  function toggleFileInput() {
    fileInputContainer.style.display = fileInputContainer.style.display === 'none' ? 'block' : 'none';
  }

  // Function to analyze uploaded file
  async function analyzeFile() {
    const file = fileInput.files[0];
    if (!file) {
      showError('Please select a file first.');
      return;
    }

    showLoading();
    
    try {
      const text = await readFileContent(file);
      const documentData = {
        text: text,
        documentType: detectDocumentType(text),
        redFlags: highlightImportantTerms(text),
        url: file.name,
        title: file.name
      };
      
      currentDocumentData = documentData;
      await analyzeDocument(documentData);
    } catch (err) {
      showError('Error reading file. Please try a different file.');
    }
  }

  // Function to read file content
  function readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
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
        return await performOpenAIAnalysis(text, documentType);
      } catch (err) {
        console.log('OpenAI analysis failed, falling back to local analysis:', err);
        updateApiStatus('error', 'API analysis failed, using local analysis');
      }
    }
    
    // Fallback to local analysis
    return await performLocalAnalysis(documentData);
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
            
            // Get content for this section (next few lines)
            let sectionText = sectionContent;
            for (let i = index + 1; i < Math.min(index + 5, lines.length); i++) {
              const nextLine = lines[i];
              if (nextLine.length > 20 && !nextLine.match(/^\d+[\.\s]/)) {
                sectionText += ' ' + nextLine;
              } else {
                break;
              }
            }
            
            sections.push({
              number: sectionNumber,
              content: sectionText.substring(0, 300) // Limit content length
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

  // Function to create bullet point summary
  function createBulletPointSummary(text, documentType) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Extract key points and convert to bullet format
    const keyPoints = [];
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 15) {
        // Extract the most important part of the sentence
        const words = trimmed.split(' ');
        if (words.length > 6) {
          // Take first 6 words and add ellipsis
          keyPoints.push(words.slice(0, 6).join(' ') + '...');
        } else {
          keyPoints.push(trimmed);
        }
      }
    });
    
    // Limit to 3 bullet points per section
    const bullets = keyPoints.slice(0, 3).map(point => `• ${point}`);
    
    // If we have fewer than 3 bullets, try to create more from the text
    if (bullets.length < 3) {
      const additionalPoints = extractAdditionalPoints(text);
      bullets.push(...additionalPoints.slice(0, 3 - bullets.length));
    }
    
    return bullets.join('<br>');
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
          points.push(`• ${match}...`);
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
    return redFlags.map(flag => ({
      term: flag.term,
      context: flag.context,
      severity: getSeverity(flag.term, documentType),
      description: getRedFlagDescription(flag.term)
    }));
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

  // Function to generate consent checklist
  function generateConsentChecklist(keyPoints, redFlags, documentType) {
    const checklist = [];
    
    // Add key points as checklist items
    keyPoints.forEach(point => {
      checklist.push({
        text: `I understand: ${point}`,
        isRedFlag: false
      });
    });
    
    // Add red flags as checklist items
    redFlags.forEach(flag => {
      checklist.push({
        text: `I acknowledge: ${flag.description}`,
        isRedFlag: true,
        context: flag.context
      });
    });
    
    return checklist;
  }

  // Function to display results
  function displayResults(analysis) {
    hideLoading();
    
    // Display analysis source indicator
    const sourceIndicator = analysis.source === 'openai' ? 
      '<div class="source-indicator openai">🤖 Powered by OpenAI GPT-4</div>' : 
      '<div class="source-indicator local">⚡ Local Analysis</div>';
    
    // Display summary with source and sections
    const summaryHtml = sourceIndicator + 
      analysis.summary.map(section => 
        `<div class="summary-section-item">
          <h4>
            Section ${section.number}
            <a href="#" class="section-link" data-section="${section.number}">
              Jump to Section
            </a>
          </h4>
          <div class="section-content">${section.content}</div>
        </div>`
      ).join('');
    
    document.getElementById('summary').innerHTML = summaryHtml;
    
    // Add event listeners for section links
    addSectionLinkListeners();
    
    // Display key points
    const keyPointsHtml = analysis.keyPoints.map(point => 
      `<div class="key-point">• ${point}</div>`
    ).join('');
    document.getElementById('keyPoints').innerHTML = keyPointsHtml;
    
    // Display red flags with severity indicators
    const redFlagsHtml = analysis.redFlags.map(flag => 
      `<div class="red-flag-item ${flag.severity}-severity">
        <div class="severity-indicator ${flag.severity}">${flag.severity.toUpperCase()}</div>
        <div class="flag-content">
          <strong>${flag.term}</strong><br>
          <small>${flag.description}</small><br>
          <em>Context: "${flag.context.substring(0, 100)}..."</em>
        </div>
      </div>`
    ).join('');
    document.getElementById('redFlags').innerHTML = redFlagsHtml;
    
    // Display sections if available (for longer documents)
    if (analysis.sections && analysis.sections.length > 0) {
      const sectionsHtml = `
        <div class="sections-section">
          <h3>📑 Document Sections</h3>
          <div class="sections-content">
            ${analysis.sections.map((section, index) => 
              `<div class="section-item">
                <h4>Section ${index + 1}: ${section.title}</h4>
                <p>${section.content.substring(0, 200)}...</p>
              </div>`
            ).join('')}
          </div>
        </div>
      `;
      
      // Insert sections before consent section
      const consentSection = document.querySelector('.consent-section');
      consentSection.insertAdjacentHTML('beforebegin', sectionsHtml);
    }
    
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
