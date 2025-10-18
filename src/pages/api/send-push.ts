import type { APIRoute } from 'astro';
import { db, eq, PushSubscription } from 'astro:db';
import webpush from 'web-push';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get VAPID keys from environment
    const vapidPublicKey = import.meta.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = import.meta.env.VAPID_PRIVATE_KEY;
    const vapidSubject = import.meta.env.VAPID_SUBJECT || 'mailto:admin@example.com';
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Set VAPID details
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );
    
    // Get notification payload from request
    let payload = {
      title: 'Test Notification',
      body: 'This is a test notification from your Astro app!',
      icon: '/favicon.ico',
      url: '/'
    };
    
    try {
      const requestBody = await request.json();
      payload = { ...payload, ...requestBody };
    } catch {
      // Use default payload if no body provided
    }
    
    // Get all subscriptions from database
    const subscriptions = await db.select().from(PushSubscription).all();
    
    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No subscriptions found', sent: 0 }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Send push notification to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: sub.keys as { p256dh: string; auth: string }
        };
        
        return webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );
      })
    );
    
    // Count successful sends
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    // Remove failed subscriptions (expired/invalid)
    const failedEndpoints = results
      .map((result, index) => ({ result, sub: subscriptions[index] }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ sub }) => sub.endpoint);
    
    if (failedEndpoints.length > 0) {
      for (const endpoint of failedEndpoints) {
        await db
          .delete(PushSubscription)
          .where(eq(PushSubscription.endpoint, endpoint));
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed,
        total: subscriptions.length,
        message: `Sent ${successful} notifications successfully`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send push notifications', details: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
