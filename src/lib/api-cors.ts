const ALLOWED_METHODS = 'POST, OPTIONS';
const ALLOWED_HEADERS = 'Authorization, Content-Type';

function isAllowedOrigin(origin: string) {
  const configuredOrigins = (process.env.APP_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (configuredOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV === 'production') return false;

  try {
    const url = new URL(origin);
    return (
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

export function withApiCors(request: Request, response: Response) {
  const origin = request.headers.get('origin');
  if (!origin || origin === new URL(request.url).origin) return response;

  if (!isAllowedOrigin(origin)) {
    return Response.json(
      { success: false, error: 'A origem não está autorizada para esta API.' },
      { status: 403 },
    );
  }

  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
  headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  headers.set('Access-Control-Max-Age', '600');
  headers.set(
    'Vary',
    [headers.get('Vary'), 'Origin'].filter(Boolean).join(', '),
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function apiOptions(request: Request) {
  return withApiCors(request, new Response(null, { status: 204 }));
}
