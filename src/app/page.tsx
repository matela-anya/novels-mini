'use client';

import { useEffect, useState } from 'react';
import WebApp from '@telegram-web-apps/sdk';
import MainLayout from '@/components/layouts/main-layout';
import NovelCard from '@/components/ui/novel-card';

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
      try {
        const response = await fetch('/api/novels');
        if (!response.ok) {
          throw new Error('Failed to fetch novels');
        }
        const data = await response.json();
        setNovels(data);
      } catch (error) {
        console.error('Error fetching novels:', error);
        // Можно добавить состояние ошибки и показывать его пользователю
      }
    };

    fetchNovels();
  }, []);

  return (
    <MainLayout>
      <h2 className="text-lg font-medium mb-4">Все переводы</h2>
      <div className="space-y-3">
        {novels.map((novel) => (
          <NovelCard
            key={novel.id}
            title={novel.title}
            coverUrl={novel.coverUrl}
            status={novel.status}
            onClick={() => {
              // Навигация к деталям новеллы
              console.log(`Clicked novel: ${novel.id}`);
            }}
          />
        ))}
      </div>
      {novels.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          Загрузка переводов...
        </p>
      )}
    </MainLayout>
  );
}
