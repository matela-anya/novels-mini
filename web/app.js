// Функция для загрузки тегов
async function loadTags() {
  try {
    const response = await fetch('/api/tags');
    if (!response.ok) {
      throw new Error('Ошибка загрузки тегов');
    }
    const tags = await response.json();
    const tagsSelect = document.getElementById('tags-select');
    tagsSelect.innerHTML = ''; // Очистка перед добавлением
    tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      tagsSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Ошибка при загрузке тегов:', error);
  }
}

// Обновление формы для добавления новеллы
document.getElementById('add-novel-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const payload = Object.fromEntries(formData.entries());
  payload.tags = Array.from(formData.getAll('tags')); // Собираем теги из мультивыбора

  try {
    const response = await fetch('/api/novels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      alert('Новелла добавлена!');
      loadTags(); // Обновление списка тегов после добавления
    } else {
      const error = await response.json();
      alert(`Ошибка: ${error.message}`);
    }
  } catch (err) {
    console.error(err);
    alert('Ошибка сети');
  }
});

// Загрузка тегов при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  loadTags();
});
