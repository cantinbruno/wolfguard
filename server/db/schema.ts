import { sqliteTable, integer, text, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const vault = sqliteTable('vault', {
  id: integer('id').primaryKey(), pinSalt: text('pin_salt').notNull(), pinHash: text('pin_hash').notNull(),
  generation: integer('generation').notNull(), version: integer('version').notNull(), objectKey: text('object_key'),
  failures: integer('failures').notNull(), blockedUntil: integer('blocked_until').notNull(),
  lease: text('lease'), leaseUntil: integer('lease_until').notNull(),
  usersEnabled:integer('users_enabled').notNull().default(0),workspaceKeyCipher:text('workspace_key_cipher'),ownerUserId:text('owner_user_id')
});
export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(), generation: integer('generation').notNull(),
  expiresAt: integer('expires_at').notNull(), activeAt: integer('active_at').notNull(),userId:text('user_id'),userVersion:integer('user_version').notNull().default(0)
});
export const users = sqliteTable('users', {
  id:text('id').primaryKey(),nameHash:text('name_hash').notNull().unique(),nameCipher:text('name_cipher').notNull(),role:text('role').notNull(),
  pinSalt:text('pin_salt').notNull(),pinHash:text('pin_hash').notNull(),codeVersion:integer('code_version').notNull().default(1),
  disabledAt:integer('disabled_at'),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),lastLogin:integer('last_login'),
  credentialPending:integer('credential_pending').notNull().default(0),inviteHash:text('invite_hash'),inviteExpiresAt:integer('invite_expires_at')
});
export const userInvitations = sqliteTable('user_invitations', {
  id:text('id').primaryKey(),ticketHash:text('ticket_hash').notNull().unique(),
  createdAt:integer('created_at').notNull(),expiresAt:integer('expires_at').notNull()
});
export const rotations = sqliteTable('rotations', {
  tokenHash: text('token_hash').primaryKey(), pinSalt: text('pin_salt').notNull(), pinHash: text('pin_hash').notNull(),
  generation: integer('generation').notNull(), version: integer('version').notNull(), expiresAt: integer('expires_at').notNull()
});
export const accessConnections = sqliteTable('access_connections', {
  tokenHash:text('token_hash').primaryKey(),id:text('id').notNull().unique(),createdAt:integer('created_at').notNull(),
  ipHash:text('ip_hash'),ipCipher:text('ip_cipher'),deviceCipher:text('device_cipher').notNull()
});
export const accessBlocks = sqliteTable('access_blocks', {
  id:text('id').primaryKey(),ipHash:text('ip_hash').notNull().unique(),ipCipher:text('ip_cipher').notNull(),createdAt:integer('created_at').notNull()
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
export const remoteSessions = sqliteTable('remote_sessions', {
  id:text('id').primaryKey(),agentId:text('agent_id').notNull(),generation:integer('generation').notNull(),ownerHash:text('owner_hash').notNull(),status:text('status').notNull(),
  createdAt:integer('created_at').notNull(),expiresAt:integer('expires_at').notNull(),viewerUntil:integer('viewer_until').notNull(),agentUntil:integer('agent_until').notNull(),
  leaseHash:text('lease_hash'),frameRevision:integer('frame_revision').notNull().default(0),inputSeq:integer('input_seq').notNull().default(0),inputAck:integer('input_ack').notNull().default(0),messageCipher:text('message_cipher')
},table=>[uniqueIndex('remote_one_active_agent').on(table.agentId).where(sql`${table.status} IN ('requested','preparing','active')`)]);
export const remoteInputs = sqliteTable('remote_inputs', {
  sessionId:text('session_id').notNull(),seq:integer('seq').notNull(),createdAt:integer('created_at').notNull(),inputCipher:text('input_cipher').notNull()
},table=>[primaryKey({columns:[table.sessionId,table.seq]})]);
