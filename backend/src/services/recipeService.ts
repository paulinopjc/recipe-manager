import { pool } from '../db/connection'
import type { Recipe, CreateRecipeInput, UpdateRecipeInput, RecipeFilters } from '../types/recipe'
import { RECIPE_SORTABLE_COLUMNS } from '../constants/recipeColumns'
import { RECIPE_SELECT } from '../constants/recipeSelect'

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function uniqueSlug(client: any, base: string): Promise<string> {
  const slug = slugify(base)
  const { rows } = await client.query(
    `SELECT slug FROM recipes WHERE slug = $1 OR slug ~ ('^' || $1 || '-[0-9]+$')`,
    [slug]
  )
  if (rows.length === 0) return slug
  const taken = new Set<string>(rows.map((r: { slug: string }) => r.slug))
  let n = 2
  while (taken.has(`${slug}-${n}`)) n++
  return `${slug}-${n}`
}


async function insertFlatIngredients(client: any, recipeId: number, ingredients: CreateRecipeInput['ingredients']) {
  if (!ingredients) return
  for (let i = 0; i < ingredients.length; i++) {
    const { name, amount, unit } = ingredients[i]
    await client.query(
      'INSERT INTO ingredients (recipe_id, name, amount, unit, position) VALUES ($1, $2, $3, $4, $5)',
      [recipeId, name, amount, unit ?? null, i + 1]
    )
  }
}

async function insertFlatInstructions(client: any, recipeId: number, instructions: string[]) {
  for (let i = 0; i < instructions.length; i++) {
    await client.query(
      'INSERT INTO instructions (recipe_id, text, position) VALUES ($1, $2, $3)',
      [recipeId, instructions[i], i + 1]
    )
  }
}

async function insertSections(client: any, recipeId: number, sections: NonNullable<CreateRecipeInput['sections']>) {
  for (let si = 0; si < sections.length; si++) {
    const section = sections[si]
    const { rows: [sec] } = await client.query(
      'INSERT INTO recipe_sections (recipe_id, name, position) VALUES ($1, $2, $3) RETURNING *',
      [recipeId, section.name, si + 1]
    )
    for (let i = 0; i < section.ingredients.length; i++) {
      const { name, amount, unit } = section.ingredients[i]
      await client.query(
        'INSERT INTO ingredients (recipe_id, section_id, name, amount, unit, position) VALUES ($1, $2, $3, $4, $5, $6)',
        [recipeId, sec.id, name, amount, unit ?? null, i + 1]
      )
    }
    for (let i = 0; i < section.instructions.length; i++) {
      await client.query(
        'INSERT INTO instructions (recipe_id, section_id, text, position) VALUES ($1, $2, $3, $4)',
        [recipeId, sec.id, section.instructions[i], i + 1]
      )
    }
  }
}

async function syncCategories(client: any, recipeId: number, categoryIds: number[]) {
  await client.query('DELETE FROM recipe_categories WHERE recipe_id = $1', [recipeId])
  for (const catId of categoryIds) {
    await client.query(
      'INSERT INTO recipe_categories (recipe_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [recipeId, catId]
    )
  }
}

export const recipeService = {
  async list(
    opts?: RecipeFilters
  ): Promise<{ data: Recipe[]; total: number }> {
    const page       = Math.max(1, Math.floor(opts?.page ?? 1))
    const pageSize   = Math.min(50, Math.max(1, Math.floor(opts?.pageSize ?? 20)))
    const offset     = (page - 1) * pageSize
    const q          = opts?.q?.trim() ?? ''
    const sortColumn = RECIPE_SORTABLE_COLUMNS[opts?.sortBy ?? 'created_at']
    const sortOrder  = opts?.sortOrder === 'ASC' ? 'ASC' : 'DESC'
    const difficulty = opts?.difficulty ?? null

    const { rows } = await pool.query(
      `SELECT recipes.*, COUNT(*) OVER() AS total_count,
         (SELECT COALESCE(json_agg(json_build_object('id',c.id,'name',c.name,'slug',c.slug)),'[]')
          FROM recipe_categories rc JOIN categories c ON c.id = rc.category_id
          WHERE rc.recipe_id = recipes.id) AS categories
       FROM recipes
       WHERE ($1 = '' OR recipes.title ILIKE $2 OR recipes.description ILIKE $2)
         AND ($3::text IS NULL OR recipes.difficulty = $3)
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $4 OFFSET $5`,
      [q, `%${q}%`, difficulty, pageSize, offset]
    )

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0
    const data  = rows.map(({ total_count, ...rest }) => rest as Recipe)
    return { data, total }
  },

  async find(id: number): Promise<Recipe | undefined> {
    const { rows } = await pool.query(
      `${RECIPE_SELECT} WHERE r.id = $1`,
      [id]
    )
    return rows[0]
  },

  async create(userId: number, input: CreateRecipeInput): Promise<Recipe> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const slug = await uniqueSlug(client, input.title)
      const { rows } = await client.query(
        `INSERT INTO recipes
           (user_id, title, slug, description, servings, prep_minutes, cook_minutes,
            cover_image_url, video_url, is_public, is_featured, difficulty)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          userId,
          input.title,
          slug,
          input.description ?? null,
          input.servings ?? null,
          input.prep_minutes ?? null,
          input.cook_minutes ?? null,
          input.cover_image_url ?? null,
          input.video_url ?? null,
          input.is_public ?? false,
          input.is_featured ?? false,
          input.difficulty ?? null,
        ]
      )
      const recipe = rows[0]

      if (input.sections && input.sections.length >= 2) {
        await insertSections(client, recipe.id, input.sections)
      } else {
        await insertFlatIngredients(client, recipe.id, input.ingredients)
        await insertFlatInstructions(client, recipe.id, input.instructions ?? [])
      }

      if (input.category_ids && input.category_ids.length > 0) {
        await syncCategories(client, recipe.id, input.category_ids)
      }

      await client.query('COMMIT')
      return this.find(recipe.id) as Promise<Recipe>
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async update(id: number, ownerId: number | null, input: UpdateRecipeInput): Promise<Recipe | undefined> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const updateResult = await client.query(
        `UPDATE recipes
         SET title           = COALESCE($1, title),
             description     = COALESCE($2, description),
             servings        = COALESCE($3, servings),
             prep_minutes    = COALESCE($4, prep_minutes),
             cook_minutes    = COALESCE($5, cook_minutes),
             cover_image_url = COALESCE($6, cover_image_url),
             video_url       = COALESCE($7, video_url),
             is_public       = COALESCE($8, is_public),
             is_featured     = COALESCE($9, is_featured),
             difficulty      = COALESCE($10, difficulty),
             updated_at      = NOW()
         WHERE id = $11 AND ($12::integer IS NULL OR user_id = $12)`,
        [
          input.title ?? null,
          input.description ?? null,
          input.servings ?? null,
          input.prep_minutes ?? null,
          input.cook_minutes ?? null,
          input.cover_image_url ?? null,
          input.video_url ?? null,
          input.is_public ?? null,
          input.is_featured ?? null,
          input.difficulty ?? null,
          id,
          ownerId,
        ]
      )

      if ((updateResult.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK')
        return undefined
      }

      if (input.sections && input.sections.length >= 2) {
        await client.query('DELETE FROM recipe_sections WHERE recipe_id = $1', [id])
        await client.query('DELETE FROM ingredients WHERE recipe_id = $1 AND section_id IS NULL', [id])
        await client.query('DELETE FROM instructions WHERE recipe_id = $1 AND section_id IS NULL', [id])
        await insertSections(client, id, input.sections)
      } else {
        if (input.ingredients) {
          await client.query('DELETE FROM ingredients WHERE recipe_id = $1', [id])
          await client.query('DELETE FROM recipe_sections WHERE recipe_id = $1', [id])
          await insertFlatIngredients(client, id, input.ingredients)
        }
        if (input.instructions) {
          await client.query('DELETE FROM instructions WHERE recipe_id = $1 AND section_id IS NULL', [id])
          await insertFlatInstructions(client, id, input.instructions)
        }
      }

      if (input.category_ids !== undefined) {
        await syncCategories(client, id, input.category_ids)
      }

      await client.query('COMMIT')
      return this.find(id)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async delete(id: number, ownerId: number | null): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM recipes WHERE id = $1 AND ($2::integer IS NULL OR user_id = $2)',
      [id, ownerId]
    )
    return (result.rowCount ?? 0) > 0
  },

  // Public (unauthenticated) queries
  async listPublic(opts?: RecipeFilters): Promise<{ data: Recipe[]; total: number }> {
    const page        = Math.max(1, Math.floor(opts?.page ?? 1))
    const pageSize    = Math.min(50, Math.max(1, Math.floor(opts?.pageSize ?? 20)))
    const offset      = (page - 1) * pageSize
    const q           = opts?.q?.trim() ?? ''
    const sortColumn  = RECIPE_SORTABLE_COLUMNS[opts?.sortBy ?? 'created_at']
    const sortOrder   = opts?.sortOrder === 'ASC' ? 'ASC' : 'DESC'
    const difficulty  = opts?.difficulty ?? null
    const isFeatured  = opts?.is_featured ?? null

    const { rows } = await pool.query(
      `SELECT recipes.*, COUNT(*) OVER() AS total_count,
         (SELECT COALESCE(json_agg(json_build_object('id',c.id,'name',c.name,'slug',c.slug)),'[]')
          FROM recipe_categories rc JOIN categories c ON c.id = rc.category_id
          WHERE rc.recipe_id = recipes.id) AS categories
       FROM recipes
       WHERE recipes.is_public = true
         AND ($1 = '' OR recipes.title ILIKE $2 OR recipes.description ILIKE $2)
         AND ($3::text IS NULL OR recipes.difficulty = $3)
         AND ($4::boolean IS NULL OR recipes.is_featured = $4)
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $5 OFFSET $6`,
      [q, `%${q}%`, difficulty, isFeatured, pageSize, offset]
    )

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0
    const data  = rows.map(({ total_count, ...rest }) => rest as Recipe)
    return { data, total }
  },

  async listFeatured(limit = 12): Promise<Recipe[]> {
    const { rows } = await pool.query(
      `${RECIPE_SELECT} WHERE r.is_featured = true AND r.is_public = true ORDER BY r.updated_at DESC LIMIT $1`,
      [limit]
    )
    return rows
  },

  async findPublic(id: number): Promise<Recipe | undefined> {
    await pool.query(
      'UPDATE recipes SET view_count = view_count + 1 WHERE id = $1 AND is_public = true',
      [id]
    )
    const { rows } = await pool.query(
      `${RECIPE_SELECT} WHERE r.id = $1 AND r.is_public = true`,
      [id]
    )
    return rows[0]
  },

  async findPublicBySlug(slug: string): Promise<Recipe | undefined> {
    await pool.query(
      'UPDATE recipes SET view_count = view_count + 1 WHERE slug = $1 AND is_public = true',
      [slug]
    )
    const { rows } = await pool.query(
      `${RECIPE_SELECT} WHERE r.slug = $1 AND r.is_public = true`,
      [slug]
    )
    return rows[0]
  },

  async similar(id: number, limit = 6): Promise<Recipe[]> {
    const { rows } = await pool.query(
      `SELECT r.*,
         (SELECT COALESCE(json_agg(json_build_object('id',c.id,'name',c.name,'slug',c.slug)),'[]')
          FROM recipe_categories rc2 JOIN categories c ON c.id = rc2.category_id
          WHERE rc2.recipe_id = r.id) AS categories,
         COUNT(rc.category_id) AS shared_count
       FROM recipes r
       JOIN recipe_categories rc ON rc.recipe_id = r.id
       WHERE rc.category_id IN (
         SELECT category_id FROM recipe_categories WHERE recipe_id = $1
       )
         AND r.id != $1
         AND r.is_public = true
       GROUP BY r.id
       ORDER BY shared_count DESC, r.view_count DESC
       LIMIT $2`,
      [id, limit]
    )
    return rows
  },

  async mostViewed(limit = 6): Promise<Recipe[]> {
    const { rows } = await pool.query(
      `${RECIPE_SELECT} WHERE r.is_public = true ORDER BY r.view_count DESC, r.updated_at DESC LIMIT $1`,
      [limit]
    )
    return rows
  },
}
