import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { pool } from '../src/db/connection'
import { storageService } from '../src/services/storageService'

// ── Config ────────────────────────────────────────────────────────────────────

const REVIEW_DIR   = path.resolve(__dirname, '../../image-review')
const MANIFEST     = path.join(REVIEW_DIR, 'manifest.json')

if (!fs.existsSync(MANIFEST)) {
  console.error('ERROR: manifest.json not found.')
  console.error(`Expected at: ${MANIFEST}`)
  console.error('Run download-images.ts first.')
  process.exit(1)
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ManifestEntry {
  type:       'recipe' | 'category'
  id:         number
  name:       string
  slug:       string
  file:       string
  pexels_url: string
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const entries: ManifestEntry[] = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))

  console.log(`\nManifest has ${entries.length} entries`)

  let uploaded = 0
  let skipped  = 0
  let errors   = 0

  for (const entry of entries) {
    const subDir = entry.type === 'recipe' ? 'recipes' : 'categories'
    const filePath = path.join(REVIEW_DIR, subDir, entry.file)

    if (!fs.existsSync(filePath)) {
      console.log(`  ⏭  skipped (file removed): ${entry.file}`)
      skipped++
      continue
    }

    process.stdout.write(`  ↑  [${entry.type} ${entry.id}] ${entry.name} ...`)

    try {
      const buffer   = fs.readFileSync(filePath)
      const folder   = entry.type === 'recipe' ? 'cover-images' : 'category-images'
      const url      = await storageService.uploadFile(buffer, entry.file, 'image/jpeg', folder)

      if (entry.type === 'recipe') {
        await pool.query(
          `UPDATE recipes SET cover_image_url = $1, updated_at = NOW() WHERE id = $2`,
          [url, entry.id]
        )
      } else {
        await pool.query(
          `UPDATE categories SET image_url = $1, updated_at = NOW() WHERE id = $2`,
          [url, entry.id]
        )
      }

      console.log(` ✓  ${url}`)
      uploaded++
    } catch (err) {
      console.log(` ERROR: ${(err as Error).message}`)
      errors++
    }
  }

  console.log(`\n✅ Done. Uploaded: ${uploaded}  Skipped: ${skipped}  Errors: ${errors}`)
  await pool.end()
}

main().catch(err => {
  console.error('Fatal:', err)
  pool.end()
  process.exit(1)
})
