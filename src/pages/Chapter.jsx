import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { saveToStorage } from '../utils/telegram';

const Chapter = () => {
  const { id, chapterId } = useParams();
  const [chapter, setChapter] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChapter = async () => {
      try {
        const response = await fetch(`/api/novels/${id}/chapters/${chapterId}`);
        if (!response.ok) throw new Error('Failed to fetch chapter');
        const data = await response.json();
        setChapter(data);

        // Сохраняем прогресс чтения
        await saveToStorage(`novel_${id}_progress`, {
          lastChapter: chapterId,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChapter();
  }, [id, chapterId]);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (isLoading || !chapter) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <Link to={`/novel/${id}`} className="text-blue-500">← К оглавлению</Link>
        <div className="text-sm text-gray-500">
          Глава {chapter.number}
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-6">{chapter.title}</h1>

      <div className="prose max-w-none">
        {chapter.content.split('\n').map((paragraph, index) => (
          <p key={index} className="mb-4">{paragraph}</p>
        ))}
      </div>

      <div className="mt-8 flex justify-between items-center">
        {chapter.prevChapter && (
          <Link 
            to={`/novel/${id}/chapter/${chapter.prevChapter}`}
            className="px-4 py-2 bg-gray-100 rounded"
          >
            ← Предыдущая
          </Link>
        )}
        {chapter.nextChapter && (
          <Link 
            to={`/novel/${id}/chapter/${chapter.nextChapter}`}
            className="px-4 py-2 bg-blue-500 text-white rounded ml-auto"
          >
            Следующая →
          </Link>
        )}
      </div>
    </div>
  );
};

export default Chapter;
