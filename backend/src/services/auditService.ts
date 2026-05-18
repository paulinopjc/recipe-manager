import { pool } from '../db/connection'

export function audit(
  userId: number | null,
  action: string,
  opts?: { entityType?: string; entityId?: number; metadata?: object; ip?: string }
): void {
  pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userId ?? null,
      action,
      opts?.entityType ?? null,
      opts?.entityId   ?? null,
      opts?.metadata   ? JSON.stringify(opts.metadata) : null,
      opts?.ip         ?? null,
    ]
  ).catch(err => console.error('audit log failed:', err))
}
