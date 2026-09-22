import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  return NextResponse.json(
    { authenticated: Boolean(cookieStore.get('lms_access_token')?.value) },
    { headers: { 'cache-control': 'no-store' } },
  );
}
