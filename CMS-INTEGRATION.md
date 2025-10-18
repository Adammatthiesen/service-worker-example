# CMS Integration Quick Start Guide

## Overview

This Astro project provides a complete CMS-ready push notification system with:
- User authentication and session management
- Role-based access control (Admin, Moderator, User, Subscriber)
- Targeted push notifications (send to all, specific roles, or individual users)
- Admin dashboard for managing notifications
- Complete notification history and analytics

## Key Concepts

### User Roles
- **Admin** - Full access, can send to anyone
- **Moderator** - Can send notifications to all targets
- **User** - Can only subscribe and receive
- **Subscriber** - Basic receive-only access

### Targeting Types
1. **All Users** - Broadcast to everyone subscribed
2. **Role-Based** - Send to users with specific role (e.g., all admins)
3. **User-Specific** - Send to individual user by ID

## Integration Scenarios

### Scenario 1: Content Publishing
When new content is published, notify subscribers:
```javascript
POST /api/push/send-targeted
{
  "targetType": "role",
  "targetValue": "subscriber",
  "title": "New Article Published",
  "message": "Check out our latest post!",
  "url": "/blog/new-post"
}
```

### Scenario 2: Admin Alerts
Notify admins of important system events:
```javascript
POST /api/push/send-targeted
{
  "targetType": "role",
  "targetValue": "admin",
  "title": "System Alert",
  "message": "New user registration requires approval"
}
```

### Scenario 3: Personal Notifications
Send direct messages to specific users:
```javascript
POST /api/push/send-targeted
{
  "targetType": "user",
  "targetValue": "user-abc-123",
  "title": "You have a new message",
  "message": "John Doe replied to your comment"
}
```

## Database Tables

### Users
Store your CMS users with roles:
- Map CMS user accounts to the User table
- Assign appropriate roles based on CMS permissions
- Link push subscriptions to user accounts

### PushSubscription
Track which devices each user has subscribed:
- Users can have multiple devices (phone, desktop, tablet)
- Each device has a unique subscription endpoint
- Automatically cleaned up when subscriptions expire

### NotificationLog
Full audit trail of all notifications:
- Who sent it, when, and to whom
- Delivery success/failure counts
- Complete payload for debugging

## Getting Your Admin Session Token

For programmatic API access from your CMS:

1. Login as admin via the UI at `/login`
2. Open browser DevTools → Application → Cookies
3. Copy the `session_token` value
4. Use it in your CMS API calls:
   ```bash
   curl -H "Cookie: session_token=YOUR_TOKEN_HERE" ...
   ```

**Production:** Create a dedicated service account and store its session token in your CMS environment variables.

## Security Considerations

1. **HTTPS Required** - Push notifications only work over HTTPS (or localhost for dev)
2. **VAPID Keys** - Keep private key secret, never commit to git
3. **Session Tokens** - Expire after 30 days, store securely
4. **Role Validation** - All send endpoints check for moderator+ role
5. **Rate Limiting** - Consider adding rate limits in production

## Testing Checklist

- [ ] Login with each demo account (admin, moderator, user, subscriber)
- [ ] Enable notifications as different roles
- [ ] Send notification to "all users"
- [ ] Send notification to specific role
- [ ] Send notification to specific user ID
- [ ] Check notification history in admin panel
- [ ] Verify role permissions (non-moderators can't access /admin)
- [ ] Test device name detection (open in different browsers)
- [ ] Verify cleanup of expired subscriptions

## Common CMS Hooks

### On New User Registration
```javascript
// Notify admins of new signup
await sendPushNotification('role', 'admin', 'New User', 'Someone just signed up!');
```

### On Content Approval
```javascript
// Notify content author
await sendPushNotification('user', authorUserId, 'Content Approved', 'Your post is live!');
```

### On Comment/Reply
```javascript
// Notify thread participants
await sendPushNotification('user', originalPosterId, 'New Reply', 'Someone replied to your post');
```

### Scheduled Maintenance
```javascript
// Broadcast to all users
await sendPushNotification('all', null, 'Maintenance Alert', 'Site will be down at 2 AM');
```

## Customization Ideas

1. **User Preferences** - Let users choose which notification types they want
2. **Notification Categories** - Add category field (news, alerts, messages)
3. **Quiet Hours** - Don't send notifications during user's sleep hours
4. **Frequency Limits** - Prevent notification spam (max N per day)
5. **Rich Media** - Add images, action buttons to notifications
6. **Sound Selection** - Let users customize notification sounds
7. **Multi-language** - Send notifications in user's preferred language

## Next Steps

1. Replace demo users with your CMS user system
2. Integrate notification triggers in your CMS events
3. Customize the admin UI to match your CMS theme
4. Add role management UI in your CMS
5. Set up production database (Turso recommended)
6. Deploy to your hosting provider
7. Configure VAPID keys in production environment
