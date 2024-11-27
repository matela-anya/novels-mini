import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { hapticFeedback, showMainButton, hideMainButton, getUserData } from '../utils/telegram';

const TranslatorCreate = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('avatar'); // 'avatar' | 'info'
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    photoUrl: null
  });

  // Этап выбора аватара
  const AvatarStep = () => (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        <div className="w-32 h-32 rounded-full bg-gray-100 overflow-hidden mb-4">
          {formData.photoUrl ? (
            <img 
              src={formData.photoUrl} 
              alt="Avatar preview" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" /* ... svg для иконки камеры ... */ />
            </div>
          )}
        </div>
        <button
          onClick={() => {
            hapticFeedback.impactOccurred('light');
            // TODO: Реализовать загрузку фото
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Выбрать фото
        </button>
      </div>
      <button
        onClick={() => {
          hapticFeedback.impactOccurred('light');
          setStep('info');
        }}
        className="w-full px-4 py-2 bg-gray-900 text-white rounded-full"
      >
        Продолжить
      </button>
    </div>
  );

  // Этап ввода информации
  const InfoStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Никнейм
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500"
          placeholder="Как вас называть?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          О себе
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 min-h-[120px]"
          placeholder="Расскажите о себе и своих переводах..."
        />
      </div>
    </div>
  );

  // Обработка сохранения
  const handleSubmit = async () => {
    if (isLoading || !formData.name.trim()) return;

    try {
      setIsLoading(true);
      hapticFeedback.impactOccurred('medium');

      const userData = getUserData();
      if (!userData?.id) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/translators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.id,
          ...formData
        })
      });

      if (!response.ok) throw new Error('Failed to create translator profile');

      const data = await response.json();
      hapticFeedback.notificationOccurred('success');
      navigate(`/translator/${data.id}`);
    } catch (err) {
      console.error('Error creating translator:', err);
      setError(err.message);
      hapticFeedback.notificationOccurred('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Управление главной кнопкой
  React.useEffect(() => {
    if (step === 'info' && formData.name.trim() && !isLoading) {
      showMainButton({
        text: 'Сохранить',
        onClick: handleSubmit
      });
    } else {
      hideMainButton();
    }

    return () => hideMainButton();
  }, [step, formData.name, isLoading]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Стать переводчиком" />

      <div className="container mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 text-center text-red-500">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          {step === 'avatar' ? <AvatarStep /> : <InfoStep />}
        </div>
      </div>
    </div>
  );
};

export default TranslatorCreate;
