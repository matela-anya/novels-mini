// Инициализация Telegram WebApp
export const initTelegramApp = () => {
  return new Promise((resolve, reject) => {
    try {
      // Проверяем, был ли уже загружен скрипт
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        resolve(tg);
        return;
      }

      // Загружаем скрипт Telegram WebApp
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.async = true;

      script.onload = () => {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        resolve(tg);
      };

      script.onerror = () => {
        reject(new Error('Failed to load Telegram WebApp script'));
      };

      document.head.appendChild(script);
    } catch (error) {
      reject(error);
    }
  });
};

// Работа с CloudStorage
export const saveToStorage = async (key, value) => {
  try {
    if (!window.Telegram?.WebApp?.CloudStorage) {
      throw new Error('CloudStorage is not available');
    }

    await window.Telegram.WebApp.CloudStorage.setItem(
      key, 
      typeof value === 'string' ? value : JSON.stringify(value)
    );
    return true;
  } catch (err) {
    console.error('Error saving to storage:', err);
    return false;
  }
};

export const loadFromStorage = async (key) => {
  try {
    if (!window.Telegram?.WebApp?.CloudStorage) {
      throw new Error('CloudStorage is not available');
    }

    const data = await window.Telegram.WebApp.CloudStorage.getItem(key);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  } catch (err) {
    console.error('Error loading from storage:', err);
    return null;
  }
};

// Вспомогательные функции для работы с UI элементами Telegram
export const showMainButton = (params = {}) => {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  const mainButton = tg.MainButton;
  const { text, color, textColor, onClick } = params;

  if (text) mainButton.setText(text);
  if (color) mainButton.setBackgroundColor(color);
  if (textColor) mainButton.setTextColor(textColor);
  if (onClick) mainButton.onClick(onClick);

  mainButton.show();
};

export const hideMainButton = () => {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  
  tg.MainButton.hide();
};

export const showBackButton = (onClick) => {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  if (onClick) {
    tg.BackButton.onClick(onClick);
  }
  tg.BackButton.show();
};

export const hideBackButton = () => {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  
  tg.BackButton.hide();
};

// Работа с темой
export const getCurrentTheme = () => {
  const tg = window.Telegram?.WebApp;
  if (!tg) return 'light';
  
  return tg.colorScheme || 'light';
};

// Утилиты для безопасной области
export const getSafeAreaInsets = () => {
  const tg = window.Telegram?.WebApp;
  if (!tg) return { top: 0, bottom: 0, left: 0, right: 0 };

  return {
    top: tg.safeAreaInset?.top || 0,
    bottom: tg.safeAreaInset?.bottom || 0,
    left: tg.safeAreaInset?.left || 0,
    right: tg.safeAreaInset?.right || 0
  };
};

// Работа с пользовательскими данными
export const getUserData = () => {
  const tg = window.Telegram?.WebApp;
  if (!tg) return null;

  return {
    id: tg.initDataUnsafe?.user?.id,
    firstName: tg.initDataUnsafe?.user?.first_name,
    lastName: tg.initDataUnsafe?.user?.last_name,
    username: tg.initDataUnsafe?.user?.username,
    languageCode: tg.initDataUnsafe?.user?.language_code
  };
};

// Haptic feedback
export const hapticFeedback = {
  impactOccurred: (style = 'medium') => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.HapticFeedback) return;
    
    tg.HapticFeedback.impactOccurred(style);
  },
  notificationOccurred: (type = 'success') => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.HapticFeedback) return;
    
    tg.HapticFeedback.notificationOccurred(type);
  },
  selectionChanged: () => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.HapticFeedback) return;
    
    tg.HapticFeedback.selectionChanged();
  }
};

// Утилиты для работы с версией WebApp
export const isVersionAtLeast = (version) => {
  const tg = window.Telegram?.WebApp;
  if (!tg) return false;
  
  return tg.isVersionAtLeast(version);
};
