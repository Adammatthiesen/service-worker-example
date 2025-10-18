import type { APIRoute } from 'astro';
import { db, PushSubscription } from 'astro:db';
import { eq } from 'astro:db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const endpoint = body.endpoint;
    
    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Endpoint required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Delete subscription from database
    await db
      .delete(PushSubscription)
      .where(eq(PushSubscription.endpoint, endpoint));
    
    return new Response(
      JSON.stringify({ success: true, message: 'Subscription removed' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error removing subscription:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to remove subscription' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
