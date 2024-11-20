import React from 'react';
import { Link } from 'react-router-dom';

const NovelCard = ({ novel }) => {
  const {
    id,
    title,
    translator,
    totalChapters = 0,
    completedChapters = 0,
    status = 'в процессе',
    tags = []
  } = novel;

  return (
    <Link to={`/novel/${id}`}>
      <div className="p-4 border rounded-lg shadow hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <div className="text-sm text-gray-500">
            {completedChapters} из {totalChapters}
          </div>
        </div>
        
        <div className="text-sm text-gray-600 mb-2">
          переводчик: {translator}
        </div>
        
        <div className="text-sm text-gray-500 mb-2">
          перевод: {status}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map(tag => (
              <span 
                key={tag} 
                className="px-2 py-1 bg-gray-100 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};

export default NovelCard;
