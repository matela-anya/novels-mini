import React from 'react';
import Header from '../components/Header';
import { hapticFeedback } from '../utils/telegram';

const InitDb = () => {
  const [status, setStatus] = React.useState(null);
  const [error, setError] = React.useState(null);

  const initDatabase = async () => {
    try {
      setStatus('Initializing...');
      console.log('Sending request to /api/init-db');
      
      const response = await fetch('/api/init-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) throw new Error(data.error || 'Failed to initialize database');
      
      setStatus('Database initialized successfully!');
      hapticFeedback.notificationOccurred('success');
      setError(null);
    } catch (err) {
      console.error('Initialization error:', err);
      setError(err.message);
      hapticFeedback.notificationOccurred('error');
      setStatus(null);
    }
  };

  React.useEffect(() => {
    console.log('InitDb component mounted');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Инициализация базы данных" />

      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-xl font-semibold mb-4">Инициализация базы данных</h1>
          
          <div className="mb-6">
            <p className="text-gray-700">
              Эта страница предназначена для первичной настройки базы данных.
              Будут созданы все необходимые таблицы и тестовые данные.
            </p>
          </div>

          <button
            onClick={initDatabase}
            disabled={status === 'Initializing...'}
            className={`
              w-full px-4 py-3 rounded-lg font-medium
              ${status === 'Initializing...' 
                ? 'bg-gray-100 text-gray-400'
                : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
              }
              transition-colors duration-200
            `}
          >
            {status === 'Initializing...' ? 'Инициализация...' : 'Инициализировать базу данных'}
          </button>

          {status && status !== 'Initializing...' && (
            <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg">
              {status}
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
              <p className="font-medium">Ошибка:</p>
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InitDb;
