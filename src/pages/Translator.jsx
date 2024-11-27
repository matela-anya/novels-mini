import React from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import { hapticFeedback } from '../utils/telegram';

const StatNumber = ({ value, label }) => (
 <div className="text-center">
   <div className="text-xl font-medium">{value}</div>
   <div className="text-sm text-gray-500">{label}</div>
 </div>
);

const Translator = () => {
 const { id } = useParams();
 const [translator, setTranslator] = React.useState(null);
 const [isLoading, setIsLoading] = React.useState(true);
 const [error, setError] = React.useState(null);

 React.useEffect(() => {
   const fetchTranslator = async () => {
     try {
       setIsLoading(true);
       const response = await fetch(`/api/translators/${id}`);
       if (!response.ok) throw new Error('Failed to fetch translator data');
       const data = await response.json();
       setTranslator(data);
     } catch (err) {
       setError(err.message);
       hapticFeedback.notificationOccurred('error');
     } finally {
       setIsLoading(false);
     }
   };

   fetchTranslator();
 }, [id]);

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

 if (isLoading || !translator) {
   return (
     <div>
       <Header title="Загрузка..." />
       <div className="animate-pulse p-4 space-y-4">
         <div className="flex items-center space-x-4">
           <div className="w-16 h-16 bg-gray-200 rounded-full" />
           <div className="flex-1">
             <div className="h-6 bg-gray-200 rounded w-1/3" />
             <div className="h-4 bg-gray-200 rounded w-1/4 mt-2" />
           </div>
         </div>
         <div className="h-20 bg-gray-200 rounded-lg" />
         <div className="flex justify-between">
           {[...Array(3)].map((_, i) => (
             <div key={i} className="w-20 h-16 bg-gray-200 rounded" />
           ))}
         </div>
       </div>
     </div>
   );
 }

 return (
   <div className="min-h-screen bg-gray-50">
     <Header title="Профиль переводчика" />

     <div className="container mx-auto px-4 py-6 flex flex-col min-h-[calc(100vh-3.5rem)]">
       {/* Профиль */}
       <div className="flex items-center gap-4 mb-6">
         <img 
           src="/api/placeholder/64/64"
           alt={translator.name}
           className="w-16 h-16 rounded-full"
         />
         <div>
           <h1 className="text-xl font-medium">{translator.name}</h1>
           <p className="text-gray-500">переводчик</p>
         </div>
       </div>

       {/* Описание */}
       {translator.description && (
         <div className="bg-white rounded-lg p-4 mb-6">
           <p className="text-gray-700 whitespace-pre-line">
             {translator.description}
           </p>
         </div>
       )}

       {/* Статистика */}
       <div className="bg-white rounded-lg p-4 mb-6">
         <div className="flex justify-around">
           <StatNumber 
             value={translator.novels_count || 0} 
             label="новелл"
           />
           <div className="w-px bg-gray-200" />
           <StatNumber 
             value={translator.pages_count || 0} 
             label="страниц"
           />
           <div className="w-px bg-gray-200" />
           <StatNumber 
             value={translator.likes_count || 0} 
             label="лайков"
           />
         </div>
       </div>

       {/* Кнопка внизу */}
       <div className="mt-auto">
         <button
           onClick={() => {
             hapticFeedback.impactOccurred('medium');
             // TODO: Implement translator registration
           }}
           className="w-full bg-gray-900 text-white py-3 rounded-full"
         >
           Стать переводчиком
         </button>
       </div>
     </div>
   </div>
 );
};

export default Translator;
