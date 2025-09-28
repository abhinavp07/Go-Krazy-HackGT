# SignSmarter Chrome Extension

A Chrome extension that intelligently reads and summarizes documents, highlighting key points and red flags to help users make informed decisions before signing agreements.

## Features

### 📄 Multiple Reading Methods
- **Read Current Page**: Analyzes the entire webpage content
- **Read Selected Text**: Analyzes only the text you've selected
- **Read Copied Text**: Analyzes text from your clipboard
- **Upload File**: Upload and analyze text files (.txt, .pdf, .doc, .docx)

### 🧠 Smart Analysis
- **Document Summarization**: Condenses long documents into easy-to-understand summaries
- **Key Points Extraction**: Identifies important clauses and terms
- **Red Flag Detection**: Highlights critical information that requires attention
- **Document Type Recognition**: Automatically detects lease agreements, terms of service, privacy policies, etc.

### 🚨 Red Flag Detection
The extension identifies important clauses such as:
- Due dates and deadlines
- Penalties and fees
- Liability and responsibility clauses
- Automatic renewal terms
- Privacy and data handling
- Termination conditions
- Dispute resolution processes

### ✅ Interactive Consent Checklist
- Converts complex legal language into simple checkboxes
- Requires acknowledgment of all key points and red flags
- Prevents accidental consent without proper review

## Installation

### Method 1: Load as Unpacked Extension (Development)

1. **Download the Extension**
   - Download or clone this repository to your local machine

2. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the SignSmarter folder containing the extension files
   - The extension should now appear in your extensions list

4. **Pin the Extension**
   - Click the puzzle piece icon in Chrome toolbar
   - Find SignSmarter and click the pin icon to keep it visible

### Method 2: Install from Chrome Web Store (Coming Soon)
*This extension will be published to the Chrome Web Store for easy installation.*

## Usage

### Step 1: Choose Your Reading Method
1. Click the SignSmarter extension icon in your browser toolbar
2. Select one of four reading options:
   - **📄 Read Current Page**: For analyzing the entire webpage
   - **✂️ Read Selected Text**: For analyzing highlighted text
   - **📋 Read Copied Text**: For analyzing clipboard content
   - **📁 Upload File**: For analyzing uploaded documents

### Step 2: Review the Analysis
The extension will automatically:
- Generate a summary of the document
- Extract key points requiring your attention
- Identify red flags and important clauses
- Create an interactive consent checklist

### Step 3: Complete the Consent Process
1. Review all key points and red flags
2. Check all boxes in the consent checklist
3. Click "Submit Consent" when you've reviewed everything
4. You'll receive confirmation of your consent submission

## Document Types Supported

- **Lease Agreements**: Rent, deposits, maintenance responsibilities
- **Terms of Service**: User obligations, liability limitations
- **Privacy Policies**: Data handling, personal information usage
- **General Contracts**: Payment terms, dispute resolution
- **Any Legal Document**: Comprehensive analysis for any text-based agreement

## Privacy & Security

- **No Data Storage**: The extension doesn't store your documents or personal information
- **Local Processing**: All analysis happens locally in your browser
- **No External Servers**: No data is sent to external services
- **Clipboard Access**: Only used when you explicitly choose "Read Copied Text"

## Technical Details

### Files Structure
```
SignSmarter/
├── manifest.json          # Extension configuration
├── popup.html             # Main UI interface
├── popup.css              # Styling and layout
├── popup.js               # Main functionality logic
├── content.js             # Page content extraction
├── background.js          # Background service worker
└── README.md              # This documentation
```

### Permissions Used
- `activeTab`: To read content from the current webpage
- `storage`: To save user preferences (if needed)
- `clipboardRead`: To read copied text when requested
- `<all_urls>`: To work on any website

## Troubleshooting

### Extension Not Working?
1. **Refresh the page** and try again
2. **Check if the page has text content** (some pages may be image-only)
3. **Ensure you have selected text** when using "Read Selected Text"
4. **Verify clipboard access** when using "Read Copied Text"

### Analysis Not Accurate?
- The extension works best with **structured legal documents**
- **Longer documents** provide better analysis results
- **Clear, readable text** produces more accurate summaries

### File Upload Issues?
- Supported formats: `.txt`, `.pdf`, `.doc`, `.docx`
- Ensure the file contains **readable text content**
- **Large files** may take longer to process

## Contributing

This extension is open source. Feel free to:
- Report bugs or issues
- Suggest new features
- Submit pull requests
- Improve the analysis algorithms

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, questions, or feature requests, please:
1. Check the troubleshooting section above
2. Create an issue in the project repository
3. Contact the development team

---

**Disclaimer**: This extension is designed to help users understand documents better, but it should not replace professional legal advice. Always consult with qualified professionals for important legal matters.
