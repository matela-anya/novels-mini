import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import NovelCard from '../components/NovelCard';
import { hapticFeedback } from '../utils/telegram';

const Home = () => {
 const [novels, setNovels] = useState([]);
 const [translator, setTranslator] = useState(null);
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
       console.log('Loaded novels:', data); // Лог для новелл
       setNovels(data);

       // Если есть хотя бы одна новелла, загружаем информацию о переводчике
       if (data.length > 0) {
         // Получаем translator_id из первой новеллы
         const translatorId = data[0].translator_id;
         console.log('Translator ID from novel:', translatorId); // Лог для ID переводчика
         
         if (translatorId) {
           const translatorResponse = await fetch(`/api/translators/${translatorId}`);
           if (!translatorResponse.ok) {
             console.error('Translator response error:', await translatorResponse.text()); // Лог для ошибки
             throw new Error('Failed to fetch translator');
           }
           const translatorData = await translatorResponse.json();
           console.log('Loaded translator data:', translatorData); // Лог для данных переводчика
           setTranslator(translatorData);
         }
       }
     } catch (err) {
       console.error('Error loading data:', err);
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
     <div className="min-h-screen bg-white">
       <Header 
         showBack={false} 
         translatorId={null}
         translatorName={null}
       />
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

 if (isLoading) {
   return (
     <div className="min-h-screen bg-white">
       <Header 
         showBack={false}
         translatorId={null}
         translatorName={null}
       />
       <div className="container mx-auto px-4 py-4">
         <div className="h-8 bg-gray-100 rounded w-1/3 mb-6" />
         <div className="space-y-4">
           {[...Array(3)].map((_, i) => (
             <div 
               key={i}
               className="h-24 bg-gray-50 rounded-lg animate-pulse"
             />
           ))}
         </div>
       </div>
     </div>
   );
 }

 return (
   <div className="min-h-screen bg-white">
     <Header 
       showBack={false}
       translatorId={translator?.id}
       translatorName={translator?.name}
     />

     <div className="container mx-auto px-4 py-6">
       <h2 className="text-2xl font-medium text-[#424242] mb-6">
         Все переводы
       </h2>
       
       <div className="space-y-4">
         {novels.map(novel => (
           <NovelCard 
             key={novel.id} 
             novel={novel}
           />
         ))}
       </div>

       {novels.length === 0 && !isLoading && (
         <div className="text-center text-gray-500 py-8">
           Пока нет новелл
         </div>
       )}
     </div>
   </div>
 );
};

export default Home;
