import './globals.css';

export const metadata = {
  title: 'Siti-Chan: 3D Talking AI Companion',
  description: 'Interactive 3D avatar powered by DeepSeek and local Kokoro TTS.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
