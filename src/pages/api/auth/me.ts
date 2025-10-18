import type { APIRoute } from 'astro';
import { getUserFromCookies } from '../../../lib/auth';

export const GET: APIRoute = async ({ cookies }) => {
  const user = await getUserFromCookies(cookies);

  if (!user) {
    return new Response(
      JSON.stringify({ authenticated: false, user: null }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ authenticated: true, user }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
