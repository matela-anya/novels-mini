import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { showBackButton, hideBackButton, hapticFeedback } from '../utils/telegram';

const Header = ({ title, showBack = true, translatorId, translatorName }) => {
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (showBack && location.pathname !== '/') {
      showBackButton(() => {
        hapticFeedback.impactOccurred('light');
        navigate(-1);
      });
    } else {
      hideBackButton();
    }

    return () => hideBackButton();
  }, [location.pathname, navigate, showBack]);

  // Если мы на главной странице
  if (location.pathname === '/') {
    return (
      <header className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          {translatorId ? (
            <Link 
              to={`/translator/${translatorId}`}
              className="flex items-center gap-4 active:opacity-60"
              onClick={() => hapticFeedback.impactOccurred('light')}
            >
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100">
                <img 
                  src="/api/placeholder/56/56" 
                  alt="Translator avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="text-sm text-gray-500">переводчик</div>
                <div className="text-xl font-medium text-[#424242]">{translatorName || 'Переводчик'}</div>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gray-100" />
              <div>
                <div className="text-sm text-gray-500">переводчик</div>
                <div className="text-xl font-medium text-[#424242]">Загрузка...</div>
              </div>
            </div>
          )}
        </div>
      </header>
    );
  }

  // Для остальных страниц
  return (
    <header className="sticky top-0 bg-white z-10 border-b border-gray-100">
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-xl font-medium text-[#424242]">{title}</h1>
      </div>
    </header>
  );
};

export default Header;
