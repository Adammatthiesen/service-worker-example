# 🔔 Astro Push Notifications Demo

A complete CMS-ready example of implementing web push notifications in an Astro project with **user authentication**, **role-based permissions**, and **AstroDB** for data storage.

## Features

- ✅ **User Authentication** with session management
- ✅ **Role-Based Access Control** (Admin, Moderator, User, Subscriber)
- ✅ **Service Worker** for handling push notifications
- ✅ **AstroDB** for storing users, sessions, subscriptions, and logs
- ✅ **Targeted Notifications** - Send to specific users or roles
- ✅ **Admin Dashboard** for managing notifications
- ✅ **Notification History** with tracking and analytics
- ✅ **Web Push** with VAPID authentication
- ✅ **Device Management** - Track multiple devices per user
- ✅ **TypeScript** support throughout

## User Roles & Permissions

| Role           | Can Subscribe | Can Send Notifications | Can Access Admin |
| -------------- | ------------- | ---------------------- | ---------------- |
| **Admin**      | ✅             | ✅ (all features)       | ✅                |
| **Moderator**  | ✅             | ✅ (all features)       | ✅                |
| **User**       | ✅             | ❌                      | ❌                |
| **Subscriber** | ✅             | ❌                      | ❌                |

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate VAPID Keys

VAPID keys are required for web push authentication:

```bash
npm run generate-vapid
```

This will output something like:

```
VAPID_PUBLIC_KEY=BOX...
VAPID_PRIVATE_KEY=abc...
VAPID_SUBJECT=mailto:your-email@example.com
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:your-email@example.com
```

⚠️ **Important:** Never commit your `.env` file or share your private key!

### 4. Initialize the Database

Initialize the AstroDB schema and seed demo users:

```bash
npx astro db push
```

This creates 4 demo accounts (all use password: `password123`):
- **admin@example.com** - Full admin access
- **moderator@example.com** - Can send notifications
- **user@example.com** - Regular user
- **subscriber@example.com** - Basic subscriber

For a remote database (production), use:

```bash
npx astro db push --remote
```

See the [Astro DB documentation](https://docs.astro.build/en/guides/astro-db/) for connecting to libSQL databases like Turso.

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:4321` and login with one of the demo accounts.

## Usage Guide

### For End Users

1. **Login** at `/login` with your credentials
2. **Enable Notifications** - Click the button and grant permission
3. **Receive Notifications** - You'll get push notifications sent by admins/moderators
4. **Manage Subscription** - Disable notifications anytime from your dashboard

### For Admins/Moderators

1. **Access Admin Dashboard** at `/admin`
2. **Send Targeted Notifications:**
   - **All Users** - Broadcast to everyone
   - **Specific Role** - Send to admins, moderators, users, or subscribers only
   - **Specific User** - Send to individual user by ID
3. **View History** - See all sent notifications with delivery stats
4. **Quick Actions** - One-click send to role groups

### API Endpoints for CMS Integration

#### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout current session
- `GET /api/auth/me` - Get current user info

#### Push Subscriptions
- `POST /api/subscribe` - Save user's push subscription (requires auth)
- `POST /api/unsubscribe` - Remove subscription (requires auth)

#### Sending Notifications
- `POST /api/push/send-targeted` - Send targeted notifications (moderator+ only)
  ```json
  {
    "targetType": "role", // "all", "role", or "user"
    "targetValue": "admin", // role name or user ID
    "title": "Important Update",
    "message": "Your notification message",
    "url": "/page",
    "icon": "/icon.png"
  }
  ```

- `GET /api/push/history` - Get notification history (moderator+ only)

## Project Structure

```
├── db/
│   ├── config.ts          # AstroDB schema (Users, Sessions, Subscriptions, Logs)
│   └── seed.ts            # Demo user seed data
├── public/
│   ├── sw.js              # Service worker for push events
│   └── push-client.js     # Client-side subscription management
├── scripts/
│   └── generate-vapid.js  # VAPID key generation utility
├── src/
│   ├── lib/
│   │   └── auth.ts        # Authentication utilities
│   └── pages/
│       ├── index.astro    # User dashboard
│       ├── login.astro    # Login page
│       ├── admin.astro    # Admin dashboard
│       └── api/
│           ├── auth/
│           │   ├── login.ts
│           │   ├── logout.ts
│           │   └── me.ts
│           └── push/
│               ├── send-targeted.ts     # Targeted push endpoint
│               └── history.ts           # Notification history
├── astro.config.mjs       # Astro config with DB integration
└── package.json
```

## Database Schema

### User Table
- `id` - Unique user ID
- `email` - User email (unique)
- `username` - Username (unique)
- `passwordHash` - Bcrypt password hash
- `role` - User role (admin/moderator/user/subscriber)
- `displayName` - Display name
- `active` - Account status

### Session Table
- `id` - Session ID
- `userId` - Foreign key to User
- `token` - Session token (unique)
- `expiresAt` - Expiration date

### PushSubscription Table
- `id` - Subscription ID
- `userId` - Foreign key to User
- `endpoint` - Push endpoint URL (unique)
- `keys` - Push keys (p256dh, auth)
- `deviceName` - Device identifier

### NotificationLog Table
- `id` - Log ID
- `title` - Notification title
- `body` - Notification body
- `targetType` - Target type (all/role/user)
- `targetValue` - Target value (role or user ID)
- `sentBy` - Foreign key to User (sender)
- `recipientCount` - Number of target users
- `successCount` - Successful sends
- `failureCount` - Failed sends

## How It Works

### 1. Service Worker Registration

The client (`public/push-client.js`) registers a service worker (`public/sw.js`) that:
- Listens for `push` events
- Displays notifications using the Notifications API
- Handles notification clicks

### 2. Push Subscription

When a user clicks "Enable Notifications":
1. Browser requests notification permission
2. Service worker subscribes to push using the VAPID public key
3. Subscription details are sent to `/api/subscribe`
4. Subscription is stored in AstroDB

### 3. Sending Notifications

The `/api/send-push` endpoint:
1. Retrieves all subscriptions from AstroDB
2. Uses the `web-push` library with VAPID keys
3. Sends push notifications to each subscription
4. Removes invalid/expired subscriptions

### 4. Database Schema

```typescript
const PushSubscription = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    endpoint: column.text({ unique: true }),
    keys: column.json(), // { p256dh, auth }
    createdAt: column.date({ default: new Date() }),
  }
});
```

## API Endpoints

### `GET /api/vapid-public-key`
Returns the VAPID public key for client-side subscription.

### `POST /api/subscribe`
Saves a push subscription to the database.

**Body:**
```json
{
  "endpoint": "https://...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

### `POST /api/unsubscribe`
Removes a subscription from the database.

**Body:**
```json
{
  "endpoint": "https://..."
}
```

### `POST /api/send-push`
Sends a push notification to all subscriptions.

**Body (optional):**
```json
{
  "title": "Custom Title",
  "body": "Custom message",
  "icon": "/icon.png",
  "url": "/some-page"
}
```

### `POST /api/send-test-push`
Quick endpoint to send a test notification to all subscriptions.

## Testing

### 1. User Authentication Flow
```bash
# Login as admin
curl -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Check current user
curl http://localhost:4321/api/auth/me --cookie "session_token=YOUR_TOKEN"
```

### 2. Subscribe to Notifications
- Login to the app
- Click "Enable Notifications"
- Grant permission when prompted

### 3. Send Targeted Notifications

**Via Admin UI:**
- Go to `/admin`
- Fill out the form
- Select target type (all/role/user)
- Click "Send Notification"

**Via API:**
```bash
# Send to all users
curl -X POST http://localhost:4321/api/push/send-targeted \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=YOUR_TOKEN" \
  -d '{
    "targetType":"all",
    "title":"System Update",
    "message":"Maintenance scheduled for tonight"
  }'

# Send to specific role
curl -X POST http://localhost:4321/api/push/send-targeted \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=YOUR_TOKEN" \
  -d '{
    "targetType":"role",
    "targetValue":"admin",
    "title":"Admin Alert",
    "message":"Please review pending items"
  }'

# Send to specific user
curl -X POST http://localhost:4321/api/push/send-targeted \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=YOUR_TOKEN" \
  -d '{
    "targetType":"user",
    "targetValue":"user-1",
    "title":"Personal Message",
    "message":"You have a new message"
  }'
```

### 4. View Notification History
```bash
curl http://localhost:4321/api/push/history?limit=10 \
  -H "Cookie: session_token=YOUR_TOKEN"
```

## CMS Integration Guide

### Adding to Your CMS

This example can be integrated into any CMS by:

1. **User System Integration:**
   - Replace the demo users with your CMS user system
   - Map CMS roles to notification permissions
   - Use existing authentication instead of the built-in system

2. **Admin UI Integration:**
   - Embed the admin dashboard in your CMS admin panel
   - Customize the UI to match your CMS theme
   - Add role management for notification permissions

3. **Notification Triggers:**
   - Call `/api/push/send-targeted` from your CMS events
   - Trigger notifications on content publish, user actions, etc.
   - Schedule notifications using your CMS cron/scheduler

### Example: WordPress Integration

```php
// Send notification on post publish
add_action('publish_post', 'send_push_notification');

function send_push_notification($post_id) {
    $post = get_post($post_id);
    
    $data = array(
        'targetType' => 'role',
        'targetValue' => 'subscriber',
        'title' => 'New Post Published',
        'message' => $post->post_title,
        'url' => get_permalink($post_id)
    );
    
    wp_remote_post('https://your-astro-app.com/api/push/send-targeted', array(
        'headers' => array('Content-Type' => 'application/json'),
        'body' => json_encode($data),
        'cookies' => array('session_token' => get_admin_session_token())
    ));
}
```

### Example: Node.js CMS Integration

```javascript
// Send notification from your CMS backend
async function sendPushNotification(targetType, targetValue, title, message) {
  const response = await fetch('https://your-astro-app.com/api/push/send-targeted', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session_token=${process.env.ADMIN_SESSION_TOKEN}`
    },
    body: JSON.stringify({
      targetType,
      targetValue,
      title,
      message,
      url: '/'
    })
  });
  
  return response.json();
}

// Usage examples
await sendPushNotification('all', null, 'Maintenance', 'Site will be down tonight');
await sendPushNotification('role', 'admin', 'Admin Alert', 'New user signup');
await sendPushNotification('user', 'user-123', 'Message', 'You have a new comment');
```

## Deployment

### Environment Variables

Set these in your production environment:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

### Database

For production, connect to a libSQL database:

1. **Using Turso:**
   ```bash
   # Create database
   turso db create my-push-db
   
   # Get connection details
   turso db show my-push-db
   turso db tokens create my-push-db
   
   # Set environment variables
   ASTRO_DB_REMOTE_URL=libsql://...
   ASTRO_DB_APP_TOKEN=...
   
   # Push schema
   npm run db:push
   ```

2. **Configure in your hosting platform** (Vercel, Netlify, Cloudflare, etc.)

### Build

```bash
npm run build
```

The built site will be in `dist/` with server-side rendering enabled.

## Browser Compatibility

Push notifications require:
- Service Worker support
- Push API support
- HTTPS (or localhost for development)

Supported browsers:
- Chrome/Edge 42+
- Firefox 44+
- Safari 16+ (macOS 13+, iOS 16.4+)
- Opera 29+

## Troubleshooting

### "VAPID keys not configured"
- Ensure `.env` file exists with valid VAPID keys
- Restart the dev server after creating `.env`

### "Permission denied"
- User must grant notification permission
- Check browser settings if permission was previously denied

### "Service Worker registration failed"
- Ensure you're on HTTPS or localhost
- Check browser console for errors
- Clear browser cache and service workers

### Database errors
- Run `npx astro db push` to initialize schema
- Check that `@astrojs/db` is installed
- Ensure `astro.config.mjs` includes `db()` integration

## Learn More

- [Astro DB Documentation](https://docs.astro.build/en/guides/astro-db/)
- [Web Push Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [VAPID Protocol](https://datatracker.ietf.org/doc/html/rfc8292)

## License

MIT
