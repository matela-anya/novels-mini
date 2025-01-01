export default async function handler(request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers, status: 204 });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }), 
      { headers, status: 405 }
    );
  }

  try {
    // Получаем тип операции из параметров запроса
    const url = new URL(request.url);
    const operation = url.searchParams.get('operation');

    console.log(`Starting operation: ${operation}`);

    switch(operation) {
      case 'drop':
        await dropTables();
        return new Response(
          JSON.stringify({ success: true, message: 'Tables dropped successfully' }), 
          { headers }
        );

      case 'create':
        await createTables();
        return new Response(
          JSON.stringify({ success: true, message: 'Tables created successfully' }), 
          { headers }
        );

      case 'indexes':
        await createIndexes();
        return new Response(
          JSON.stringify({ success: true, message: 'Indexes created successfully' }), 
          { headers }
        );

      case 'test-data':
        await insertTestData();
        return new Response(
          JSON.stringify({ success: true, message: 'Test data inserted successfully' }), 
          { headers }
        );

      default:
        // Пытаемся выполнить всё сразу (для обратной совместимости)
        await dropTables();
        await createTables();
        await createIndexes();
        await insertTestData();
        return new Response(
          JSON.stringify({ success: true, message: 'Database initialized successfully' }), 
          { headers }
        );
    }
  } catch (error) {
    console.error('Operation failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal Server Error',
        stack: error.stack
      }), 
      { headers, status: 500 }
    );
  }
}
