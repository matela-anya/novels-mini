// Проверка, запущено ли приложение в Telegram WebApp
const isTelegramWebView = () => {
  try {
    return window.Telegram && window.Telegram.WebApp;
  } catch {
    return false;
  }
};

// Инициализация Telegram WebApp
export const initTelegramApp = () => {
  return new Promise((resolve, reject) => {
    try {
      // Проверяем, был ли уже загружен скрипт
      if (window.Telegram?.WebApp) {
        console.log('Telegram WebApp already initialized');
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        // Логируем информацию о пользователе и инициализации
        console.log('WebApp Info:', {
          user: tg.initDataUnsafe?.user,
          version: tg.version,
          platform: tg.platform,
          colorScheme: tg.colorScheme,
          themeParams: tg.themeParams,
        });
        
        resolve(tg);
        return;
      }

      console.log('Initializing Telegram WebApp...');

      // Загружаем скрипт Telegram WebApp если он ещё не загружен
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-web-app.js';
      script.async = true;

      script.onload = () => {
        // Проверяем успешность инициализации
        if (!window.Telegram?.WebApp) {
          reject(new Error('Telegram WebApp failed to initialize'));
          return;
        }

        const tg = window.Telegram.WebApp;

        // Проверяем валидность initData
        if (!tg.initDataUnsafe || !tg.initData) {
          console.warn('WebApp initialization data is missing');
        }

        console.log('WebApp successfully initialized');

        tg.ready();
        tg.expand();

        // Настраиваем основные параметры
        tg.MainButton.setParams({
          text_color: '#FFFFFF',
          color: '#2481cc',
        });

        // Применяем тему
        document.documentElement.setAttribute('data-theme', tg.colorScheme || 'light');

        resolve(tg);
      };

      script.onerror = () => {
        reject(new Error('Failed to load Telegram WebApp script'));
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error('Error initializing Telegram WebApp:', error);
      reject(error);
    }
  });
};

// Работа с CloudStorage
export const saveToStorage = async (key, value) => {
  try {
    if (!isTelegramWebView()) {
      throw new Error('Not in Telegram WebApp environment');
    }

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
    if (!isTelegramWebView()) {
      throw new Error('Not in Telegram WebApp environment');
    }

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
  if (!isTelegramWebView()) return;

  const mainButton = window.Telegram.WebApp.MainButton;
  const { text, color, textColor, onClick } = params;

  if (text) mainButton.setText(text);
  if (color) mainButton.setBackgroundColor(color);
  if (textColor) mainButton.setTextColor(textColor);
  if (onClick) mainButton.onClick(onClick);

  mainButton.show();
};

export const hideMainButton = () => {
  if (!isTelegramWebView()) return;
  window.Telegram.WebApp.MainButton.hide();
};

export const showBackButton = (onClick) => {
  if (!isTelegramWebView()) return;

  const backButton = window.Telegram.WebApp.BackButton;
  if (onClick) {
    backButton.onClick(onClick);
  }
  backButton.show();
};

export const hideBackButton = () => {
  if (!isTelegramWebView()) return;
  window.Telegram.WebApp.BackButton.hide();
};

// Работа с темой
export const getCurrentTheme = () => {
  if (!isTelegramWebView()) return 'light';
  return window.Telegram.WebApp.colorScheme || 'light';
};

// Утилиты для безопасной области
export const getSafeAreaInsets = () => {
  if (!isTelegramWebView()) {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const tg = window.Telegram.WebApp;
  return {
    top: tg.safeAreaInset?.top || 0,
    bottom: tg.safeAreaInset?.bottom || 0,
    left: tg.safeAreaInset?.left || 0,
    right: tg.safeAreaInset?.right || 0
  };
};

// Работа с пользовательскими данными
export const getUserData = () => {
  if (!isTelegramWebView()) return null;

  const tg = window.Telegram.WebApp;
  const user = tg.initDataUnsafe?.user;

  if (!user) {
    console.warn('User data is not available');
    return null;
  }

  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    languageCode: user.language_code,
    isPremium: user.is_premium
  };
};

// Haptic feedback
export const hapticFeedback = {
  impactOccurred: (style = 'medium') => {
    if (!isTelegramWebView() || !window.Telegram.WebApp.HapticFeedback) return;
    window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
  },
  notificationOccurred: (type = 'success') => {
    if (!isTelegramWebView() || !window.Telegram.WebApp.HapticFeedback) return;
    window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
  },
  selectionChanged: () => {
    if (!isTelegramWebView() || !window.Telegram.WebApp.HapticFeedback) return;
    window.Telegram.WebApp.HapticFeedback.selectionChanged();
  }
};

// Утилиты для проверки версии
export const isVersionAtLeast = (version) => {
  if (!isTelegramWebView()) return false;
  return window.Telegram.WebApp.isVersionAtLeast(version);
};

export const getWebAppVersion = () => {
  if (!isTelegramWebView()) return null;
  return window.Telegram.WebApp.version;
};
