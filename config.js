// Configuration file for SignSmarter extension
// Replace 'YOUR_API_KEY_HERE' with your actual OpenAI API key

const CONFIG = {
  // OpenAI API Configuration
  OPENAI_API_KEY: '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',
  
  // API Settings
  OPENAI_MODEL: 'gpt-4',
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.3,
  
  // Analysis Settings
  MAX_TEXT_LENGTH: 8000,
  ENABLE_OPENAI_ANALYSIS: true,
  FALLBACK_TO_LOCAL: true
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
