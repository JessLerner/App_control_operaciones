const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzKh9PhBkGd4u4Xpdg2iuezywSun6Kk6E5E0KarsMBhsRewxstt53qCpjx04QHZy6Px/exec';

export async function onRequestPost(context: { request: Request }): Promise<Response> {
  const body = await context.request.text();
  try {
    const upstream = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
    });
    const content = await upstream.text();
    return new Response(content, {
      status: upstream.ok ? 200 : upstream.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ status: 'error', message: 'No se pudo contactar Google Sheets.' }, { status: 502 });
  }
}
