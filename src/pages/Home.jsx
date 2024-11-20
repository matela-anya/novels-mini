import React from 'react';
import Header from '../components/Header';
import NovelCard from '../components/NovelCard';
import { hapticFeedback } from '../utils/telegram';

const Home = () => {
  const [novels, setNovels] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchNovels = async () => {
      try {
        const response = await fetch('/api/novels');
        if (!response.ok) throw new Error('Failed to fetch novels');
        const data = await response.json();
        setNovels(data);
      } catch (err) {
        setError(err.message);
        hapticFeedback.notificationOccurred('error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNovels();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBack={false} />

      <main className="container mx-auto px-4 py-4">
        {error ? (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
              Обновить
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i}
                className="h-40 bg-white rounded-lg shadow-sm animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {novels.map(novel => (
              <NovelCard key={novel.id} novel={novel} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
