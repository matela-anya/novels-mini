'use client';

import { useEffect, useState } from 'react';
import WebApp from '@telegram-web-apps/sdk';

interface Novel {
  id: number;
  title: string;
  coverUrl: string;
  status: string;
}

export default function Home() {
  const [novels, setNovels] = useState<Novel[]>([]);

  useEffect(() => {
    // Initialize Telegram WebApp
    WebApp.ready();
    
    // Fetch novels
    const fetchNovels = async () => {
      const response = await fetch('/api/novels');
      const data = await response.json();
      setNovels(data);
    };

    fetchNovels();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-4">
      <header className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
          <img 
            src="/profile-pic.jpg" 
            alt="Translator profile" 
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Саня</h1>
          <p className="text-gray-600 text-sm">переводчик</p>
        </div>
      </header>

      <h2 className="text-lg font-medium mb-4">Все переводы</h2>
      
      <div className="space-y-3">
        {novels.map((novel) => (
          <div 
            key={novel.id}
            className="bg-white rounded-lg p-3 flex gap-3 shadow-sm"
          >
            <div className="w-16 h-20 bg-gray-200 rounded overflow-hidden flex-shrink-0">
              <img
                src={novel.coverUrl}
                alt={novel.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-medium mb-1">{novel.title}</h3>
              <p className="text-sm text-gray-600">перевод: {novel.status}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
