import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import NovelCard from '../components/NovelCard';
import { hapticFeedback, loadFromStorage } from '../utils/telegram';

const Home = () => {
 const [novels, setNovels] = useState([]);
 const [lastRead, setLastRead] = useState(null);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState(null);

 useEffect(() => {
   const fetchData = async () => {
     try {
       setIsLoading(true);
       // Загружаем все новеллы
       const response = await fetch('/api/novels');
       if (!response.ok) throw new Error('Failed to fetch novels');
       const data = await response.json();
       setNovels(data);

       // Проверяем последнюю читаемую новеллу
       const novelIds = data.map(novel => novel.id);
       for (const novelId of novelIds) {
         const progress = await loadFromStorage(`novel_${novelId}_progress`);
         if (progress) {
           const novel = data.find(n => n.id === parseInt(novelId));
           if (novel) {
             setLastRead({
               ...novel,
               lastChapter: progress.lastChapter,
               currentChapter: progress.currentChapter
             });
             break;
           }
         }
       }
     } catch (err) {
       console.error('Error:', err);
       setError(err.message);
       hapticFeedback.notificationOccurred('error');
     } finally {
       setIsLoading(false);
     }
   };

   fetchData();
 }, []);

 if (error) {
   return (
     <div className="min-h-screen bg-gray-50">
       <Header title="Читать новеллы" showBack={false} />
       <div className="text-center py-8">
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

 if (isLoading) {
   return (
     <div className="min-h-screen bg-gray-50">
       <Header title="Читать новеллы" showBack={false} />
       <div className="container mx-auto px-4 py-4 space-y-4">
         {[...Array(3)].map((_, i) => (
           <div 
             key={i}
             className="h-24 bg-white rounded-lg animate-pulse"
           />
         ))}
       </div>
     </div>
   );
 }

 return (
   <div className="min-h-screen bg-gray-50">
     <Header 
       title="Все переводы" 
       showBack={false}
       translatorId={novels[0]?.translator_id}
     />

     <div className="container mx-auto px-4 py-4">
       {lastRead && (
         <div className="mb-6">
           <h2 className="text-lg font-medium mb-3">Продолжить чтение</h2>
           <NovelCard 
             novel={{
               ...lastRead,
               current_chapter: lastRead.currentChapter
             }}
           />
         </div>
       )}

       <div className="space-y-4">
         {novels.map(novel => (
           <NovelCard key={novel.id} novel={novel} />
         ))}
       </div>

       <Link
         to="/translator/new"
         className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg"
         onClick={() => hapticFeedback.impactOccurred('medium')}
       >
         Стать переводчиком
       </Link>
     </div>
   </div>
 );
};

export default Home;
