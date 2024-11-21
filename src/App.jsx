import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { initTelegramApp } from './utils/telegram';

// Pages
import Home from './pages/Home';
import Novel from './pages/Novel';
import Chapter from './pages/Chapter';
import Translator from './pages/Translator';
import TranslatorEdit from './pages/TranslatorEdit';
import NovelCreate from './pages/NovelCreate';

// Базовый компонент для отображения Loading/Error
const LoadingOrError = ({ error, isLoading }) => {
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-center">
          <div className="text-lg font-bold mb-2">Error</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return null;
};

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [webApp, setWebApp] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const tg = await initTelegramApp();
        setWebApp(tg);
        
        // Настраиваем тему и цвета
        const mainButton = tg.MainButton;
        mainButton.setParams({
          text_color: '#FFFFFF',
          color: '#2481cc',
        });
        
        // Убираем экран загрузки
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize Telegram Web App:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Показываем экран загрузки или ошибки
  const loadingOrError = <LoadingOrError error={error} isLoading={isLoading} />;
  if (loadingOrError) return loadingOrError;

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Home />} />
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
