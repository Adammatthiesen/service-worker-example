import type { APIRoute } from 'astro';
import { db, PushSubscription } from 'astro:db';
import { eq } from 'astro:db';
import { getUserFromCookies } from '../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Get authenticated user
    const user = await getUserFromCookies(cookies);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const subscription = await request.json();
    
    // Validate subscription object
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription object' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate a unique ID from the endpoint
    const id = Buffer.from(subscription.endpoint).toString('base64url').substring(0, 50);
    
    // Get device info from user agent
    const userAgent = request.headers.get('user-agent') || '';
    const deviceName = getDeviceName(userAgent);
    
    // Check if subscription already exists
    const existing = await db
      .select()
      .from(PushSubscription)
      .where(eq(PushSubscription.endpoint, subscription.endpoint))
      .get();
    
    if (existing) {
      // Update existing subscription
      await db
        .update(PushSubscription)
        .set({
          userId: user.id,
          keys: subscription.keys,
          deviceName,
          lastUsed: new Date()
        })
        .where(eq(PushSubscription.endpoint, subscription.endpoint));
    } else {
      // Insert new subscription
      await db.insert(PushSubscription).values({
        id,
        userId: user.id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        deviceName,
        lastUsed: new Date(),
      });
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Subscription saved',
        deviceName 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error saving subscription:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to save subscription', details: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Helper to extract device name from user agent
function getDeviceName(userAgent: string): string {
  let browser = 'Unknown';
  let os = 'Unknown';
  
  // Detect browser
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  // Detect OS
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'Mac';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';
  
  return `${browser} on ${os}`;
}
