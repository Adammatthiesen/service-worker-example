import type { APIRoute } from 'astro';
import { deleteSession } from '../../../lib/auth';

export const POST: APIRoute = async ({ cookies }) => {
  const token = cookies.get('session_token')?.value;

  if (token) {
    await deleteSession(token);
  }

  cookies.delete('session_token', { path: '/' });

  return new Response(
    JSON.stringify({ success: true, message: 'Logged out successfully' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
