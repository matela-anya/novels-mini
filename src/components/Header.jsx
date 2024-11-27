import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { showBackButton, hideBackButton, hapticFeedback } from '../utils/telegram';

const Header = ({ title, showBack = true, translatorId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);

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

  const toggleMenu = () => {
    hapticFeedback.impactOccurred('light');
    setShowMenu(!showMenu);
  };

  if (location.pathname === '/') {
    return (
      <header className="sticky top-0 bg-white z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden">
                <img 
                  src="/api/placeholder/56/56" 
                  alt="Translator avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="text-sm text-gray-500">переводчик</div>
                <div className="text-xl text-[#424242]">Саня</div>
              </div>
            </div>

            <button 
              onClick={toggleMenu} 
              className="w-8 h-8 flex items-center justify-center text-[#424242]"
            >
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </div>

          {showMenu && translatorId && (
            <div className="absolute right-4 mt-2 w-48 bg-white rounded-lg shadow-lg py-1">
              <Link
                to={`/translator/${translatorId}`}
                className="block px-4 py-2 hover:bg-gray-50 text-[#424242]"
                onClick={() => {
                  setShowMenu(false);
                  hapticFeedback.selectionChanged();
                }}
              >
                Профиль переводчика
              </Link>
            </div>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 bg-white z-10">
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-xl font-medium text-[#424242]">{title}</h1>
      </div>
    </header>
  );
};

export default Header;
