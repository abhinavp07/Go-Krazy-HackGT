# SignSmarter Extension Setup Guide

## 🔑 Adding Your OpenAI API Key

To enable OpenAI GPT-4 analysis for all users, follow these steps:

### Step 1: Get Your OpenAI API Key
1. Go to https://platform.openai.com/
2. Sign up or log in to your account
3. Navigate to https://platform.openai.com/api-keys
4. Click "Create new secret key"
5. Copy the key (it starts with `sk-`)

### Step 2: Configure the Extension
1. Open the `config.js` file in your project
2. Replace `'YOUR_API_KEY_HERE'` with your actual API key:

```javascript
const CONFIG = {
  // OpenAI API Configuration
  OPENAI_API_KEY: 'sk-your-actual-api-key-here',
  
  // API Settings
  OPENAI_MODEL: 'gpt-4',
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.3,
  
  // Analysis Settings
  MAX_TEXT_LENGTH: 8000,
  ENABLE_OPENAI_ANALYSIS: true,
  FALLBACK_TO_LOCAL: true
};
```

### Step 3: Load the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the SignSmarter folder

### Step 4: Test the Extension
1. Click the SignSmarter extension icon
2. You should see "🟢 OpenAI GPT-4 analysis enabled"
3. Try analyzing a document to test the integration

## 💰 Cost Management

- **Estimated cost**: $0.03-0.06 per document analysis
- **Monitor usage**: Check your OpenAI dashboard regularly
- **Set limits**: Consider setting usage limits in your OpenAI account

## 🔒 Security Notes

- **Keep your API key private**: Don't share the config.js file publicly
- **Monitor usage**: Watch for unexpected API calls
- **Consider rate limits**: OpenAI has rate limits that may affect high usage

## 🚀 Features Enabled

With your API key configured, users will get:
- **GPT-4 powered analysis** of legal documents
- **Advanced red flag detection**
- **Comprehensive summarization**
- **Intelligent key point extraction**
- **Automatic fallback** to local analysis if API fails

## 📝 Configuration Options

You can modify these settings in `config.js`:

- `OPENAI_MODEL`: Change to 'gpt-3.5-turbo' for lower costs
- `MAX_TOKENS`: Adjust response length (higher = more detailed)
- `TEMPERATURE`: Control creativity (0.1 = more focused, 0.7 = more creative)
- `MAX_TEXT_LENGTH`: Maximum document length to analyze

## 🆘 Troubleshooting

**Extension shows "API key not configured":**
- Check that you replaced `'YOUR_API_KEY_HERE'` with your actual key
- Ensure the key starts with `sk-`

**API calls failing:**
- Verify your API key is valid
- Check your OpenAI account has sufficient credits
- Ensure you have access to GPT-4 (or change to GPT-3.5-turbo)

**High costs:**
- Reduce `MAX_TOKENS` in config.js
- Switch to `gpt-3.5-turbo` model
- Set usage limits in your OpenAI account
