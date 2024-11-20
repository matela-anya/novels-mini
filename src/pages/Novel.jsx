import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadFromStorage, saveToStorage } from '../utils/telegram';

const Novel = () => {
  const { id } = useParams();
  const [novel, setNovel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readProgress, setReadProgress] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Загружаем данные новеллы
        const response = await fetch(`/api/novels/${id}`);
        if (!response.ok) throw new Error('Failed to fetch novel');
        const data = await response.json();
        setNovel(data);

        // Загружаем прогресс чтения из CloudStorage
        const progress = await loadFromStorage(`novel_${id}_progress`);
        setReadProgress(progress);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (isLoading || !novel) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{novel.title}</h1>
        <div className="text-sm text-gray-600 mb-2">
          переводчик: <Link to={`/translator/${novel.translator_id}`} className="text-blue-500">{novel.translator}</Link>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {novel.tags?.map(tag => (
            <span key={tag} className="px-2 py-1 bg-gray-100 rounded-full text-sm">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="font-bold mb-2">Описание</h2>
        <p className="text-gray-700 whitespace-pre-line">{novel.description}</p>
      </div>

      <div>
        <h2 className="font-bold mb-4">Главы</h2>
        <div className="grid gap-2">
          {novel.chapters?.map((chapter) => (
            <Link 
              key={chapter.id}
              to={`/novel/${id}/chapter/${chapter.id}`}
              className={`p-3 rounded border ${
                readProgress?.lastChapter === chapter.id 
                  ? 'bg-blue-50 border-blue-200'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>Глава {chapter.number}: {chapter.title}</span>
                {readProgress?.lastChapter === chapter.id && (
                  <span className="text-sm text-blue-500">Продолжить чтение</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Novel;
