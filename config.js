// ============================================
// WebRealtorFL-v2 - Main Configuration
// ============================================

const SITE_CONFIG = {
  siteName: "Web3RealEstateFL",
  siteTitle: "Florida Real Estate Agent Search",
  siteSubtitle: "Find the Perfect Real Estate Agent for Your Needs",
  brandColor: "#e74c3c",
  brandColorLight: "#ff6b6b",
  brandColorDark: "#c0392b",
  logo: "/logo.png",
  favicon: "/favicon.ico",
  logoText: "🏠 Web3RealtorFL",
  
  // Contact
  contactEmail: "tylerbelislefl@gmail.com",
  adminEmail: "tylerbelislefl@gmail.com",
  adminPhone: "+1 (813) 555-0101",
  companyName: "Web3RealEstate Florida LLC",
  
  // Supabase Backend
  supabase: {
    url: "https://dponfdhixuxriqqxbbri.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwb25mZGhpeHV4cmlxcXhiYnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDk0NTYsImV4cCI6MjA3NzQyNTQ1Nn0.fFZ9yVUkuS2L9gbnO3oQrqVauEjyHqwLGRrWVW7lU7A",
    serviceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwb25mZGhpeHV4cmlxcXhiYnJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTg0OTQ1NiwiZXhwIjoyMDc3NDI1NDU2fQ.fFZ9yVUkuS2L9gbnO3oQrqVauEjyHqwLGRrWVW7lU7A"
  },
  
  // Backend Edge Function (handles matching + emails)
  endpoint: "/api/handle-referral",  // Supabase Edge Function path
  
  // Geo Targeting
  targetRegions: {
    primary: "florida",  // FL, NY, TX, CA
    states: ["FL"],
    cities: ["Miami", "Tampa", "Orlando", "Jacksonville", "Fort Lauderdale", "Tallahassee", "Sarasota", "Naples"],
    international: ["CA", "NY", "NV", "CT", "GA"] // Top outbound markets
  },
  
  // Multi-Language
  languages: {
    supported: ["en", "es", "pt"],
    default: "en",
    translations: {}, // Loaded dynamically
    detectBrowser: true  // Auto-detect from browser
  },
  
  // Affiliate Tracking
  affiliate: {
    enabled: true,
    partners: [
      { name: "TitleMax", link: "", type: "title company" },
      { name: "Guaranteed Rate", link: "", type: "mortgage" },
      { name: "Lemonade", link: "", type: "insurance" }
    ]
  },
  
  // Crypto/Web3 Features
  crypto: {
    enabled: true,
    acceptBTC: true,
    acceptETH: true,
    cryptoPayment: "https://web3realtorfl.com/pay",
    btcAddress: "bc1q...[placeholder]",
    ethAddress: "0x...[placeholder]"
  },
  
  // Chatbot & AI
  chatbot: {
    enabled: true,
    model: "default",
    autoReply: true,
    showInAllPages: false
  },
  
  // SEO & Analytics
  seo: {
    title: "Florida Real Estate Agent Search | Web3RealtorFL",
    description: "Find top-rated real estate agents in Florida specializing in first-time buyers, luxury homes, crypto, and investor properties.",
    keywords: "Florida realtor, crypto real estate, first-time buyer agent, luxury real estate FL",
    googleAnalytics: "UA-00000000-1",  // Update when ready
    metaTags: {}
  },
  
  // Referral Pipeline
  referral: {
    enableEsign: false,     // Skip for day 1
    agentAcceptWindow: 72,  // hours
    maxMatches: 3,
    autoReject: true,
    statusFlow: [
      "pending",
      "matched",
      "agent-notified",
      "agent-accepted",
      "client-signed",
      "broker-reviewed",
      "closed/completed"
    ]
  },

  // Features
  features: {
    enableScraping: true,     // Daily agent list scraping
    enableAnalytics: true,    // Track site visits
    enableNewsletter: true,   // Email newsletter signup  
    enableChatbot: true       // AI chatbot assistant
  },

  // Theme
  theme: {
    colorScheme: "light",
    customCSS: false,
    fontSize: "normal"
  },
  
  // Legal
  legal: {
    enableCookieBanner: true,
    privacyPolicyUrl: "/privacy",
    termsUrl: "/terms",
    enableCookieConsent: true
  }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SITE_CONFIG;
}
