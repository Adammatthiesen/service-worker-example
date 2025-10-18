import { defineDb, defineTable, column, NOW } from 'astro:db';

// User accounts with role-based permissions
const User = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    email: column.text({ unique: true }),
    username: column.text({ unique: true }),
    passwordHash: column.text(),
    role: column.text({ default: 'user' }), // 'admin', 'moderator', 'user', 'subscriber'
    displayName: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
    lastLogin: column.date({ optional: true }),
    active: column.boolean({ default: true }),
  },
  indexes: [
    { on: ['email'], unique: true },
    { on: ['username'], unique: true },
    { on: ['role'] }
  ]
});

// Session management for authentication
const Session = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text({ references: () => User.columns.id }),
    token: column.text({ unique: true }),
    expiresAt: column.date(),
    createdAt: column.date({ default: NOW }),
  },
  indexes: [
    { on: ['token'], unique: true },
    { on: ['userId'] }
  ]
});

// Push subscriptions linked to user accounts
const PushSubscription = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text({ references: () => User.columns.id }),
    endpoint: column.text({ unique: true }),
    keys: column.json(), // stores { p256dh, auth }
    deviceName: column.text({ optional: true }), // e.g., "Chrome on MacBook"
    createdAt: column.date({ default: NOW }),
    lastUsed: column.date({ optional: true }),
  },
  indexes: [
    { on: ['endpoint'], unique: true },
    { on: ['userId'] }
  ]
});

// Log of all sent notifications
const NotificationLog = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    title: column.text(),
    body: column.text(),
    targetType: column.text(), // 'all', 'user', 'role'
    targetValue: column.text({ optional: true }), // userId or role name
    sentBy: column.text({ references: () => User.columns.id }),
    recipientCount: column.number({ default: 0 }),
    successCount: column.number({ default: 0 }),
    failureCount: column.number({ default: 0 }),
    sentAt: column.date({ default: NOW }),
    payload: column.json({ optional: true }), // full notification payload
  },
  indexes: [
    { on: ['sentBy'] },
    { on: ['targetType'] },
    { on: ['sentAt'] }
  ]
});

export default defineDb({
  tables: { User, Session, PushSubscription, NotificationLog },
});
