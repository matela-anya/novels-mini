import React, { useEffect, useState } from 'react';
import NovelCard from '../components/NovelCard';

const Home = () => {
  const [novels, setNovels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNovels = async () => {
      try {
        const response = await fetch('/api/novels');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setNovels(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNovels();
  }, []);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (isLoading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Все переводы</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {novels.map(novel => (
          <NovelCard key={novel.id} novel={novel} />
        ))}
      </div>
    </div>
  );
};

export default Home;
