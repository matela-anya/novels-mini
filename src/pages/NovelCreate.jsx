import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { hapticFeedback, showMainButton, hideMainButton } from '../utils/telegram';

// Компонент выбора тегов
const TagSelect = ({ title, tags, selectedTags, onToggleTag }) => (
  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {title}
    </label>
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => (
        <button
          key={tag}
          type="button"
          onClick={() => {
            hapticFeedback.selectionChanged();
            onToggleTag(tag);
          }}
          className={`
            px-3 py-1.5 rounded-full text-sm
            transition-colors
            ${selectedTags.includes(tag)
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          {tag}
        </button>
      ))}
    </div>
  </div>
);

const NovelCreate = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    commonTags: [],
    otherTags: [],
    status: 'в процессе'
  });

  // Предопределенные теги
  const commonTags = ['драма', 'комедия', 'романтика', 'фэнтези', 'боевик', 'хоррор'];
  const otherTags = [
    'попаданец', 'система', 'культивация', 
    'антигерой', 'умный главный герой', 'сильный главный герой',
    'игровые элементы', 'магия', 'реинкарнация'
  ];

  // Управление главной кнопкой
  useEffect(() => {
    const isFormValid = formData.title.trim().length > 0 && 
                       formData.description.trim().length > 0;

    if (isFormValid && !isLoading) {
      showMainButton({
        text: 'СОЗДАТЬ НОВЕЛЛУ',
        onClick: handleSubmit
      });
    } else {
      hideMainButton();
    }

    return () => hideMainButton();
  }, [formData, isLoading]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagToggle = (category) => (tag) => {
    setFormData(prev => {
      const currentTags = prev[category];
      return {
        ...prev,
        [category]: currentTags.includes(tag)
          ? currentTags.filter(t => t !== tag)
          : [...currentTags, tag]
      };
    });
  };

  const handleSubmit = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      hapticFeedback.impactOccurred('medium');

      const response = await fetch('/api/novels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          tags: [...formData.commonTags, ...formData.otherTags]
        })
      });

      if (!response.ok) throw new Error('Failed to create novel');

      const novel = await response.json();
      hapticFeedback.notificationOccurred('success');
      navigate(`/novel/${novel.id}`);
    } catch (err) {
      setError(err.message);
      hapticFeedback.notificationOccurred('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Новая новелла" />

      <div className="container mx-auto px-4 py-6">
        <form 
          className="bg-white rounded-lg shadow-sm p-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
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
              placeholder="Название новеллы"
            />
            {!formData.title.trim() && (
              <p className="mt-1 text-sm text-red-500">
                Обязательное поле
              </p>
            )}
          </div>

          {/* Описание */}
          <div className="mb-6">
            <label 
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Описание
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              disabled={isLoading}
              className={`
                w-full px-4 py-2 rounded-lg border
                focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:bg-gray-100
                min-h-[120px]
                ${!formData.description.trim() && 'border-red-300'}
              `}
              placeholder="Описание новеллы..."
            />
            {!formData.description.trim() && (
              <p className="mt-1 text-sm text-red-500">
                Обязательное поле
              </p>
            )}
          </div>

          {/* Статус */}
          <div className="mb-6">
            <label 
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Статус перевода
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              disabled={isLoading}
              className="
                w-full px-4 py-2 rounded-lg border
                focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:bg-gray-100
              "
            >
              <option value="в процессе">В процессе</option>
              <option value="заморожен">Заморожен</option>
              <option value="завершён">Завершён</option>
            </select>
          </div>

          {/* Общие теги */}
          <TagSelect
            title="Основные теги"
            tags={commonTags}
            selectedTags={formData.commonTags}
            onToggleTag={handleTagToggle('commonTags')}
          />

          {/* Дополнительные теги */}
          <TagSelect
            title="Дополнительные теги"
            tags={otherTags}
            selectedTags={formData.otherTags}
            onToggleTag={handleTagToggle('otherTags')}
          />

          {/* Ошибка */}
          {error && (
            <div className="mb-6 text-center text-red-500">
              {error}
            </div>
          )}

          {/* Сообщение о сохранении */}
          {isLoading && (
            <div className="text-center text-sm text-gray-500">
              Создание новеллы...
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default NovelCreate;
