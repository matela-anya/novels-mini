import React from 'react';
import { Link } from 'react-router-dom';
import { hapticFeedback } from '../utils/telegram';

const NovelCard = ({ novel }) => {
  const {
    id,
    title,
    translator,
    total_chapters = 0,
    status = 'в процессе',
    tags = []
  } = novel;

  return (
    <Link 
      to={`/novel/${id}`}
      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
      onClick={() => hapticFeedback.impactOccurred('light')}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold flex-1 mr-2">{title}</h2>
          <div className="text-sm text-gray-500 whitespace-nowrap">
            {total_chapters} глав
          </div>
        </div>
        
        <div className="text-sm text-gray-600 mb-2">
          переводчик: {translator}
        </div>

        <div className="flex flex-wrap gap-1.5">
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
