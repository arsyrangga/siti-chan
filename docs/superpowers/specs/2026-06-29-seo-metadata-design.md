# Design Spec: Comprehensive SEO Metadata and Favicon for Siti-Chan

**Date:** 2026-06-29
**Status:** Draft

## Goal
Implement a search-engine-friendly (SEO) metadata configuration in `app/layout.js` to ensure the project has proper metadata, Open Graph (social media previews), Twitter Cards, keywords, and references the custom favicon located at `public/assets/favicon.png`.

## Proposed Design
We will export a static `metadata` object from `app/layout.js`.

### Metadata Schema
```javascript
export const metadata = {
  title: {
    default: 'Siti-Chan: 3D Talking AI Companion 🌸',
    template: '%s | Siti-Chan'
  },
  description: 'Website interaktif karakter 3D anime yang bisa berbicara menggunakan kecerdasan buatan (DeepSeek LLM) dan suara lokal berkualitas tinggi (Kokoro TTS).',
  keywords: [
    'Siti-Chan',
    '3D AI Companion',
    'Talking AI',
    'DeepSeek',
    'Kokoro TTS',
    'Virtual Character',
    'Web3D',
    'AI Anime Chat'
  ],
  authors: [{ name: 'Siti-Chan Team' }],
  icons: {
    icon: '/assets/favicon.png',
    shortcut: '/assets/favicon.png',
    apple: '/assets/favicon.png',
  },
  openGraph: {
    title: 'Siti-Chan: 3D Talking AI Companion 🌸',
    description: 'Interaksi langsung dengan karakter anime 3D interaktif yang didukung oleh DeepSeek LLM dan Kokoro TTS suara lokal.',
    url: 'https://siti-chan.example.com',
    siteName: 'Siti-Chan',
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Siti-Chan: 3D Talking AI Companion 🌸',
    description: 'Interaksi langsung dengan karakter anime 3D interaktif yang didukung oleh DeepSeek LLM dan Kokoro TTS suara lokal.',
  },
};
```

## Impacted Files
- [layout.js](file:///Users/steradian/terminal/ai/siti-chan/app/layout.js): Update default metadata and configure standard, OG, and Twitter fields.

## Verification Plan
1. Check that `npm run dev` builds successfully without warnings.
2. Verify in a browser or curl that the `<head>` of the page contains:
   - `<title>Siti-Chan: 3D Talking AI Companion 🌸</title>`
   - `<meta name="description" content="..." />`
   - `<meta name="keywords" content="..." />`
   - `<link rel="icon" href="/assets/favicon.png" />`
   - `<meta property="og:title" content="..." />`
   - `<meta name="twitter:card" content="summary_large_image" />`
