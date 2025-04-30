export const config = {
  scrapingBeeApiKey: process.env.REACT_APP_SCRAPINGBEE_API_KEY
};

// Validate required configuration
if (!config.scrapingBeeApiKey) {
  console.error('Missing required environment variable: REACT_APP_SCRAPINGBEE_API_KEY');
  console.error('Please create a .env file in the frontend directory with your ScrapingBee API key');
  console.error('Example: REACT_APP_SCRAPINGBEE_API_KEY=your_api_key_here');
} 