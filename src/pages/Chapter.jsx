import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import LikeButton from '../components/LikeButton';
import Comments from '../components/Comments';
import { hapticFeedback, showMainButton, hideMainButton, getUserData } from '../utils/telegram';
import { saveToStorage } from '../utils/telegram';

const Chapter = () => {
 const { id: novelId, chapterId } = useParams();
 const navigate = useNavigate();
 const [chapter, setChapter] = useState(null);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState(null);
 const [fontSize, setFontSize] = useState(() => {
   const saved = localStorage.getItem('chapter-font-size');
   return saved ? parseInt(saved) : 16;
 });
 const [userData, setUserData] = useState(null);

 useEffect(() => {
   const user = getUserData();
   setUserData(user);
 }, []);

 useEffect(() => {
   const fetchChapter = async () => {
     try {
       setIsLoading(true);
       const response = await fetch(`/api/novels/${novelId}/chapters/${chapterId}`);
       if (!response.ok) throw new Error('Failed to fetch chapter');
       const data = await response.json();
       setChapter(data);

       // Сохраняем прогресс чтения
       await saveToStorage(`novel_${novelId}_progress`, {
         lastChapter: chapterId,
         currentChapter: data.number,
         timestamp: new Date().toISOString()
       });
     } catch (err) {
       setError(err.message);
       hapticFeedback.notificationOccurred('error');
     } finally {
       setIsLoading(false);
     }
   };

   fetchChapter();
 }, [novelId, chapterId, chapter]);

 useEffect(() => {
   if (chapter?.next_chapter) {
     showMainButton({
       text: 'СЛЕДУЮЩАЯ ГЛАВА',
       onClick: () => {
         hapticFeedback.impactOccurred('light');
         navigate(`/novel/${novelId}/chapter/${chapter.next_chapter}`);
       }
     });
   } else {
     hideMainButton();
   }

   return () => hideMainButton();
 }, [chapter, novelId, navigate]);

 // Сохранение позиции прокрутки
 useEffect(() => {
   const savedPosition = sessionStorage.getItem(`chapter-scroll-${chapterId}`);
   if (savedPosition) {
     window.scrollTo(0, parseInt(savedPosition));
   }

   const handleScroll = () => {
     sessionStorage.setItem(`chapter-scroll-${chapterId}`, window.scrollY.toString());
   };

   window.addEventListener('scroll', handleScroll);
   return () => window.removeEventListener('scroll', handleScroll);
 }, [chapterId]);

 // Навигация с клавиатуры
 useEffect(() => {
   const handleKeyPress = (e) => {
     if (e.target.tagName === 'TEXTAREA') return;
     
     if (e.key === 'ArrowLeft' && chapter?.prev_chapter) {
       navigate(`/novel/${novelId}/chapter/${chapter.prev_chapter}`);
     } else if (e.key === 'ArrowRight' && chapter?.next_chapter) {
       navigate(`/novel/${novelId}/chapter/${chapter.next_chapter}`);
     }
   };

   window.addEventListener('keydown', handleKeyPress);
   return () => window.removeEventListener('keydown', handleKeyPress);
 }, [chapter, novelId, navigate, chapterId]);

 const changeFontSize = (delta) => {
   setFontSize(prev => {
     const newSize = prev + delta;
     localStorage.setItem('chapter-font-size', newSize);
     return newSize;
   });
 };

 if (error) {
   return (
     <div>
       <Header title="Ошибка" />
       <div className="container mx-auto px-4 py-8 text-center">
         <p className="text-red-500 mb-4">{error}</p>
         <button 
           onClick={() => window.location.reload()}
           className="px-4 py-2 bg-blue-500 text-white rounded-lg"
         >
           Обновить
         </button>
       </div>
     </div>
   );
 }

 if (isLoading || !chapter) {
   return (
     <div>
       <Header title="Загрузка..." />
       <div className="animate-pulse p-4">
         <div className="h-8 bg-gray-200 rounded mb-4" />
         <div className="space-y-4">
           {[...Array(10)].map((_, i) => (
             <div key={i} className="h-4 bg-gray-200 rounded" />
           ))}
         </div>
       </div>
     </div>
   );
 }

 return (
   <div className="min-h-screen bg-gray-50 pb-20">
     <Header title={`Глава ${chapter.number}`} />

     <div className="container mx-auto px-4 py-6">
       {/* Навигация */}
       <div className="flex items-center justify-between mb-6">
         <Link 
           to={`/novel/${novelId}`}
           className="text-blue-500"
           onClick={() => hapticFeedback.impactOccurred('light')}
         >
           К оглавлению
         </Link>
         <div className="flex items-center gap-2">
           <button
             onClick={() => changeFontSize(-1)}
             className="p-2 rounded-lg bg-gray-100"
           >
             A-
           </button>
           <button
             onClick={() => changeFontSize(1)}
             className="p-2 rounded-lg bg-gray-100"
           >
             A+
           </button>
         </div>
       </div>

       {/* Заголовок */}
       {chapter.title && (
         <h1 className="text-2xl font-bold mb-6">
           {chapter.title}
         </h1>
       )}

       {/* Контент */}
       <div 
         className="prose max-w-none mb-8"
         style={{ fontSize: `${fontSize}px` }}
       >
         {chapter.content.split('\n\n').map((paragraph, index) => (
           <p key={index} className="mb-4">
             {paragraph}
           </p>
         ))}
       </div>

       {/* Навигация между главами */}
       <div className="flex justify-between items-center mb-8">
         {chapter.prev_chapter ? (
           <Link
             to={`/novel/${novelId}/chapter/${chapter.prev_chapter}`}
             className="px-4 py-2 bg-gray-100 rounded-lg"
             onClick={() => hapticFeedback.selectionChanged()}
           >
             ← Предыдущая
           </Link>
         ) : <div />}

         {chapter.next_chapter && (
           <Link
             to={`/novel/${novelId}/chapter/${chapter.next_chapter}`}
             className="px-4 py-2 bg-blue-500 text-white rounded-lg"
             onClick={() => hapticFeedback.selectionChanged()}
           >
             Следующая →
           </Link>
         )}
       </div>

       {/* Лайки */}
       <div className="mb-8 flex justify-center">
         <LikeButton
           novelId={novelId}
           initialLikes={chapter.likes_count || 0}
           initialIsLiked={chapter.user_has_liked || false}
           userId={userData?.id}
         />
       </div>

       {/* Комментарии */}
       <Comments 
         novelId={novelId}
         chapterId={chapterId}
         userId={userData?.id}
       />
     </div>
   </div>
 );
};

export default Chapter;
