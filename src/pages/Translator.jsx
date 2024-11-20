import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import { hapticFeedback } from '../utils/telegram';

const StatCard = ({ title, value }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm">
    <div className="text-gray-600 text-sm mb-1">{title}</div>
    <div className="text-xl font-semibold">{value}</div>
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
        <div className="animate-pulse p-4">
          <div className="h-20 bg-gray-200 rounded-lg mb-4" />
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={translator.name} />

      <div className="container mx-auto px-4 py-6">
        {/* Профиль */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold mb-1">{translator.name}</h1>
              <div className="text-gray-600">переводчик</div>
            </div>
          </div>

          {translator.description && (
            <p className="text-gray-700 mb-4">{translator.description}</p>
          )}
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard 
            title="Новелл" 
            value={translator.stats?.novels_count || 0} 
          />
          <StatCard 
            title="Страниц" 
            value={translator.stats?.pages_count || 0} 
          />
          <StatCard 
            title="Лайков" 
            value={translator.stats?.likes_count || 0} 
          />
        </div>

        {/* Список новелл */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="font-semibold">Переводы</h2>
          </div>
          
          <div className="divide-y">
            {translator.novels?.map(novel => (
              <Link 
                key={novel.id}
                to={`/novel/${novel.id}`}
                className="block p-4 hover:bg-gray-50 transition-colors"
                onClick={() => hapticFeedback.selectionChanged()}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">{novel.title}</h3>
                  <span className="text-sm text-gray-500">
                    {novel.chapters_count} глав
                  </span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs mr-2
                    ${novel.status === 'завершён' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}
                  `}>
                    {novel.status}
                  </span>
                  
                  {novel.tags?.length > 0 && (
                    <div className="flex gap-1">
                      {novel.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-gray-500">
                          #{tag}
                        </span>
                      ))}
                      {novel.tags.length > 3 && (
                        <span className="text-gray-500">...</span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Translator;
