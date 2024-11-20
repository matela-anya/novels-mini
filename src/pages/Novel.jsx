import React from 'react';

const Novel = () => {
  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">Название новеллы</h1>
        <div className="text-sm text-gray-600 mb-2">переводчик: <span>имя</span></div>
      </div>
      
      <div className="mb-4">
        <h2 className="font-bold mb-2">Описание</h2>
        <p className="text-gray-700">Текст описания</p>
      </div>

      <div>
        <h2 className="font-bold mb-2">Главы</h2>
        <div className="grid gap-2">
          {/* Here will be chapter list */}
        </div>
      </div>
    </div>
  );
};

export default Novel;
