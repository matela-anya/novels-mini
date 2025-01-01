import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { initTelegramApp } from './utils/telegram';
import InitDb from './pages/InitDb';

// Pages
import Home from './pages/Home';
import Novel from './pages/Novel';
import Chapter from './pages/Chapter';
import Translator from './pages/Translator';
import TranslatorEdit from './pages/TranslatorEdit';
import NovelCreate from './pages/NovelCreate';
import TranslatorCreate from './pages/TranslatorCreate';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [webApp, setWebApp] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('Starting Telegram WebApp initialization...');
        const tg = await initTelegramApp();
        console.log('Telegram WebApp initialized:', tg);
        console.log('User data:', tg.initDataUnsafe?.user);
        setWebApp(tg);
      } catch (err) {
        console.error('Failed to initialize Telegram Web App:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Показываем индикатор загрузки
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-gray-600">Загрузка приложения...</div>
        </div>
      </div>
    );
  }

  // Показываем ошибку
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="text-center bg-white p-6 rounded-lg shadow-sm max-w-md">
          <div className="text-red-500 mb-2 text-xl">Ошибка инициализации</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // Приложение не инициализировано
  if (!webApp) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="text-center bg-white p-6 rounded-lg shadow-sm">
          <div className="text-gray-600 mb-4">
            Приложение должно быть запущено в Telegram
          </div>
          <a 
            href={`https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME}/app`}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg inline-block hover:bg-blue-600 transition-colors"
          >
            Открыть в Telegram
          </a>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/init-db" element={<InitDb />} />
          <Route path="/novel/new" element={<NovelCreate />} />
          <Route path="/novel/:id" element={<Novel />} />
          <Route path="/novel/:id/chapter/:chapterId" element={<Chapter />} />
          <Route path="/translator/:id" element={<Translator />} />
          <Route path="/translator/:id/edit" element={<TranslatorEdit />} />
          <Route path="/translator/create" element={<TranslatorCreate />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
