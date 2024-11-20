import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { saveToStorage, hapticFeedback, showMainButton } from '../utils/telegram';

const ChapterNavigation = ({ prevChapter, nextChapter, onNavigate }) => {
  if (!prevChapter && !nextChapter) return null;

  return (
    <div className="flex justify-between items-center sticky bottom-0 bg-white border-t p-4">
      {prevChapter ? (
        <button
          onClick={() => onNavigate(prevChapter)}
          className="px-4 py-2 border rounded-lg"
        >
          ← Предыдущая
        </button>
      ) : <div />}

      {nextChapter && (
        <button
          onClick={() => onNavigate(nextChapter)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Следующая →
        </button>
      )}
    </div>
  );
};

const Chapter = () => {
  const { id, chapterId } = useParams();
  const navigate = useNavigate();
  const [chapter, setChapter] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const handleNavigation = (newChapterId) => {
    hapticFeedback.selectionChanged();
    navigate(`/novel/${id}/chapter/${newChapterId}`);
  };

  React.useEffect(() => {
    const fetchChapter = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/novels/${id}/chapters/${chapterId}`);
        if (!response.ok) throw new Error('Failed to fetch chapter');
        const data = await response.json();
        setChapter(data);

        // Сохраняем прогресс
        await saveToStorage(`novel_${id}_progress`, {
          lastChapter: chapterId,
          currentChapter: data.number,
          timestamp: new Date().toISOString()
        });

      } catch (err) {
        setError(err.message);
        hapticFeedback.notificationOccurred('error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChapter();
  }, [id, chapterId]);

  // Показываем кнопку "К оглавлению" в шапке Telegram
  React.useEffect(() => {
    showMainButton({
      text: 'К ОГЛАВЛЕНИЮ',
      onClick: () => {
        hapticFeedback.impactOccurred('light');
        navigate(`/novel/${id}`);
      }
    });
  }, [id, navigate]);

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

  if (isLoading || !chapter) {
    return (
      <div>
        <Header title="Загрузка..." />
        <div className="animate-pulse p-4">
          <div className="h-8 bg-gray-200 rounded mb-4" />
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <Header title={`Глава ${chapter.number}`} />
      
      <div className="container mx-auto px-4 py-6">
        {chapter.title && (
          <h1 className="text-xl font-bold mb-6">{chapter.title}</h1>
        )}

        <div className="prose max-w-none">
          {chapter.content.split('\n\n').map((paragraph, index) => (
            <p key={index} className="mb-4">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <ChapterNavigation 
        prevChapter={chapter.prev_chapter}
        nextChapter={chapter.next_chapter}
        onNavigate={handleNavigation}
      />
    </div>
  );
};

export default Chapter;
