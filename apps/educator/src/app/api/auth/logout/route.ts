import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? 'https';
  if (!host) return new NextResponse('Missing forwarded host', { status: 400 });
  const response = NextResponse.redirect(new URL('/', `${protocol}://${host}`));
  response.cookies.delete('lms_access_token');
  return response;
}
