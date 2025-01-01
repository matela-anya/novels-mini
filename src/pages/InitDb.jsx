import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { hapticFeedback } from '../utils/telegram';

const InitDb = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleInitDb = async () => {
    try {
      setIsLoading(true);
      setError(null);
      hapticFeedback.impactOccurred('medium');

      const response = await fetch('/api/init-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize database');
      }

      setSuccess(true);
      hapticFeedback.notificationOccurred('success');
    } catch (err) {
      console.error('Database initialization error:', err);
      setError(err.message);
      hapticFeedback.notificationOccurred('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Инициализация базы данных" />

      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {!success ? (
            <>
              <p className="text-gray-700 mb-6">
                Эта страница предназначена для инициализации базы данных. 
                Будут созданы все необходимые таблицы и тестовые данные.
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
                  <p className="font-medium">Ошибка инициализации:</p>
                  <p>{error}</p>
                </div>
              )}

              <button
                onClick={handleInitDb}
                disabled={isLoading}
                className={`
                  w-full px-4 py-3 rounded-lg font-medium
                  ${isLoading 
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
                  }
                  transition-colors duration-200
                `}
              >
                {isLoading ? 'Инициализация...' : 'Инициализировать базу данных'}
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="mb-4 text-green-500">
                <svg 
                  className="w-16 h-16 mx-auto" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                База данных успешно инициализирована
              </h3>
              <p className="text-gray-500 mb-6">
                Все таблицы созданы и заполнены тестовыми данными
              </p>
              <button
                onClick={() => {
                  hapticFeedback.impactOccurred('light');
                  navigate('/');
                }}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg"
              >
                Вернуться на главную
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InitDb;
