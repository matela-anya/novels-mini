import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import NovelCard from '../components/NovelCard';
import { hapticFeedback, loadFromStorage } from '../utils/telegram';

const Home = () => {
  const [novels, setNovels] = useState([]);
  const [translator, setTranslator] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Загружаем все новеллы
        const response = await fetch('/api/novels');
        if (!response.ok) throw new Error('Failed to fetch novels');
        const data = await response.json();
        setNovels(data);

        // Получаем информацию о переводчике из первой новеллы
        if (data.length > 0 && data[0].translator_id) {
          const translatorResponse = await fetch(`/api/translators/${data[0].translator_id}`);
          if (translatorResponse.ok) {
            const translatorData = await translatorResponse.json();
            setTranslator(translatorData);
          }
        }
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
        hapticFeedback.notificationOccurred('error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Header 
          title={translator?.name} 
          showBack={false} 
          translatorId={translator?.id}
          translatorName={translator?.name}
        />
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            Обновить
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header 
          title={translator?.name}
          showBack={false}
          translatorId={translator?.id}
          translatorName={translator?.name}
        />
        <div className="px-4 py-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i}
              className="h-24 bg-gray-50 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header 
        title={translator?.name}
        showBack={false}
        translatorId={translator?.id}
        translatorName={translator?.name}
      />

      <div className="px-4">
        <h2 className="text-2xl font-medium text-[#424242] mb-6">Все переводы</h2>
        <div className="space-y-4">
          {novels.map(novel => (
            <NovelCard key={novel.id} novel={novel} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
