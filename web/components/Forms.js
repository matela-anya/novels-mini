export function NovelForm({ tags }) {
  const tagOptions = tags.map(tag => `<option value="${tag}">${tag}</option>`).join('');

  return `
    <form id="add-novel-form">
      <h2>Добавить Новеллу</h2>
      <label>
        Название:
        <input type="text" name="title" required>
      </label>
      <label>
        Аннотация:
        <textarea name="description" required></textarea>
      </label>
      <label>
        Теги:
        <select name="tags" id="tags-select" multiple required>
          ${tagOptions}
        </select>
      </label>
      <label>
        Всего глав:
        <input type="number" name="totalChapters" required>
      </label>
      <label>
        Автор:
        <input type="text" name="author" required>
      </label>
      <label>
        Год начала:
        <input type="number" name="yearStarted" required>
      </label>
      <button type="submit">Добавить новеллу</button>
    </form>
  `;
}

export function ChapterForm() {
  return `
    <form id="add-chapter-form">
      <h2>Добавить Главу</h2>
      <label>
        Номер главы:
        <input type="number" name="chapterNumber" required>
      </label>
      <label>
        Название главы:
        <input type="text" name="title" required>
      </label>
      <label>
        Текст главы:
        <textarea name="text" required></textarea>
      </label>
      <button type="submit">Добавить главу</button>
    </form>
  `;
}
