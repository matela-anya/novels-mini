import React, { useState } from 'react';
import { hapticFeedback } from '../utils/telegram';

const LikeButton = ({ novelId, chapterId, initialLikes = 0, initialIsLiked = false, userId }) => {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isLoading, setIsLoading] = useState(false);

  const handleLike = async () => {
    if (isLoading || !userId) return;

    try {
      setIsLoading(true);
      hapticFeedback.impactOccurred('light');

      const endpoint = chapterId 
        ? `/api/novels/${novelId}/chapters/${chapterId}/like`
        : `/api/novels/${novelId}/like`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) throw new Error('Failed to update like');

      const data = await response.json();
      setLikes(data.likes_count);
      setIsLiked(data.is_liked);
      
      hapticFeedback.notificationOccurred(data.is_liked ? 'success' : 'warning');
    } catch (err) {
      console.error('Like error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={isLoading || !userId}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg
        transition-colors duration-200
        ${isLiked 
          ? 'bg-red-50 text-red-500' 
          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
        }
        disabled:opacity-50
      `}
    >
      <svg 
        className="w-5 h-5"
        fill={isLiked ? 'currentColor' : 'none'} 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
        />
      </svg>
      <span>{likes}</span>
    </button>
  );
};

export default LikeButton;
