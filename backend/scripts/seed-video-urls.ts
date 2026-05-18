/**
 * seed-video-urls.ts
 *
 * Randomly assigns real YouTube / Vimeo cooking video URLs to recipes that
 * currently have no video_url. Uses all four URL formats supported by the
 * VideoPlayer component so every format gets exercised:
 *
 *   1. https://www.youtube.com/watch?v=ID   (YouTube standard)
 *   2. https://youtu.be/ID                  (YouTube short)
 *   3. https://vimeo.com/ID                 (Vimeo standard)
 *   4. https://www.vimeo.com/ID             (Vimeo with www)
 *
 * Each candidate URL is verified via the platform's public oEmbed API before
 * being assigned. Dead / private / removed videos are skipped automatically.
 *
 * Run:  cd backend && npx tsx scripts/seed-video-urls.ts
 *       Add --dry-run to preview without writing to DB.
 */

import 'dotenv/config'
import { pool } from '../src/db/connection'

// ── Video pool ────────────────────────────────────────────────────────────────
// Real, publicly available cooking / food videos. Mixed formats intentionally.

const VIDEO_POOL: string[] = [
  // ── YouTube standard (www.youtube.com/watch?v=)
  'https://www.youtube.com/watch?v=UsFwGZ_VVCA',   // Gordon Ramsay — scrambled eggs
  'https://www.youtube.com/watch?v=RMgI3Xz3nBg',   // Tasty — one-pot chicken & rice
  'https://www.youtube.com/watch?v=E_-s6NJsIyk',   // Tasty — general Tso chicken
  'https://www.youtube.com/watch?v=JKtR3_t3bU4',   // Binging with Babish — ramen
  'https://www.youtube.com/watch?v=okTRMqVbbeU',   // Joshua Weissman — perfect fried rice
  'https://www.youtube.com/watch?v=_ZSYF7uRvgU',   // Tasty — butter chicken
  'https://www.youtube.com/watch?v=GY9KqNKjXxM',   // Tasty — pad thai
  'https://www.youtube.com/watch?v=UOkBFknqHrM',   // Chef John — chicken adobo
  'https://www.youtube.com/watch?v=OFDTiPtMYkE',   // Gordon Ramsay — beef stew
  'https://www.youtube.com/watch?v=fNcAkjxFtsE',   // Tasty — jollof rice
  'https://www.youtube.com/watch?v=NzRRVVuSEcc',   // Ethan Chlebowski — miso soup
  'https://www.youtube.com/watch?v=jkTuKVnvj_E',   // Tasty — cacio e pepe
  'https://www.youtube.com/watch?v=JMmCQVCXQUU',   // Joshua Weissman — tacos al pastor
  'https://www.youtube.com/watch?v=FplpqBMD26c',   // Joshua Weissman — coq au vin

  // ── YouTube short (youtu.be/)
  'https://youtu.be/r7B4aXnbVPg',                  // Tasty — gyoza
  'https://youtu.be/Ude6oQ6V5-A',                  // Tasty — green curry
  'https://youtu.be/Vc2YxuEXMko',                  // Tasty — enchiladas
  'https://youtu.be/MkAuCVqkFUs',                  // Tasty — biryani
  'https://youtu.be/QyqLdrv_e0k',                  // Tasty — tiramisu
  'https://youtu.be/CrEeaXMMPJ0',                  // Joshua Weissman — jerk chicken
  'https://youtu.be/OOC35RJ3NeQ',                  // Tasty — mango sticky rice
  'https://youtu.be/Nv6FRjBL35k',                  // Tasty — katsu curry
  'https://youtu.be/hNbAr6lsXio',                  // Tasty — pozole

  // ── Vimeo standard (vimeo.com/)
  'https://vimeo.com/76979871',                     // The Art of Making Ramen
  'https://vimeo.com/134493939',                    // How to Make Pasta
  'https://vimeo.com/170815661',                    // Homemade pizza
  'https://vimeo.com/222264520',                    // Thai street food
  'https://vimeo.com/268777956',                    // Indian spices / cooking

  // ── Vimeo with www (www.vimeo.com/)
  'https://www.vimeo.com/297428084',                // Sushi making
  'https://www.vimeo.com/350858971',                // French cuisine
  'https://www.vimeo.com/400483779',                // African cooking
  'https://www.vimeo.com/453617399',                // Mexican street food
]

// ── oEmbed verification ───────────────────────────────────────────────────────

/** Cache verified URLs so we don't re-check the same URL multiple times */
const verifiedCache = new Map<string, boolean>()

function oEmbedUrl(videoUrl: string): string {
  const encoded = encodeURIComponent(videoUrl)
  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    return `https://www.youtube.com/oembed?url=${encoded}&format=json`
  }
  return `https://vimeo.com/api/oembed.json?url=${encoded}`
}

async function isPlayable(videoUrl: string): Promise<boolean> {
  if (verifiedCache.has(videoUrl)) return verifiedCache.get(videoUrl)!

  try {
    const res = await fetch(oEmbedUrl(videoUrl), {
      method: 'GET',
      headers: { 'User-Agent': 'recipe-manager-seed/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    const ok = res.status === 200
    verifiedCache.set(videoUrl, ok)
    return ok
  } catch {
    verifiedCache.set(videoUrl, false)
    return false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Roughly 65% of recipes get a video — realistic for a real recipe site */
function shouldAssign(): boolean {
  return Math.random() < 0.65
}


// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  if (dryRun) console.log('DRY RUN — no changes will be written\n')

  // Pre-verify the entire pool once at startup so we know which URLs work
  console.log(`Verifying ${VIDEO_POOL.length} candidate URLs via oEmbed...\n`)
  let poolOk = 0
  for (const url of VIDEO_POOL) {
    const ok = await isPlayable(url)
    const label = url.replace('https://', '').slice(0, 55).padEnd(55)
    console.log(`  ${ok ? '✓' : '✗'} ${label}`)
    if (ok) poolOk++
  }
  console.log(`\n${poolOk}/${VIDEO_POOL.length} URLs are playable\n`)

  if (poolOk === 0) {
    console.error('No working video URLs found. Check your internet connection.')
    await pool.end()
    process.exit(1)
  }

  // ── Step 1: audit existing video URLs ────────────────────────────────────────
  const { rows: withVideo } = await pool.query<{ id: number; title: string; video_url: string }>(
    `SELECT id, title, video_url FROM recipes WHERE video_url IS NOT NULL ORDER BY id`
  )

  if (withVideo.length > 0) {
    console.log(`Checking ${withVideo.length} recipes that already have a video URL...\n`)
    let cleared = 0
    for (const recipe of withVideo) {
      const ok = await isPlayable(recipe.video_url)
      if (!ok) {
        console.log(`  ✗  [${recipe.id}] ${recipe.title} — video gone, clearing`)
        console.log(`       ${recipe.video_url}`)
        if (!dryRun) {
          await pool.query(
            `UPDATE recipes SET video_url = NULL, updated_at = NOW() WHERE id = $1`,
            [recipe.id]
          )
        }
        cleared++
      } else {
        console.log(`  ✓  [${recipe.id}] ${recipe.title} — still playable`)
      }
    }
    console.log(`\nCleared ${dryRun ? '(dry run) ' : ''}${cleared} dead video URL${cleared !== 1 ? 's' : ''}\n`)
  }

  // ── Step 2: assign videos to recipes that have none ───────────────────────
  const { rows: recipes } = await pool.query<{ id: number; title: string }>(
    `SELECT id, title FROM recipes WHERE video_url IS NULL AND is_public = true ORDER BY id`
  )

  console.log(`Found ${recipes.length} recipes without a video URL\n`)

  let assigned = 0
  let noVideo  = 0
  let noUrl    = 0

  for (const recipe of recipes) {
    if (!shouldAssign()) {
      console.log(`  ⏭  [${recipe.id}] ${recipe.title} — intentionally no video`)
      noVideo++
      continue
    }

    // Pick from already-verified working URLs only
    const workingPool = VIDEO_POOL.filter(u => verifiedCache.get(u) === true)
    const url = workingPool[Math.floor(Math.random() * workingPool.length)]

    if (!url) {
      console.log(`  ✗  [${recipe.id}] ${recipe.title} — no working URL available, skipping`)
      noUrl++
      continue
    }

    console.log(`  ✓  [${recipe.id}] ${recipe.title}`)
    console.log(`       ${url}`)

    if (!dryRun) {
      await pool.query(
        `UPDATE recipes SET video_url = $1, updated_at = NOW() WHERE id = $2`,
        [url, recipe.id]
      )
    }

    assigned++
  }

  console.log(`\n${dryRun ? '[DRY RUN] Would assign' : 'Assigned'}: ${assigned}`)
  console.log(`No video (intentional): ${noVideo}`)
  if (noUrl) console.log(`Skipped (no working URL): ${noUrl}`)

  // ── Format coverage report ─────────────────────────────────────────────────
  if (!dryRun) {
    const { rows } = await pool.query<{ video_url: string }>(
      `SELECT video_url FROM recipes WHERE video_url IS NOT NULL`
    )
    const counts = { yt_standard: 0, yt_short: 0, vimeo: 0, vimeo_www: 0 }
    for (const { video_url } of rows) {
      if (video_url.includes('www.youtube.com'))       counts.yt_standard++
      else if (video_url.includes('youtu.be'))         counts.yt_short++
      else if (video_url.includes('www.vimeo.com'))    counts.vimeo_www++
      else if (video_url.includes('vimeo.com'))        counts.vimeo++
    }
    console.log('\nFormat coverage in DB:')
    console.log(`  youtube.com/watch?v=  ${counts.yt_standard}`)
    console.log(`  youtu.be/             ${counts.yt_short}`)
    console.log(`  vimeo.com/            ${counts.vimeo}`)
    console.log(`  www.vimeo.com/        ${counts.vimeo_www}`)
  }

  await pool.end()
}

main().catch(err => {
  console.error('Fatal:', err)
  pool.end()
  process.exit(1)
})
