export function Header() {
  const toggleTheme = () => {
    const body = document.body;
    body.classList.toggle('dark');
    localStorage.setItem('theme', body.classList.contains('dark') ? 'dark' : 'light');
  };

  return `
    <header class="header">
      <h1>Переводы Новелл</h1>
      <button class="theme-toggle" onclick="(${toggleTheme.toString()})()">Переключить тему</button>
    </header>
  `;
}
