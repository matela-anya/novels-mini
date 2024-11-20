import React from 'react';
import { Link } from 'react-router-dom';
import { loadFromStorage } from '../utils/telegram';

const NovelCard = ({ novel }) => {
  const [progress, setProgress] = React.useState(null);
  const {
    id,
    title,
    description,
    translator,
    total_chapters = 0,
    status = 'в процессе',
    tags = []
  } = novel;

  React.useEffect(() => {
    const loadProgress = async () => {
      const savedProgress = await loadFromStorage(`novel_${id}_progress`);
      if (savedProgress) {
        setProgress(savedProgress);
      }
    };

    loadProgress();
  }, [id]);

  return (
    <Link 
      to={`/novel/${id}`}
      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold flex-1 mr-2">{title}</h2>
          <div className="text-sm text-gray-500 whitespace-nowrap">
            {progress?.lastChapter ? (
              <span className="text-blue-500">
                Глава {progress.currentChapter}
              </span>
            ) : (
              <span>
                {total_chapters} глав
              </span>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-2">
          Перевод: {translator}
        </div>

        {description && (
          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
            {description}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className={`
            px-2 py-0.5 rounded text-xs
            ${status === 'завершён' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}
          `}>
            {status}
          </span>
          
          {tags.map(tag => (
            <span 
              key={tag}
              className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
};

export default NovelCard;
