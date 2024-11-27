import React from 'react';
import { Link } from 'react-router-dom';
import { hapticFeedback } from '../utils/telegram';

const NovelCard = ({ novel }) => {
  const {
    id,
    title,
    translator_name,
    total_chapters = 0,
    current_chapter = 0,
    status = 'в процессе'
  } = novel;

  return (
    <Link 
      to={`/novel/${id}`}
      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
      onClick={() => hapticFeedback.impactOccurred('light')}
    >
      <div className="flex h-24 p-3 gap-3">
        <div className="w-16 h-full bg-gray-100 rounded-md flex-shrink-0">
          <img 
            src="/api/placeholder/64/96"
            alt={title}
            className="w-full h-full object-cover rounded-md"
          />
        </div>
        
        <div className="flex flex-col flex-1 min-w-0">
          <h2 className="font-medium text-base line-clamp-2">{title}</h2>
          
          <div className="mt-auto">
            <p className="text-sm text-gray-600">
              перевод: {status}
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 text-sm text-blue-500">
          {current_chapter > 0 
            ? `прочитано ${current_chapter} из ${total_chapters}` 
            : `глав: ${total_chapters}`
          }
        </div>
      </div>
    </Link>
  );
};

export default NovelCard;
