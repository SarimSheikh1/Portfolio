// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {integer,sqliteTable,text,index} from 'drizzle-orm/sqlite-core';
export const users=sqliteTable('wa_users',{id:text('id').primaryKey(),name:text('name').notNull(),email:text('email').notNull().unique(),role:text('role').notNull().default('member'),passwordHash:text('password_hash').notNull(),salt:text('salt').notNull(),iterations:integer('iterations').notNull(),createdAt:integer('created_at').notNull()});
export const sessions=sqliteTable('wa_sessions',{tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),expiresAt:integer('expires_at').notNull()},t=>[index('wa_session_expiry_idx').on(t.expiresAt)]);
export const authLimits=sqliteTable('wa_auth_limits',{key:text('key').primaryKey(),attempts:integer('attempts').notNull(),expiresAt:integer('expires_at').notNull()});
export const settings=sqliteTable('wa_settings',{key:text('key').primaryKey(),value:text('value').notNull()});
