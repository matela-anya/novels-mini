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
   <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b z-10">
     <div className="container mx-auto px-4 h-14 flex items-center justify-between">
       <div className="flex items-center gap-3">
         {location.pathname === '/' && (
           <img 
             src="/api/placeholder/40/40" 
             alt="Translator avatar"
             className="w-10 h-10 rounded-full"
           />
         )}
         <div>
           <h1 className="text-lg font-medium">{title}</h1>
           {location.pathname === '/' && (
             <p className="text-sm text-gray-500">переводчик</p>
           )}
         </div>
       </div>

       {translatorId && (
         <button 
           onClick={toggleMenu} 
           className="p-2 hover:bg-gray-100 rounded-full"
         >
           <svg 
             width="24" 
             height="24" 
             viewBox="0 0 24 24" 
             fill="none" 
             stroke="currentColor" 
             strokeWidth="2"
             strokeLinecap="round" 
             strokeLinejoin="round"
           >
             <circle cx="12" cy="12" r="1" />
             <circle cx="12" cy="5" r="1" />
             <circle cx="12" cy="19" r="1" />
           </svg>
         </button>
       )}

       {showMenu && translatorId && (
         <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1">
           <Link
             to={`/translator/${translatorId}`}
             className="block px-4 py-2 hover:bg-gray-100"
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
   </header>
 );
};

export default Header;
