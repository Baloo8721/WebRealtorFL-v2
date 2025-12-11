# WebRealtorFL-v2 Customization Guide

## Overview

This site has been modularized for easy cloning and customization. All configuration is centralized in `config.js`, making it simple to adapt the site for different regions, partners, or use cases.

## Quick Start - Customizing the Site

### 1. Update Site Configuration

Edit `config.js` to customize:

#### Theme Colors
```javascript
theme: {
  primary: '#26c6da',        // Main accent color
  secondary: '#0288d1',      // Secondary accent color
  background: '#1a1a1a',     // Background color
  // ... more theme options
}
```

**To change theme colors:**
1. Update values in `config.js`
2. Search/replace color values in CSS (e.g., `#26c6da` → your color)

#### SEO & Meta Tags
```javascript
seo: {
  title: 'Web3RealtorFL - Your Florida Property Match',
  description: 'Free, fast agent matching...',
  keywords: 'Florida real estate, realtor...',
  // ... more SEO options
}
```

#### Site Source Tracking
```javascript
sourceWebsite: 'florida-realtor',  // Change for different regions/partners
```

This value is automatically sent to Supabase/n8n webhook to track where submissions come from.

#### Form Webhook URL
```javascript
form: {
  webhookUrl: 'https://your-webhook-url.com/endpoint',
  // ...
}
```

### 2. Adding/Modifying Affiliate Links

Edit the `affiliates` array in `config.js`:

```javascript
affiliates: [
  {
    name: 'Propy',
    url: 'https://propy.com',
    description: 'Description here',
    logo: 'Logos/propy-logo-1.png'
  },
  // Add more affiliates...
]
```

Affiliate URLs automatically get `?ref=sourceWebsite` appended for tracking.

### 3. Internationalization (i18n)

The site supports 12 languages:
- English (en) - Default
- Spanish (es)
- French (fr)
- German (de)
- Portuguese (pt)
- Chinese (zh)
- Arabic (ar)
- Russian (ru)
- Italian (it)
- Japanese (ja)
- Swedish (sv)
- Korean (ko)

**To add a new language:**
1. Add translation object to the `translations` object in `index.html`
2. Add language option to the language selector UI
3. Update `changeLanguage()` function if needed

**Translation keys:**
All translatable text uses `data-lang` attributes. To translate new text:
```html
<span data-lang="my_key">Default English Text</span>
```

Then add `my_key: "Translated Text"` to each language object in `translations`.

### 4. Geo-Targeting

The site automatically detects user location via:
1. Browser geolocation API (with permission)
2. Timezone-based detection (fallback)

Detected location is stored in the `user_geo` hidden form field.

**To change default geo:**
```javascript
geo: {
  defaultCity: 'Miami, FL',
  defaultState: 'Florida',
  // ...
}
```

### 5. Form Fields

The form automatically includes:
- `site_source` - From `config.sourceWebsite`
- `preferred_language` - Current selected language
- `user_geo` - Detected user location

All hidden fields are populated automatically - no manual changes needed.

## File Structure

```
WebRealtorFL-v2/
├── config.js              # ⭐ Main configuration file
├── index.html             # Main page (includes translations)
├── custom-tools.css       # Tool button styles
├── chatbot/               # Chatbot directory
│   ├── index.html
│   ├── script.js
│   ├── styles.css
│   └── sw.js             # Service worker
└── Logos/                 # Logo images
```

## Key Features

### ✅ Modular Configuration
- All settings in `config.js`
- Easy to clone and customize
- No code changes needed for basic customization

### ✅ Full Internationalization
- 12 languages supported
- Language preference saved in localStorage
- Automatic language detection
- `preferred_language` sent with form submissions

### ✅ SEO Optimized
- Schema.org JSON-LD for real estate services
- Open Graph tags for social sharing
- Canonical URLs
- Meta descriptions and keywords from config

### ✅ Geo-Detection
- Automatic user location detection
- Fallback to timezone-based detection
- Stored in `user_geo` form field

### ✅ Production Ready
- Optimized resource loading
- Service worker for caching
- Lazy loading images
- Performance optimizations

## Common Customization Tasks

### Change Site for Different Region

1. Update `config.js`:
   - `sourceWebsite: 'new-region-realtor'`
   - `geo.defaultCity: 'New City, ST'`
   - `seo.title`, `seo.description` for new region

2. Update form webhook URL if needed

3. Update affiliate links if region-specific

### Change Theme Colors

1. Update `config.js` theme colors
2. Search/replace in `index.html` CSS:
   - Find: `#26c6da` (primary)
   - Replace: Your primary color
   - Repeat for secondary colors

### Add New Language

1. Add language object to `translations` in `index.html`
2. Add language option to language selector UI
3. Test all translations

## Testing Checklist

After customization:
- [ ] Form submits with correct `site_source`
- [ ] Language switching works for all languages
- [ ] `preferred_language` updates on language change
- [ ] Geo-detection works (check `user_geo` field)
- [ ] All affiliate links have tracking parameters
- [ ] SEO meta tags are correct
- [ ] Schema.org JSON-LD is valid

## Notes

- **UI/Functionality**: Do not modify form structure, budget calculator, or price selector - they are working perfectly
- **Translations**: The existing translation system is comprehensive and works with i18next
- **Config**: All customization should be done via `config.js` when possible
- **Form**: Form action and hidden fields are populated automatically from config

## Support

For issues or questions:
1. Check `config.js` for configuration options
2. Review translation keys in `index.html`
3. Verify form fields are being populated correctly

---

**Last Updated**: December 2024
**Version**: 2.0 (Modular)

