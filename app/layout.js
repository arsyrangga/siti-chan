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
    url: 'https://siti-chan.vercel.app',
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
