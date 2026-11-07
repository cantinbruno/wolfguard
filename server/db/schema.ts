import { sqliteTable, integer, text, uniqueIndex, primaryKey, index } from 'drizzle-orm/sqlite-core';
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
  credentialPending:integer('credential_pending').notNull().default(0),inviteHash:text('invite_hash'),inviteExpiresAt:integer('invite_expires_at'),
  pinLookup:text('pin_lookup').unique(),otpSecretCipher:text('otp_secret_cipher'),otpPendingCipher:text('otp_pending_cipher'),otpPendingUntil:integer('otp_pending_until'),otpLastStep:integer('otp_last_step').notNull().default(-1),otpRecoveryCipher:text('otp_recovery_cipher'),
  permissionsCipher:text('permissions_cipher'),permissionRevision:integer('permission_revision').notNull().default(1)
});
export const userInvitations = sqliteTable('user_invitations', {
  id:text('id').primaryKey(),ticketHash:text('ticket_hash').notNull().unique(),
  createdAt:integer('created_at').notNull(),expiresAt:integer('expires_at').notNull(),permissionsCipher:text('permissions_cipher')
});
export const permissionAudit=sqliteTable('permission_audit',{
  id:text('id').primaryKey(),createdAt:integer('created_at').notNull(),detailsCipher:text('details_cipher').notNull()
});
export const pushDevices=sqliteTable('push_devices',{
  id:text('id').primaryKey(),userId:text('user_id').notNull().unique(),subscriptionCipher:text('subscription_cipher').notNull(),publicKey:text('public_key').notNull(),createdAt:integer('created_at').notNull()
});
export const pushRequests=sqliteTable('push_requests',{
  id:text('id').primaryKey(),ticketHash:text('ticket_hash').notNull().unique(),userId:text('user_id').notNull(),userVersion:integer('user_version').notNull(),deviceId:text('device_id').notNull(),generation:integer('generation').notNull(),nonce:text('nonce').notNull(),state:text('state').notNull(),displayCode:text('display_code').notNull(),detailsCipher:text('details_cipher').notNull(),createdAt:integer('created_at').notNull(),expiresAt:integer('expires_at').notNull()
},table=>[uniqueIndex('push_requests_one_pending_user').on(table.userId).where(sql`${table.state} = 'pending'`)]);
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
export const scanIntelligence=sqliteTable('scan_intelligence',{
  jobId:text('job_id').primaryKey(),reportRevision:integer('report_revision').notNull(),resultCipher:text('result_cipher').notNull(),checkedAt:integer('checked_at').notNull()
});
export const scanJobs = sqliteTable('scan_jobs', {
  id: text('id').primaryKey(), agentId: text('agent_id').notNull(), generation: integer('generation').notNull(), strategy: text('strategy').notNull(),
  status: text('status').notNull(), specCipher: text('spec_cipher').notNull(), resultCipher: text('result_cipher'),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(), expiresAt: integer('expires_at').notNull(),
  revision: integer('revision').notNull(), completed: integer('completed').notNull(), total: integer('total').notNull(),
  leaseHash: text('lease_hash'), leaseUntil: integer('lease_until').notNull(),createdBy:text('created_by')
},table=>[uniqueIndex('scan_jobs_one_active_agent').on(table.agentId).where(sql`${table.status} IN ('queued','running')`)]);
export const remoteSessions = sqliteTable('remote_sessions', {
  id:text('id').primaryKey(),agentId:text('agent_id').notNull(),generation:integer('generation').notNull(),ownerHash:text('owner_hash').notNull(),status:text('status').notNull(),
  createdAt:integer('created_at').notNull(),expiresAt:integer('expires_at').notNull(),viewerUntil:integer('viewer_until').notNull(),agentUntil:integer('agent_until').notNull(),
  leaseHash:text('lease_hash'),frameRevision:integer('frame_revision').notNull().default(0),inputSeq:integer('input_seq').notNull().default(0),inputAck:integer('input_ack').notNull().default(0),messageCipher:text('message_cipher'),mode:text('mode').notNull().default('desktop'),terminalCipher:text('terminal_cipher')
},table=>[uniqueIndex('remote_one_active_agent').on(table.agentId).where(sql`${table.status} IN ('requested','preparing','active')`)]);
export const remoteInputs = sqliteTable('remote_inputs', {
  sessionId:text('session_id').notNull(),seq:integer('seq').notNull(),createdAt:integer('created_at').notNull(),inputCipher:text('input_cipher').notNull()
},table=>[primaryKey({columns:[table.sessionId,table.seq]})]);
export const terminalCommands=sqliteTable('terminal_commands',{
  sessionId:text('session_id').notNull(),seq:integer('seq').notNull(),createdAt:integer('created_at').notNull(),status:text('status').notNull(),specCipher:text('spec_cipher').notNull(),resultCipher:text('result_cipher'),revision:integer('revision').notNull().default(0),cancelRequested:integer('cancel_requested').notNull().default(0)
},table=>[primaryKey({columns:[table.sessionId,table.seq]}),uniqueIndex('terminal_one_pending_command').on(table.sessionId).where(sql`${table.status} IN ('queued','running')`)]);

export const aiJobs=sqliteTable('ai_jobs',{
 id:text('id').primaryKey(),agentId:text('agent_id').notNull(),userId:text('user_id').notNull(),userVersion:integer('user_version').notNull(),sessionHash:text('session_hash').notNull(),generation:integer('generation').notNull(),status:text('status').notNull(),requestCipher:text('request_cipher').notNull(),resultCipher:text('result_cipher'),leaseHash:text('lease_hash'),createdAt:integer('created_at').notNull(),expiresAt:integer('expires_at').notNull()
},table=>[uniqueIndex('ai_jobs_one_active_agent').on(table.agentId).where(sql`${table.status} IN ('queued','running')`)]);

export const chatHistoryState=sqliteTable('chat_history_state',{
  id:integer('id').primaryKey(),epoch:integer('epoch').notNull().default(0)
});
export const chatConversations=sqliteTable('chat_conversations',{
  id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),epoch:integer('epoch').notNull(),revision:integer('revision').notNull(),titleCipher:text('title_cipher').notNull(),contentCipher:text('content_cipher').notNull(),updatedAt:integer('updated_at').notNull()
},table=>[index('chat_conversations_user_updated').on(table.userId,table.updatedAt)]);

export const duoConfig=sqliteTable('duo_config',{
  id:integer('id').primaryKey(),enabled:integer('enabled').notNull().default(0),configCipher:text('config_cipher'),revision:integer('revision').notNull().default(0)
});
export const duoRequests=sqliteTable('duo_requests',{
  id:text('id').primaryKey(),stateHash:text('state_hash').notNull().unique(),ticketHash:text('ticket_hash').notNull().unique(),userId:text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),userVersion:integer('user_version').notNull(),generation:integer('generation').notNull(),configRevision:integer('config_revision').notNull(),otpBinding:text('otp_binding').notNull(),nonce:text('nonce').notNull(),status:text('status').notNull(),createdAt:integer('created_at').notNull(),expiresAt:integer('expires_at').notNull()
},table=>[index('duo_requests_user_created').on(table.userId,table.createdAt)]);

export const chatApiConfig=sqliteTable('chat_api_config',{
  id:integer('id').primaryKey(),keyCipher:text('key_cipher'),revision:integer('revision').notNull().default(0)
});
export const chatApiUsage=sqliteTable('chat_api_usage',{
  userId:text('user_id').primaryKey().references(()=>users.id,{onDelete:'cascade'}),windowStart:integer('window_start').notNull(),requests:integer('requests').notNull(),lease:text('lease').notNull(),leaseUntil:integer('lease_until').notNull()
});

export const endpointStates=sqliteTable('endpoint_states',{
 agentId:text('agent_id').primaryKey().references(()=>scanAgents.id,{onDelete:'cascade'}),generation:integer('generation').notNull(),collectedAt:integer('collected_at').notNull(),receivedAt:integer('received_at').notNull(),snapshotCipher:text('snapshot_cipher').notNull()
});
export const endpointPolicies=sqliteTable('endpoint_policies',{
 agentId:text('agent_id').primaryKey().references(()=>scanAgents.id,{onDelete:'cascade'}),revision:integer('revision').notNull(),policyCipher:text('policy_cipher').notNull(),updatedBy:text('updated_by').notNull(),updatedAt:integer('updated_at').notNull()
});
export const endpointEvents=sqliteTable('endpoint_events',{
 agentId:text('agent_id').notNull().references(()=>scanAgents.id,{onDelete:'cascade'}),eventKey:text('event_key').notNull(),occurredAt:integer('occurred_at').notNull(),receivedAt:integer('received_at').notNull(),status:text('status').notNull(),severity:text('severity').notNull(),eventCipher:text('event_cipher').notNull(),acknowledgedAt:integer('acknowledged_at'),acknowledgedBy:text('acknowledged_by')
},table=>[primaryKey({columns:[table.agentId,table.eventKey]}),index('endpoint_events_agent_time').on(table.agentId,table.occurredAt),index('endpoint_events_open').on(table.agentId,table.status,table.acknowledgedAt)]);
export const endpointCommands=sqliteTable('endpoint_commands',{
 id:text('id').primaryKey(),agentId:text('agent_id').notNull().references(()=>scanAgents.id,{onDelete:'cascade'}),generation:integer('generation').notNull(),requestedBy:text('requested_by').notNull(),userVersion:integer('user_version').notNull(),action:text('action').notNull(),status:text('status').notNull(),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull(),expiresAt:integer('expires_at').notNull(),leaseHash:text('lease_hash'),resultCipher:text('result_cipher')
},table=>[index('endpoint_commands_agent_status').on(table.agentId,table.status)]);
