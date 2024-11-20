import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { showBackButton, hideBackButton, hapticFeedback } from '../utils/telegram';

const Header = ({ title, showBack = true }) => {
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

  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b z-10">
      <div className="container mx-auto px-4 h-14 flex items-center">
        <h1 className="text-lg font-medium">
          {title || 'Читать новеллы'}
        </h1>
      </div>
    </header>
  );
};

export default Header;
