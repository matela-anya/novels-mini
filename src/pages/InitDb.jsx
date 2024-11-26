import React from 'react';

const InitDb = () => {
  const [status, setStatus] = React.useState(null);
  const [error, setError] = React.useState(null);

  const initDatabase = async () => {
    try {
      setStatus('Initializing...');
      const response = await fetch('/api/init-db', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to initialize database');
      
      setStatus('Database initialized successfully!');
      setError(null);
    } catch (err) {
      setError(err.message);
      setStatus(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold">Database Initialization</h1>
        
        <button
          onClick={initDatabase}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Initialize Database
        </button>

        {status && (
          <div className="text-green-600">
            {status}
          </div>
        )}

        {error && (
          <div className="text-red-500">
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default InitDb;
