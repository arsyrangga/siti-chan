'use client';
import { useState } from 'react';
import AvatarScene from '../components/AvatarScene';

export default function Home() {
  const [jawOpen, setJawOpen] = useState(0);
  // ReadyPlayerMe stylized cute avatar URL (fallback dummy avatar handles failures gracefully)
  const [avatarUrl, setAvatarUrl] = useState('https://models.readyplayer.me/64a2e88a0e8d0e5138241416.glb');

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 bg-slate-950 text-white">
      <div className="w-full max-w-4xl h-[500px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
        <AvatarScene avatarUrl={avatarUrl} jawOpen={jawOpen} />
      </div>
    </main>
  );
}
