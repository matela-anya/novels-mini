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
        setWebApp(tg);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize Telegram Web App:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    init();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-red-500 text-center">
          <div className="text-lg font-bold mb-2">Ошибка инициализации</div>
          <div>{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Обновить
          </button>
        </div>
      </div>
    );
  }

  // Даже если isLoading=true, показываем основной контент
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/init-db" element={<InitDb />} /> {/* Добавьте эту строку */}
          <Route path="/novel/new" element={<NovelCreate />} />
          <Route path="/novel/:id" element={<Novel />} />
          <Route path="/novel/:id/chapter/:chapterId" element={<Chapter />} />
          <Route path="/translator/:id" element={<Translator />} />
          <Route path="/translator/:id/edit" element={<TranslatorEdit />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
