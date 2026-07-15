export function buildOpenApiSpec(baseUrl = 'http://localhost:3000') {
  return {
    openapi: '3.0.3',
    info: {
      title: 'BusTrack API',
      version: '1.0.0',
      description: 'REST API for real-time bus tracking MVP.',
    },
    servers: [{ url: `${baseUrl}/v1` }],
    paths: {
      '/health': { get: { summary: 'Health check', responses: { '200': { description: 'API healthy' } } } },
      '/auth/register': { post: { summary: 'Register', responses: { '201': { description: 'Created' } } } },
      '/auth/login': { post: { summary: 'Login', responses: { '200': { description: 'Authenticated' } } } },
      '/routes': { get: { summary: 'List routes', responses: { '200': { description: 'Route summaries' } } } },
      '/routes/{routeId}': {
        get: {
          summary: 'Route details',
          parameters: [{ name: 'routeId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Route details' } },
        },
      },
      '/buses': { get: { summary: 'List buses', responses: { '200': { description: 'Bus summaries' } } } },
      '/buses/{busId}': {
        get: {
          summary: 'Bus details',
          parameters: [{ name: 'busId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Bus details' } },
        },
      },
      '/buses/{busId}/eta': {
        get: {
          summary: 'Bus ETA',
          parameters: [
            { name: 'busId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'boardingStopId', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'destinationStopId', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'ETA details' } },
        },
      },
    },
  };
}
