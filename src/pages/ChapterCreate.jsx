import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { hapticFeedback, showMainButton, hideMainButton } from '../utils/telegram';

const ChapterCreate = () => {
  const { id: novelId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastChapterNumber, setLastChapterNumber] = useState(0);

  const [formData, setFormData] = useState({
    number: 1,
    title: '',
    content: ''
  });

  // Загружаем информацию о последней главе
  useEffect(() => {
    const fetchLastChapter = async () => {
      try {
        const response = await fetch(`/api/novels/${novelId}`);
        if (!response.ok) throw new Error('Failed to fetch novel');
        const data = await response.json();
        
        const lastNumber = data.chapters?.length > 0 
          ? Math.max(...data.chapters.map(c => c.number))
          : 0;
        
        setLastChapterNumber(lastNumber);
        setFormData(prev => ({
          ...prev,
          number: lastNumber + 1
        }));
      } catch (err) {
        setError(err.message);
      }
    };

    fetchLastChapter();
  }, [novelId]);

  // Управление главной кнопкой
  useEffect(() => {
  const isFormValid = 
    formData.title.trim().length > 0 && 
    formData.content.trim().length > 0;

  if (isFormValid && !isLoading) {
    showMainButton({
      text: 'ОПУБЛИКОВАТЬ',
      onClick: handleSubmit
    });
  } else {
    hideMainButton();
  }

  return () => hideMainButton();
}, [formData, isLoading, handleSubmit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = useCallback(async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      hapticFeedback.impactOccurred('medium');

      const response = await fetch(`/api/novels/${novelId}/chapters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create chapter');

      const chapter = await response.json();
      hapticFeedback.notificationOccurred('success');
      navigate(`/novel/${novelId}/chapter/${chapter.id}`);
    } catch (err) {
      setError(err.message);
      hapticFeedback.notificationOccurred('error');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, novelId, formData, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Новая глава" />

      <div className="container mx-auto px-4 py-6">
        <form 
          className="bg-white rounded-lg shadow-sm p-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {/* Номер главы */}
          <div className="mb-6">
            <label 
              htmlFor="number"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Номер главы
            </label>
            <input
              type="number"
              id="number"
              name="number"
              value={formData.number}
              onChange={handleInputChange}
              disabled={isLoading}
              min="1"
              step="1"
              className="
                w-full px-4 py-2 rounded-lg border
                focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:bg-gray-100
              "
            />
          </div>

          {/* Название */}
          <div className="mb-6">
            <label 
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Название
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              disabled={isLoading}
              className={`
                w-full px-4 py-2 rounded-lg border
                focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:bg-gray-100
                ${!formData.title.trim() && 'border-red-300'}
              `}
              placeholder="Название главы"
            />
          </div>

          {/* Контент */}
          <div className="mb-6">
            <label 
              htmlFor="content"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Текст главы
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              disabled={isLoading}
              className={`
                w-full px-4 py-2 rounded-lg border
                focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:bg-gray-100
                min-h-[400px]
                ${!formData.content.trim() && 'border-red-300'}
              `}
              placeholder="Текст главы..."
            />
          </div>

          {/* Ошибка */}
          {error && (
            <div className="text-center text-red-500 mb-6">
              {error}
            </div>
          )}

          {/* Индикатор загрузки */}
          {isLoading && (
            <div className="text-center text-gray-500">
              Публикация...
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChapterCreate;
