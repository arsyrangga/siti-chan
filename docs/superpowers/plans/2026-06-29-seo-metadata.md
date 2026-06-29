# SEO Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement SEO-friendly metadata and favicon configuration in Next.js layout.js.

**Architecture:** Export a static metadata object from app/layout.js.

**Tech Stack:** Next.js (App Router), JavaScript.

## Global Constraints
- Must use `/assets/favicon.png` for all icon types (icon, shortcut, apple).
- Must adhere to Next.js App Router metadata conventions.

---

### Task 1: Update app/layout.js with comprehensive SEO metadata

**Files:**
- Modify: `app/layout.js`

**Interfaces:**
- Produces: `metadata` static export config in `app/layout.js`

- [ ] **Step 1: Edit app/layout.js**

Update `app/layout.js` to define and export the new `metadata` object.

```javascript
import './globals.css';

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

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Verify build and HTML output**

Run: `curl -s http://localhost:3000 | grep -oE '<title>[^<]+</title>|<meta name="description" content="[^"]+" />|<link rel="icon" href="[^"]+" />'`
Expected:
```
<title>Siti-Chan: 3D Talking AI Companion 🌸</title>
<meta name="description" content="Website interaktif karakter 3D anime yang bisa berbicara menggunakan kecerdasan buatan (DeepSeek LLM) dan suara lokal berkualitas tinggi (Kokoro TTS)." />
<link rel="icon" href="/assets/favicon.png" />
```

- [ ] **Step 3: Commit changes**

```bash
git add app/layout.js
git commit -m "feat: add comprehensive SEO metadata and favicon configurations"
```
