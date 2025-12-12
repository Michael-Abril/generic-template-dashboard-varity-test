/**
 * Logo Download Script (ES Modules)
 *
 * This script helps download official brand logos for marketplace integrations.
 * It uses Simple Icons as a source for open-source brand logos.
 *
 * Usage:
 *   npm install simple-icons --save-dev
 *   node scripts/download-logos.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as simpleIcons from 'simple-icons';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logo mapping: marketplace name -> Simple Icons key
const LOGO_MAPPING = {
  'quickbooks': 'siQuickbooks',
  'salesforce': 'siSalesforce',
  'shopify': 'siShopify',
  'slack': 'siSlack',
  'monday': 'siMondaydotcom',
  'stripe': 'siStripe',
  'hubspot': 'siHubspot',
  'zendesk': 'siZendesk',
  'google-workspace': 'siGoogle',
  'microsoft-365': 'siMicrosoft',
  'xero': 'siXero',
  'freshbooks': 'siFreshbooks',
  'asana': 'siAsana',
  'trello': 'siTrello',
  'mailchimp': 'siMailchimp',
  'intercom': 'siIntercom',
  'twilio': 'siTwilio',
  'docusign': 'siDocusign',
  'zoom': 'siZoom',
  'dropbox': 'siDropbox'
};

const LOGO_DIR = path.join(__dirname, '..', 'public', 'logos');

async function downloadLogos() {
  console.log('📦 Simple Icons loaded successfully!');
  console.log(`🎯 Downloading ${Object.keys(LOGO_MAPPING).length} logos...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const [fileName, iconKey] of Object.entries(LOGO_MAPPING)) {
    try {
      const icon = simpleIcons[iconKey];

      if (!icon) {
        console.log(`❌ ${fileName}: Icon not found (key: ${iconKey})`);
        failCount++;
        continue;
      }

      // Create SVG content with proper formatting
      const svgContent = `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#${icon.hex}">
  <title>${icon.title}</title>
  <path d="${icon.path}"/>
</svg>`;

      // Write to file
      const filePath = path.join(LOGO_DIR, `${fileName}.svg`);
      fs.writeFileSync(filePath, svgContent, 'utf8');

      console.log(`✅ ${fileName}.svg - ${icon.title} (#${icon.hex})`);
      successCount++;
    } catch (error) {
      console.log(`❌ ${fileName}: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📁 Output: ${LOGO_DIR}`);

  if (failCount > 0) {
    console.log(`\n⚠️  For failed logos, please download manually from official brand pages.`);
    console.log(`   See public/logos/README.md for official sources.`);
  }
}

// Create logos directory if it doesn't exist
if (!fs.existsSync(LOGO_DIR)) {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
  console.log(`📁 Created directory: ${LOGO_DIR}\n`);
}

// Run the download
downloadLogos();
