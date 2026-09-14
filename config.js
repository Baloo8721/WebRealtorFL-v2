// ============================================================================
// SITE CONFIGURATION FILE
// ============================================================================
// To customize this site, edit the values below. All changes will be applied
// site-wide automatically.
// Updated: September 13, 2026 - Supabase direct migration
// ============================================================================

const SITE_CONFIG = {
  // ==========================================================================
  // THEME CONFIGURATION
  // ==========================================================================
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
  sourceWebsite: 'florida-realtor',

  // ==========================================================================
  // AFFILIATES & FOOTER LINKS
  // ==========================================================================
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
    // Supabase REST endpoint (direct - no more Render backend)
    backendUrl: 'https://dponfdhixuxriqqxbbri.supabase.co/rest/v1/clients',
    // Supabase project details
    supabase: {
      url: 'https://dponfdhixuxriqqxbbri.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwb25mZGhpeHV4cmlxcXhiYnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDk0NTYsImV4cCI6MjA3NzQyNTQ1Nn0.fFZ9yVUkuS2L9gbnO3oQrqVauEjyHqwLGRrWVW7lU7A'
    },
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

// ============================================================================
// FORM SUBMISSION TO SUPABASE (direct REST)
// ============================================================================

async function submitToSupabase(formData) {
  const url = SITE_CONFIG.form.backendUrl;
  const anonKey = SITE_CONFIG.form.supabase.anonKey;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(formData)
    });
    
    if (response.ok) {
      return { success: true, data: await response.json() };
    } else {
      const errorText = await response.text();
      console.error('Supabase error:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('Fetch error:', error);
    return { success: false, error: error.message };
  }
}
