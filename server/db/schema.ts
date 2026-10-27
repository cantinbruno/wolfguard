import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
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
export const scanAgents = sqliteTable('scan_agents', {
  id: text('id').primaryKey(), nameCipher: text('name_cipher').notNull(), tokenHash: text('token_hash').notNull().unique(),
  generation: integer('generation').notNull(), createdAt: integer('created_at').notNull(), lastSeen: integer('last_seen').notNull(), revokedAt: integer('revoked_at')
});
export const scanPairings = sqliteTable('scan_pairings', {
  tokenHash: text('token_hash').primaryKey(), generation: integer('generation').notNull(), expiresAt: integer('expires_at').notNull()
});
export const scanJobs = sqliteTable('scan_jobs', {
  id: text('id').primaryKey(), agentId: text('agent_id').notNull(), generation: integer('generation').notNull(), strategy: text('strategy').notNull(),
  status: text('status').notNull(), specCipher: text('spec_cipher').notNull(), resultCipher: text('result_cipher'),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(), expiresAt: integer('expires_at').notNull(),
  revision: integer('revision').notNull(), completed: integer('completed').notNull(), total: integer('total').notNull(),
  leaseHash: text('lease_hash'), leaseUntil: integer('lease_until').notNull()
},table=>[uniqueIndex('scan_jobs_one_active_agent').on(table.agentId).where(sql`${table.status} IN ('queued','running')`)]);
