export function Card({ id, title, cover, totalChapters, tags }) {
  return `
    <div class="card" id="novel-${id}">
      <img src="${cover}" alt="${title}" />
      <div class="info">
        <h3>${title}</h3>
        <p>${totalChapters} глав</p>
        <p>Теги: ${tags.join(', ')}</p>
      </div>
    </div>
  `;
}
