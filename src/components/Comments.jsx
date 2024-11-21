import React, { useState, useEffect } from 'react';
import { hapticFeedback } from '../utils/telegram';

const CommentItem = ({ comment, onDelete, userId }) => (
  <div className="border-b last:border-b-0 py-4">
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        {comment.user_photo && (
          <img 
            src={comment.user_photo} 
            alt={comment.user_name}
            className="w-8 h-8 rounded-full"
          />
        )}
        <span className="font-medium">{comment.user_name}</span>
      </div>
      {userId === comment.user_id && (
        <button
          onClick={() => onDelete(comment.id)}
          className="text-red-500 text-sm"
        >
          Удалить
        </button>
      )}
    </div>
    <p className="text-gray-700 whitespace-pre-line">{comment.content}</p>
  </div>
);

const Comments = ({ novelId, chapterId, userId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/novels/${novelId}/chapters/${chapterId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      setComments(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [novelId, chapterId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading || !newComment.trim() || !userId) return;

    try {
      setIsLoading(true);
      hapticFeedback.impactOccurred('light');

      const response = await fetch(`/api/novels/${novelId}/chapters/${chapterId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: newComment,
          userId 
        })
      });

      if (!response.ok) throw new Error('Failed to post comment');

      const comment = await response.json();
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      hapticFeedback.notificationOccurred('success');
    } catch (err) {
      setError(err.message);
      hapticFeedback.notificationOccurred('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      hapticFeedback.impactOccurred('light');

      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) throw new Error('Failed to delete comment');

      setComments(prev => prev.filter(c => c.id !== commentId));
      hapticFeedback.notificationOccurred('success');
    } catch (err) {
      setError(err.message);
      hapticFeedback.notificationOccurred('error');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 bg-gray-50 border-b">
        <h2 className="font-semibold">Комментарии ({comments.length})</h2>
      </div>

      {/* Форма добавления */}
      {userId && (
        <form onSubmit={handleSubmit} className="p-4 border-b">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isLoading}
            placeholder="Написать комментарий..."
            className="
              w-full px-4 py-2 rounded-lg border
              focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:bg-gray-100
              min-h-[100px]
            "
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !newComment.trim()}
              className="
                px-4 py-2 bg-blue-500 text-white rounded-lg
                hover:bg-blue-600 disabled:opacity-50
                transition-colors
              "
            >
              {isLoading ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
        </form>
      )}

      {/* Список комментариев */}
      <div className="p-4">
        {error && (
          <div className="text-center text-red-500 mb-4">
            {error}
          </div>
        )}

        {comments.length > 0 ? (
          <div className="divide-y">
            {comments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onDelete={handleDelete}
                userId={userId}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            Пока нет комментариев
          </div>
        )}
      </div>
    </div>
  );
};

export default Comments;
