import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { showBackButton, hideBackButton, hapticFeedback } from '../utils/telegram';

const Header = ({ title, showBack = true, translatorId }) => {
 const navigate = useNavigate();
 const location = useLocation();
 const [showMenu, setShowMenu] = useState(false);

 React.useEffect(() => {
   if (showBack && location.pathname !== '/') {
     showBackButton(() => {
       hapticFeedback.impactOccurred('light');
       navigate(-1);
     });
   } else {
     hideBackButton();
   }

   return () => hideBackButton();
 }, [location.pathname, navigate, showBack]);

 const toggleMenu = () => {
   hapticFeedback.impactOccurred('light');
   setShowMenu(!showMenu);
 };

 return (
   <header className="sticky top-0 bg-white z-10">
     <div className="container mx-auto px-4 py-6">
       {location.pathname === '/' ? (
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
             <img 
               src="/api/placeholder/56/56" 
               alt="Translator avatar"
               className="w-14 h-14 rounded-full"
             />
             <div className="flex flex-col">
               <span className="text-sm text-gray-500">переводчик</span>
               <h1 className="text-xl font-medium text-[#424242]">
                 {title}
               </h1>
             </div>
           </div>

           {translatorId && (
             <button 
               onClick={toggleMenu} 
               className="w-8 h-8 flex items-center justify-center"
             >
               <svg 
                 width="24" 
                 height="24" 
                 viewBox="0 0 24 24" 
                 fill="currentColor"
                 className="text-[#424242]"
               >
                 <circle cx="12" cy="12" r="2" />
                 <circle cx="12" cy="5" r="2" />
                 <circle cx="12" cy="19" r="2" />
               </svg>
             </button>
           )}

           {showMenu && translatorId && (
             <div className="absolute top-full right-4 mt-2 w-48 bg-white rounded-lg shadow-lg py-1">
               <Link
                 to={`/translator/${translatorId}`}
                 className="block px-4 py-2 hover:bg-gray-50 text-[#424242]"
                 onClick={() => {
                   setShowMenu(false);
                   hapticFeedback.selectionChanged();
                 }}
               >
                 Профиль переводчика
               </Link>
             </div>
           )}
         </div>
       ) : (
         <h1 className="text-xl font-medium text-[#424242]">{title}</h1>
       )}
     </div>
   </header>
 );
};

export default Header;
