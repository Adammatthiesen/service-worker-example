import type { APIRoute } from 'astro';
import { db, NotificationLog, User, eq } from 'astro:db';
import { getUserFromCookies, hasMinimumRole } from '../../../lib/auth';

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const user = await getUserFromCookies(cookies);
    if (!user || !hasMinimumRole(user, 'moderator')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get notification history
    const notifications = await db
      .select()
      .from(NotificationLog)
      .all();

    // Sort by sentAt descending and apply pagination
    const sortedNotifications = notifications
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(offset, offset + limit);

    // Enrich with sender info
    const enriched = await Promise.all(
      sortedNotifications.map(async (notif) => {
        const sender = await db
          .select()
          .from(User)
          .where(eq(User.id, notif.sentBy))
          .get();

        return {
          ...notif,
          senderName: sender?.displayName || sender?.username || 'Unknown',
          senderEmail: sender?.email,
        };
      })
    );

    return new Response(
      JSON.stringify({
        notifications: enriched,
        total: notifications.length,
        limit,
        offset,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching notification history:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch history' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
