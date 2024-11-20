// src/utils/telegram.js
export const initTelegramApp = () => {
  // Connect to Telegram WebApp
  const script = document.createElement('script');
  script.src = 'https://telegram.org/js/telegram-web-app.js';
  script.async = true;
  document.head.appendChild(script);
  
  return new Promise((resolve) => {
    script.onload = () => {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      resolve(tg);
    };
  });
};

// CloudStorage helper functions
export const saveToStorage = async (key, value) => {
  try {
    await window.Telegram.WebApp.CloudStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error('Error saving to storage:', err);
    return false;
  }
};

export const loadFromStorage = async (key) => {
  try {
    const data = await window.Telegram.WebApp.CloudStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Error loading from storage:', err);
    return null;
  }
};
