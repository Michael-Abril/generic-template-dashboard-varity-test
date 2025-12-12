/**
 * Logo Download Script
 *
 * This script helps download official brand logos for marketplace integrations.
 * It uses Simple Icons as a source for open-source brand logos.
 *
 * Usage:
 *   npm install simple-icons --save-dev
 *   node scripts/download-logos.js
 */

const fs = require('fs');
const path = require('path');

// Logo mapping: marketplace name -> Simple Icons slug
const LOGO_MAPPING = {
  'quickbooks': 'quickbooks',
  'salesforce': 'salesforce',
  'shopify': 'shopify',
  'slack': 'slack',
  'monday': 'monday',
  'stripe': 'stripe',
  'hubspot': 'hubspot',
  'zendesk': 'zendesk',
  'google-workspace': 'google', // Use Google icon for Workspace
  'microsoft-365': 'microsoft', // Use Microsoft icon for 365
  'xero': 'xero',
  'freshbooks': 'freshbooks',
  'asana': 'asana',
  'trello': 'trello',
  'mailchimp': 'mailchimp',
  'intercom': 'intercom',
  'twilio': 'twilio',
  'docusign': 'docusign',
  'zoom': 'zoom',
  'dropbox': 'dropbox'
};

const LOGO_DIR = path.join(__dirname, '..', 'public', 'logos');

async function downloadLogos() {
  try {
    // Try to import simple-icons
    const simpleIcons = require('simple-icons');

    console.log('📦 Simple Icons loaded successfully!');
    console.log(`🎯 Downloading ${Object.keys(LOGO_MAPPING).length} logos...\n`);

    let successCount = 0;
    let failCount = 0;

    for (const [fileName, iconSlug] of Object.entries(LOGO_MAPPING)) {
      try {
        // Get icon by slug (e.g., 'quickbooks')
        const icon = simpleIcons[`si${iconSlug.charAt(0).toUpperCase()}${iconSlug.slice(1)}`];

        if (!icon) {
          console.log(`❌ ${fileName}: Icon not found (slug: ${iconSlug})`);
          failCount++;
          continue;
        }

        // Create SVG content with proper formatting
        const svgContent = `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
  <title>${icon.title}</title>
  <path d="${icon.path}"/>
</svg>`;

        // Write to file
        const filePath = path.join(LOGO_DIR, `${fileName}.svg`);
        fs.writeFileSync(filePath, svgContent, 'utf8');

        console.log(`✅ ${fileName}.svg - ${icon.title} (${icon.hex})`);
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

  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Simple Icons not installed.');
      console.log('\n📦 Please install Simple Icons first:');
      console.log('   npm install simple-icons --save-dev');
      console.log('   # or');
      console.log('   yarn add simple-icons --dev');
      console.log('\nThen run this script again.');
      process.exit(1);
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

// Create logos directory if it doesn't exist
if (!fs.existsSync(LOGO_DIR)) {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
  console.log(`📁 Created directory: ${LOGO_DIR}\n`);
}

// Run the download
downloadLogos();
