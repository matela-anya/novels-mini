import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import { loadFromStorage, hapticFeedback } from '../utils/telegram';

const ChapterRow = ({ chapter, isLastRead, onClick }) => (
  <Link 
    to={`chapter/${chapter.id}`}
    onClick={onClick}
    className={`
      block p-4 border-b last:border-b-0 
      ${isLastRead ? 'bg-blue-50' : 'hover:bg-gray-50'}
      transition-colors duration-200
    `}
  >
    <div className="flex justify-between items-center">
      <div>
        <span className="font-medium">Глава {chapter.number}</span>
        {chapter.title && (
          <span className="ml-2 text-gray-600">{chapter.title}</span>
        )}
      </div>
      {isLastRead && (
        <span className="text-sm text-blue-500">Продолжить чтение</span>
      )}
    </div>
  </Link>
);

const Novel = () => {
  const { id } = useParams();
  const [novel, setNovel] = React.useState(null);
  const [readProgress, setReadProgress] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Загружаем данные новеллы
        const response = await fetch(`/api/novels/${id}`);
        if (!response.ok) throw new Error('Failed to fetch novel');
        const data = await response.json();
        setNovel(data);

        // Загружаем прогресс чтения
        const progress = await loadFromStorage(`novel_${id}_progress`);
        setReadProgress(progress);
      } catch (err) {
        setError(err.message);
        hapticFeedback.notificationOccurred('error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (error) {
    return (
      <div>
        <Header title="Ошибка" />
        <div className="container mx-auto px-4 py-8 text-center">
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

  if (isLoading || !novel) {
    return (
      <div>
        <Header title="Загрузка..." />
        <div className="animate-pulse">
          <div className="h-40 bg-gray-200" />
          <div className="container mx-auto p-4">
            <div className="h-8 bg-gray-200 rounded mb-4" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title={novel.title} />
      
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              Перевод: {novel.translator}
            </div>
            <div className="text-sm">
              {novel.chapters?.length || 0} глав
            </div>
          </div>

          {novel.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {novel.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-line">
              {novel.description}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="font-semibold">Главы</h2>
          </div>
          
          <div>
            {novel.chapters?.map(chapter => (
              <ChapterRow 
                key={chapter.id}
                chapter={chapter}
                isLastRead={readProgress?.lastChapter === chapter.id}
                onClick={() => hapticFeedback.selectionChanged()}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Novel;
