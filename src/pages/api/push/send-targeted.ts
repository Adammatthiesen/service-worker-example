import type { APIRoute } from 'astro';
import { db, User, PushSubscription, NotificationLog, eq } from 'astro:db';
import webpush from 'web-push';
import { getUserFromCookies, hasMinimumRole } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Check authentication and permissions
    const sender = await getUserFromCookies(cookies);
    if (!sender || !hasMinimumRole(sender, 'moderator')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - moderator role required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get VAPID keys
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

    // Parse request body
    const body = await request.json();
    const { targetType, targetValue, title, message, url, icon } = body;

    if (!targetType || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'targetType, title, and message are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare notification payload
    const payload = {
      title,
      body: message,
      icon: icon || '/favicon.ico',
      url: url || '/',
    };

    // Get target subscriptions based on targetType
    let subscriptions: any[] = [];
    let targetUsers: any[] = [];

    switch (targetType) {
      case 'all':
        // Send to all users
        subscriptions = await db.select().from(PushSubscription).all();
        targetUsers = await db.select().from(User).all();
        break;

      case 'user':
        // Send to specific user by ID
        if (!targetValue) {
          return new Response(
            JSON.stringify({ error: 'targetValue (userId) required for user targetType' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        subscriptions = await db
          .select()
          .from(PushSubscription)
          .where(eq(PushSubscription.userId, targetValue))
          .all();
        const targetUser = await db
          .select()
          .from(User)
          .where(eq(User.id, targetValue))
          .get();
        if (targetUser) targetUsers = [targetUser];
        break;

      case 'role':
        // Send to all users with specific role
        if (!targetValue) {
          return new Response(
            JSON.stringify({ error: 'targetValue (role) required for role targetType' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        targetUsers = await db
          .select()
          .from(User)
          .where(eq(User.role, targetValue))
          .all();
        
        const userIds = targetUsers.map(u => u.id);
        if (userIds.length > 0) {
          // Get all subscriptions for these users
          subscriptions = await db
            .select()
            .from(PushSubscription)
            .all()
            .then(subs => subs.filter(s => userIds.includes(s.userId)));
        }
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid targetType. Must be: all, user, or role' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No subscriptions found for target', sent: 0 }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send notifications
    const results = await Promise.allSettled(
      subscriptions.map((sub) => {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: sub.keys as { p256dh: string; auth: string },
        };
        return webpush.sendNotification(pushSub, JSON.stringify(payload));
      })
    );

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

    // Log the notification
    const logId = crypto.randomUUID();
    await db.insert(NotificationLog).values({
      id: logId,
      title,
      body: message,
      targetType,
      targetValue: targetValue || null,
      sentBy: sender.id,
      recipientCount: targetUsers.length,
      successCount: successful,
      failureCount: failed,
      payload,
    });

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed,
        total: subscriptions.length,
        recipients: targetUsers.length,
        logId,
        message: `Sent ${successful} notifications successfully to ${targetUsers.length} users`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending targeted push:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send notifications', details: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
