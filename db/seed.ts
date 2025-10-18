import { db, User, Session, PushSubscription, NotificationLog } from 'astro:db';
import { hashPassword } from '../src/lib/auth';

// Seed with demo users for testing
export default async function seed() {
  const universalPasswordHash = await hashPassword('password123');

  // Create demo users with different roles
  await db.insert(User).values([
    {
      id: 'admin-1',
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: universalPasswordHash, // "password123"
      role: 'admin',
      displayName: 'Admin User',
      active: true,
    },
    {
      id: 'mod-1',
      email: 'moderator@example.com',
      username: 'moderator',
      passwordHash: universalPasswordHash, // "password123"
      role: 'moderator',
      displayName: 'Moderator User',
      active: true,
    },
    {
      id: 'user-1',
      email: 'user@example.com',
      username: 'user',
      passwordHash: universalPasswordHash, // "password123"
      role: 'user',
      displayName: 'Regular User',
      active: true,
    },
    {
      id: 'sub-1',
      email: 'subscriber@example.com',
      username: 'subscriber',
      passwordHash: universalPasswordHash, // "password123"
      role: 'subscriber',
      displayName: 'Subscriber User',
      active: true,
    },
  ]);

  console.log('✅ Database seeded with demo users');
  console.log('📧 Login credentials (all use password: "password123"):');
  console.log('   - admin@example.com (admin role)');
  console.log('   - moderator@example.com (moderator role)');
  console.log('   - user@example.com (user role)');
  console.log('   - subscriber@example.com (subscriber role)');
}
