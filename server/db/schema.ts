import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
export const vault = sqliteTable('vault', {
  id: integer('id').primaryKey(), pinSalt: text('pin_salt').notNull(), pinHash: text('pin_hash').notNull(),
  generation: integer('generation').notNull(), version: integer('version').notNull(), objectKey: text('object_key'),
  failures: integer('failures').notNull(), blockedUntil: integer('blocked_until').notNull(),
  lease: text('lease'), leaseUntil: integer('lease_until').notNull()
});
export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(), generation: integer('generation').notNull(),
  expiresAt: integer('expires_at').notNull(), activeAt: integer('active_at').notNull()
});
export const rotations = sqliteTable('rotations', {
  tokenHash: text('token_hash').primaryKey(), pinSalt: text('pin_salt').notNull(), pinHash: text('pin_hash').notNull(),
  generation: integer('generation').notNull(), version: integer('version').notNull(), expiresAt: integer('expires_at').notNull()
});
