import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import { pool } from '../src/db/connection'

// ── Config ────────────────────────────────────────────────────────────────────

const PEXELS_KEY = process.env.PEXELS_API_KEY
if (!PEXELS_KEY) {
  console.error('ERROR: PEXELS_API_KEY is not set in .env')
  console.error('Get a free key at https://www.pexels.com/api/')
  process.exit(1)
}

const REVIEW_DIR  = path.resolve(__dirname, '../../image-review')
const RECIPES_DIR = path.join(REVIEW_DIR, 'recipes')
const CATS_DIR    = path.join(REVIEW_DIR, 'categories')

// ── Category search queries (regional / generalized) ──────────────────────────

const CATEGORY_QUERIES: Record<string, string> = {
  'asia':            'asian cuisine food spread colorful',
  'east-asia':       'east asian chinese japanese food',
  'south-east-asia': 'southeast asian thai filipino food',
  'south-asia':      'south asian indian food',
  'africa':          'african traditional food spread colorful',
  'east-africa':     'east african food nyama choma',
  'west-africa':     'west african jollof rice food',
  'northeast-africa':'ethiopian injera food',
  'europe':          'european cuisine food spread',
  'western-europe':  'french italian european cuisine',
  'americas':        'latin american caribbean food',
  'caribbean':       'caribbean jerk food beach',
  'central-america': 'mexican tacos mole food',
  'chinese':         'chinese cuisine dim sum dumplings',
  'japanese':        'japanese ramen sushi cuisine',
  'filipino':        'filipino adobo food',
  'thai':            'thai pad thai curry food',
  'indian':          'indian curry biryani food',
  'kenyan':          'kenyan nyama choma food',
  'west-african':    'west african food jollof',
  'ethiopian':       'ethiopian injera doro wat',
  'french':          'french coq au vin cuisine',
  'italian':         'italian pasta pizza cuisine',
  'jamaican':        'jamaican jerk chicken food',
  'mexican':         'mexican tacos food colorful',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function searchPexels(query: string): Promise<string | null> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&size=large`
  const res = await fetch(url, {
    headers: { Authorization: PEXELS_KEY! },
  })
  if (!res.ok) {
    console.warn(`  Pexels API error ${res.status} for query: ${query}`)
    return null
  }
  const data = await res.json() as any
  const photo = data.photos?.[0]
  if (!photo) return null
  // prefer large2x (1880px wide), fallback to large (940px)
  return photo.src?.large2x ?? photo.src?.large ?? null
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)

    const request = (reqUrl: string, redirects = 0) => {
      if (redirects > 5) { reject(new Error('Too many redirects')); return }
      const mod = reqUrl.startsWith('https') ? https : http
      mod.get(reqUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const location = res.headers.location
          if (!location) { reject(new Error('Redirect with no location')); return }
          request(location, redirects + 1)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${reqUrl}`))
          return
        }
        res.pipe(file)
        file.on('finish', () => file.close(() => resolve()))
        file.on('error', (err) => { fs.unlink(dest, () => reject(err)) })
      }).on('error', (err) => { fs.unlink(dest, () => reject(err)) })
    }

    request(url)
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface ManifestEntry {
  type:       'recipe' | 'category'
  id:         number
  name:       string
  slug:       string
  file:       string
  pexels_url: string
}

async function main() {
  fs.mkdirSync(RECIPES_DIR, { recursive: true })
  fs.mkdirSync(CATS_DIR,    { recursive: true })

  const manifest: ManifestEntry[] = []
  let downloaded = 0
  let skipped    = 0

  // ── Recipes without cover images ──────────────────────────────────────────
  const { rows: recipes } = await pool.query<{
    id: number; title: string; category_slug: string | null
  }>(`
    SELECT r.id, r.title,
      (SELECT c.slug FROM recipe_categories rc
       JOIN categories c ON c.id = rc.category_id
       WHERE rc.recipe_id = r.id
       LIMIT 1) AS category_slug
    FROM recipes r
    WHERE r.cover_image_url IS NULL AND r.is_public = true
    ORDER BY r.id
  `)

  console.log(`\nFound ${recipes.length} recipes without images`)

  for (const recipe of recipes) {
    const slug     = slugify(recipe.title)
    const filename = `${recipe.id}-${slug}.jpg`
    const dest     = path.join(RECIPES_DIR, filename)

    if (fs.existsSync(dest)) {
      console.log(`  ⏭  already downloaded: ${filename}`)
      skipped++
      continue
    }

    const query = `${recipe.title} food recipe dish`
    process.stdout.write(`  ↓  [recipe ${recipe.id}] ${recipe.title} ...`)

    const imgUrl = await searchPexels(query)
    if (!imgUrl) {
      console.log(' no result')
      skipped++
      await delay(200)
      continue
    }

    try {
      await downloadFile(imgUrl, dest)
      console.log(' ✓')
      manifest.push({ type: 'recipe', id: recipe.id, name: recipe.title, slug, file: filename, pexels_url: imgUrl })
      downloaded++
    } catch (err) {
      console.log(` ERROR: ${(err as Error).message}`)
      skipped++
    }

    await delay(200) // stay within Pexels rate limit
  }

  // ── Categories without images ──────────────────────────────────────────────
  const { rows: categories } = await pool.query<{
    id: number; name: string; slug: string
  }>(`
    SELECT id, name, slug
    FROM categories
    WHERE image_url IS NULL AND is_active = true AND is_home = false
    ORDER BY id
  `)

  console.log(`\nFound ${categories.length} categories without images`)

  for (const cat of categories) {
    const filename = `${cat.id}-${cat.slug}.jpg`
    const dest     = path.join(CATS_DIR, filename)

    if (fs.existsSync(dest)) {
      console.log(`  ⏭  already downloaded: ${filename}`)
      skipped++
      continue
    }

    const query = CATEGORY_QUERIES[cat.slug] ?? `${cat.name} cuisine food spread`
    process.stdout.write(`  ↓  [category ${cat.id}] ${cat.name} ...`)

    const imgUrl = await searchPexels(query)
    if (!imgUrl) {
      console.log(' no result')
      skipped++
      await delay(200)
      continue
    }

    try {
      await downloadFile(imgUrl, dest)
      console.log(' ✓')
      manifest.push({ type: 'category', id: cat.id, name: cat.name, slug: cat.slug, file: filename, pexels_url: imgUrl })
      downloaded++
    } catch (err) {
      console.log(` ERROR: ${(err as Error).message}`)
      skipped++
    }

    await delay(200)
  }

  // ── Write / merge manifest ─────────────────────────────────────────────────
  const manifestPath = path.join(REVIEW_DIR, 'manifest.json')

  // merge with any existing manifest entries (in case script is re-run)
  let existing: ManifestEntry[] = []
  if (fs.existsSync(manifestPath)) {
    try { existing = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) } catch { /* ignore */ }
  }

  const merged = new Map<string, ManifestEntry>()
  for (const e of existing)  merged.set(`${e.type}-${e.id}`, e)
  for (const e of manifest)  merged.set(`${e.type}-${e.id}`, e)

  fs.writeFileSync(manifestPath, JSON.stringify([...merged.values()], null, 2))

  console.log(`\n✅ Done. Downloaded: ${downloaded}  Skipped/failed: ${skipped}`)
  console.log(`📁 Review images in: ${REVIEW_DIR}`)
  console.log(`📋 Manifest written: ${manifestPath}`)
  console.log('\nWhen ready, run: npx tsx scripts/upload-images.ts')

  await pool.end()
}

main().catch(err => {
  console.error('Fatal:', err)
  pool.end()
  process.exit(1)
})
