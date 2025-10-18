import type { APIRoute } from 'astro';
import { db, PushSubscription, eq } from 'astro:db';
import webpush from 'web-push';

// Simplified endpoint that sends to the current user's subscription
export const POST: APIRoute = async () => {
  try {
    const vapidPublicKey = import.meta.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = import.meta.env.VAPID_PRIVATE_KEY;
    const vapidSubject = import.meta.env.VAPID_SUBJECT || 'mailto:admin@example.com';
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    
    const payload = {
      title: '🎉 Test Notification',
      body: 'If you can see this, push notifications are working!',
      icon: '/favicon.ico',
      url: '/'
    };
    
    // Get all subscriptions
    const subscriptions = await db.select().from(PushSubscription).all();
    
    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No subscriptions found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map((sub) => {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: sub.keys as { p256dh: string; auth: string }
        };
        return webpush.sendNotification(pushSub, JSON.stringify(payload));
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        total: subscriptions.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
