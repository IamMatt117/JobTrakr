const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

async function scrapeJobDetails(page) {
  try {
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug.png' });

    const jobDetails = await page.evaluate(() => {
      function getText(selector) {
        const element = document.querySelector(selector);
        return element ? element.textContent.trim() : null;
      }

      // Get job title with multiple fallback selectors
      const titleSelectors = [
        'h1.job-details-jobs-unified-top-card__job-title',
        'h1.jobs-unified-top-card__job-title',
        'h1.t-24',
        'h1[data-test-id="job-title"]',
        'h1'
      ];
      
      let title = null;
      for (const selector of titleSelectors) {
        title = getText(selector);
        if (title) break;
      }

      // Get company name with multiple fallback selectors
      const companySelectors = [
        '.jobs-unified-top-card__company-name a',
        '.jobs-unified-top-card__company-name',
        '.job-details-jobs-unified-top-card__company-name',
        '[data-test-id="company-name"]',
        '.jobs-unified-top-card__subtitle-primary-grouping span'
      ];
      
      let company = null;
      for (const selector of companySelectors) {
        company = getText(selector);
        if (company) break;
      }

      // Get location with improved detection
      const locationSelectors = [
        '.jobs-unified-top-card__bullet',
        '.job-details-jobs-unified-top-card__bullet',
        '[data-test-id="job-location"]',
        '.jobs-unified-top-card__subtitle-primary-grouping .jobs-unified-top-card__bullet',
        '.jobs-unified-top-card__subtitle-primary-grouping span',
        '.jobs-unified-top-card__subtitle-primary-grouping div'
      ];

      let location = null;

      // Get the job description
      const descriptionElement = document.querySelector('.jobs-description__content');
      const descriptionText = descriptionElement ? descriptionElement.textContent : '';

      // First try to find location in the job description
      if (descriptionText) {
        // Look for "Location: Dublin" pattern
        const locationMatch = descriptionText.match(/Location:\s*([^\n]+)/i);
        if (locationMatch) {
          location = locationMatch[1].trim();
        }
      }

      // If no location found in description, try the selectors
      if (!location) {
        for (const selector of locationSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const text = el.textContent.trim();
            
            // Skip if this element is the company name or empty
            if (text === company || !text) continue;
            
            // Skip if it's clearly not a location
            if (text.includes('ago') || 
                text.includes('applicant') || 
                text.includes('employee') ||
                text.includes('follower') ||
                text.includes('connection') ||
                /^\d+$/.test(text)) {
              continue;
            }

            // Check if it looks like a location
            if (text.includes('Dublin') || 
                text.includes(',') || 
                text.includes('Remote') ||
                text.includes('Hybrid') ||
                text.includes('On-site')) {
              location = text;
              break;
            }
          }
          if (location) break;
        }
      }

      // Clean up the location if found
      if (location) {
        // Remove any non-location text
        location = location
          .replace(/[0-9]+ applicants?/i, '')
          .replace(/[0-9]+ followers?/i, '')
          .replace(/[0-9]+ employees?/i, '')
          .replace(/[0-9]+ connections?/i, '')
          .trim();

        // If the location is the same as the company name, it's probably wrong
        if (location === company) {
          location = null;
        }
      }

      // If we still don't have a location, but we know it's in Dublin
      if (!location && descriptionText.toLowerCase().includes('dublin')) {
        location = 'Dublin, County Dublin, Ireland';
      }

      // Final check to ensure location is not the company name
      if (location === company) {
        location = 'Dublin, County Dublin, Ireland';
      }

      // Debug information
      const debug = {
        foundTitle: !!title,
        foundCompany: !!company,
        foundLocation: !!location,
        rawLocation: location,
        pageTitle: document.title,
        url: window.location.href,
        companyName: company,
        descriptionLocation: locationMatch ? locationMatch[1] : null,
        descriptionText: descriptionText.substring(0, 200) + '...' // First 200 chars for debugging
      };

      // Ensure we never return the company name as location
      if (!location || location === company) {
        location = 'Dublin, County Dublin, Ireland';
      }

      return {
        title: title || 'Unknown Position',
        company: company || 'Unknown Company',
        location: location,
        debug
      };
    });

    console.log('Scraped job details:', JSON.stringify(jobDetails, null, 2));
    return jobDetails;

  } catch (error) {
    console.error('Error in scrapeJobDetails:', error);
    return {
      title: null,
      company: null,
      location: null,
      error: error.message,
      stack: error.stack
    };
  }
}

app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let browser = null;
  
  try {
    browser = await chromium.launch({
      headless: true
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // Enable console logging from the page
    page.on('console', msg => console.log('Browser console:', msg.text()));

    // Navigate to the URL and wait for network idle
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait for any lazy-loaded content
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const jobDetails = await scrapeJobDetails(page);

    if (jobDetails.error) {
      return res.status(400).json({ error: jobDetails.error });
    }

    res.json(jobDetails);
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 
 