import React, { useState } from 'react';
import Header from '../components/Header';
import { hapticFeedback } from '../utils/telegram';

const InitDb = () => {
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const performOperation = async (operation, description) => {
    try {
      setStatus(prev => prev + `\n${description}...`);
      const response = await fetch(`/api/init-db?operation=${operation}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to ${description}`);
      
      setStatus(prev => prev + ` ✓`);
      return true;
    } catch (err) {
      throw new Error(`Failed to ${description}: ${err.message}`);
    }
  };

  const initDatabase = async () => {
    setIsLoading(true);
    setError(null);
    setStatus('Starting database initialization...');
    
    try {
      hapticFeedback.impactOccurred('medium');

      await performOperation('drop', 'Drop existing tables');
      await performOperation('create', 'Create tables');
      await performOperation('indexes', 'Create indexes');
      await performOperation('test-data', 'Insert test data');

      setStatus(prev => prev + '\n\nDatabase initialized successfully! ✨');
      hapticFeedback.notificationOccurred('success');
    } catch (err) {
      console.error('Initialization error:', err);
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
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Инициализация базы данных</h2>
            <p className="text-gray-600">
              Эта страница предназначена для первичной настройки базы данных.
              Будут созданы все необходимые таблицы и тестовые данные.
            </p>
          </div>

          <button
            onClick={initDatabase}
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

          {status && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <pre className="whitespace-pre-line text-sm text-gray-700">
                {status}
              </pre>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-lg">
              <div className="font-medium">Ошибка:</div>
              <div className="text-sm">{error}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InitDb;
