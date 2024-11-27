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
          <div className="flex items-center justify-between">
            {translatorId ? (
              <Link 
                to={`/translator/${translatorId}`}
                className="flex items-center gap-4"
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
            
            {translatorId && (
              <button 
                className="p-2 rounded-full hover:bg-gray-100"
                onClick={() => {
                  hapticFeedback.impactOccurred('light');
                  navigate(`/translator/${translatorId}`);
                }}
              >
                <svg 
                  className="w-6 h-6 text-gray-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>
            )}
          </div>
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
