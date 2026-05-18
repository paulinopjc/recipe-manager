import 'dotenv/config'
import { pool } from '../src/db/connection'

async function main() {
  const { rowCount } = await pool.query(
    `UPDATE recipes SET video_url = NULL, updated_at = NOW() WHERE id NOT IN (1, 2)`
  )
  console.log(`Cleared video_url on ${rowCount} recipes (kept IDs 1 and 2)`)
  await pool.end()
}

main().catch(err => { console.error(err); pool.end(); process.exit(1) })
