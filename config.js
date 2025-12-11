// ============================================================================
// SITE CONFIGURATION FILE
// ============================================================================
// To customize this site, edit the values below. All changes will be applied
// site-wide automatically.
// ============================================================================

const SITE_CONFIG = {
  // ==========================================================================
  // THEME CONFIGURATION
  // ==========================================================================
  // To change theme colors: Update these values and search/replace in CSS
  theme: {
    primary: '#26c6da',        // Main accent color (cyan)
    secondary: '#0288d1',      // Secondary accent color (blue)
    background: '#1a1a1a',     // Main background color
    text: '#ffffff',           // Primary text color
    textSecondary: '#e0e6ed', // Secondary text color
    fonts: {
      primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
      heading: "'Inter', sans-serif"
    },
    heroImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop'
  },

  // ==========================================================================
  // SEO & META CONFIGURATION
  // ==========================================================================
  seo: {
    title: 'Web3RealtorFL - Your Florida Property Match',
    description: 'Free, fast agent matching from licensed FL experts and Web3 technology for Florida real estate',
    keywords: 'Florida real estate, realtor, property match, Web3, blockchain real estate, Miami, Orlando, Tampa',
    canonical: 'https://baloo8721.github.io/WebRealtorFL-v2/',
    og: {
      title: 'Web3RealtorFL - Your Florida Property Match',
      description: 'Free, fast agent matching from licensed FL experts and Web3 technology',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop',
      type: 'website',
      siteName: 'Web3RealtorFL'
    }
  },

  // ==========================================================================
  // GEO TARGETING CONFIGURATION
  // ==========================================================================
  geo: {
    defaultCity: 'Miami, FL',
    defaultState: 'Florida',
    defaultCountry: 'United States',
    targetRegions: ['Florida', 'Miami', 'Orlando', 'Tampa', 'Jacksonville']
  },

  // ==========================================================================
  // SITE SOURCE TRACKING
  // ==========================================================================
  // This value is sent to Supabase/n8n webhook to track where submissions come from
  // Change this when cloning the site for different regions/partners
  sourceWebsite: 'florida-realtor',

  // ==========================================================================
  // AFFILIATES & FOOTER LINKS
  // ==========================================================================
  // Add or modify affiliate links here. The ref parameter will be automatically
  // appended for tracking (e.g., ?ref=florida-realtor)
  affiliates: [
    {
      name: 'Propy',
      url: 'https://propy.com',
      description: 'Streamlined title and real estate transactions with blockchain tech.',
      logo: 'Logos/propy-logo-1.png'
    },
    {
      name: 'Cyrin',
      url: 'https://cyrin.com',
      description: 'Web3 education platform'
    },
    {
      name: 'Updraft',
      url: 'https://updraft.com',
      description: 'Web3 education platform'
    },
    {
      name: 'Web3 Real Estate Calculator',
      url: 'https://baloo8721.github.io/Web3-Real-Estate-Calculator/',
      description: 'Calculate real estate costs with crypto'
    },
    {
      name: 'Spatial.io',
      url: 'https://spatial.io',
      description: '3D Virtual Office'
    },
    {
      name: 'NAR Foreclosure Resources',
      url: 'https://www.nar.realtor/foreclosure-resources',
      description: 'Free Foreclosure/Short Sale Resources'
    }
  ],

  // ==========================================================================
  // FORM CONFIGURATION
  // ==========================================================================
  form: {
    // Webhook URL for form submissions (n8n webhook that forwards to Supabase)
    webhookUrl: 'https://baloo8721.app.n8n.cloud/webhook-test/527411b9-101c-41fb-b63f-a5daf6386c0a',
    // Enable geo-detection for user_geo field
    enableGeoDetection: true,
    // Default language code
    defaultLanguage: 'en'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get affiliate URL with tracking parameter
function getAffiliateUrl(url) {
  if (!url) return '#';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}ref=${SITE_CONFIG.sourceWebsite}`;
}

// Apply theme colors to CSS variables (called on page load)
function applyTheme() {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', SITE_CONFIG.theme.primary);
  root.style.setProperty('--color-secondary', SITE_CONFIG.theme.secondary);
  root.style.setProperty('--color-background', SITE_CONFIG.theme.background);
  root.style.setProperty('--color-text', SITE_CONFIG.theme.text);
  root.style.setProperty('--color-text-secondary', SITE_CONFIG.theme.textSecondary);
}

// Initialize config on page load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    applyTheme();
  });
}

