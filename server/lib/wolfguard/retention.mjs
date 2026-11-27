export const LOG_RETENTION_MS=30*86400000;
const runs=new WeakMap();
// One cleanup per database binding per hour; concurrent requests share the work.
// Call only after authentication. Active commands and scans are never removed.
export async function retainRecentLogs(env,now){
  const previous=runs.get(env.DB);if(previous&&now>=previous.at&&now-previous.at<3600000)return previous.work;
  const cutoff=now-LOG_RETENTION_MS;
  const work=env.DB.batch([
    env.DB.prepare('DELETE FROM endpoint_events WHERE occurred_at<?').bind(cutoff),
    env.DB.prepare("DELETE FROM endpoint_commands WHERE updated_at<? AND status NOT IN ('queued','running')").bind(cutoff),
    env.DB.prepare("DELETE FROM scan_jobs WHERE updated_at<? AND status NOT IN ('queued','running')").bind(cutoff),
    env.DB.prepare('DELETE FROM scan_intelligence WHERE NOT EXISTS(SELECT 1 FROM scan_jobs WHERE scan_jobs.id=scan_intelligence.job_id)'),
    env.DB.prepare('DELETE FROM permission_audit WHERE created_at<?').bind(cutoff),
    env.DB.prepare('DELETE FROM app_logs WHERE created_at<?').bind(cutoff),
    env.DB.prepare('DELETE FROM shared_secrets WHERE expires_at<=?').bind(now),
    // Throttle rows of addresses that have been quiet for a day.
    env.DB.prepare('DELETE FROM login_throttle WHERE blocked_until<? AND lease_until<? AND updated_at<?').bind(now,now,now-86400000)
  ]).catch(error=>{runs.delete(env.DB);throw error;});
  runs.set(env.DB,{at:now,work});await work;
}
