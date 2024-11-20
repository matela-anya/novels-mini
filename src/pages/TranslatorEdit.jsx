import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { hapticFeedback, showMainButton, hideMainButton } from '../utils/telegram';

const TranslatorEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Загрузка данных переводчика
  useEffect(() => {
    const fetchTranslator = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/translators/${id}`);
        if (!response.ok) throw new Error('Failed to fetch translator data');
        const data = await response.json();
        
        setFormData({
          name: data.name || '',
          description: data.description || ''
        });
      } catch (err) {
        setError(err.message);
        hapticFeedback.notificationOccurred('error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranslator();
  }, [id]);

  // Управление главной кнопкой
  useEffect(() => {
    const isFormValid = formData.name.trim().length > 0;

    if (isFormValid && !isSaving) {
      showMainButton({
        text: 'СОХРАНИТЬ',
        onClick: handleSubmit
      });
    } else {
      hideMainButton();
    }

    return () => hideMainButton();
  }, [formData, isSaving]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    if (isSaving) return;

    try {
      setIsSaving(true);
      hapticFeedback.impactOccurred('medium');

      const response = await fetch(`/api/translators/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to update profile');

      hapticFeedback.notificationOccurred('success');
      navigate(`/translator/${id}`);
    } catch (err) {
      setError(err.message);
      hapticFeedback.notificationOccurred('error');
    } finally {
      setIsSaving(false);
    }
  };

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
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Редактировать профиль" />

      <div className="container mx-auto px-4 py-6">
        <form 
          className="bg-white rounded-lg shadow-sm p-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {/* Имя */}
          <div className="mb-6">
            <label 
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Имя
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              disabled={isLoading || isSaving}
              className={`
                w-full px-4 py-2 rounded-lg border
                focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:bg-gray-100
                ${!formData.name.trim() && 'border-red-300'}
              `}
              placeholder="Ваше имя"
            />
            {!formData.name.trim() && (
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
              О себе
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              disabled={isLoading || isSaving}
              className="
                w-full px-4 py-2 rounded-lg border
                focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:bg-gray-100
                min-h-[120px]
              "
              placeholder="Расскажите о себе и своих переводах..."
            />
          </div>

          {/* Сообщение о сохранении */}
          {isSaving && (
            <div className="text-center text-sm text-gray-500">
              Сохранение...
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default TranslatorEdit;
