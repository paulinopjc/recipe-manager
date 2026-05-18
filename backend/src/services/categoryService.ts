import { pool } from '../db/connection'
import type { Category, CreateCategoryInput, UpdateCategoryInput, HomepageSection } from '../types/category'
import type { Recipe } from '../types/recipe'

// Build an ancestor chain for a category (closest ancestor first in reverse)
async function fetchAncestors(id: number): Promise<{ id: number; name: string; slug: string }[]> {
  const { rows } = await pool.query<{ id: number; name: string; slug: string; parent_id: number | null }>(
    `WITH RECURSIVE chain AS (
       SELECT id, name, slug, parent_id FROM categories WHERE id = $1
       UNION ALL
       SELECT c.id, c.name, c.slug, c.parent_id
       FROM categories c JOIN chain ch ON c.id = ch.parent_id
     )
     SELECT id, name, slug FROM chain WHERE id != $1 ORDER BY id`,
    [id]
  )
  return rows.reverse()
}

// Nest a flat category list into a tree
function buildTree(flat: Category[]): Category[] {
  const map = new Map<number, Category>()
  flat.forEach(c => map.set(c.id, { ...c, children: [] }))

  const roots: Category[] = []
  flat.forEach(c => {
    const node = map.get(c.id)!
    if (c.parent_id !== null && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children!.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

export const categoryService = {
  // Flat list — all categories with recipe_count
  async list(): Promise<Category[]> {
    const { rows } = await pool.query<Category & { recipe_count: number }>(
      `SELECT c.*,
         (SELECT COUNT(*) FROM recipe_categories rc WHERE rc.category_id = c.id) AS recipe_count
       FROM categories c
       ORDER BY c.homepage_position, c.name`
    )
    return rows
  },

  // Full tree — all active categories nested
  async tree(activeOnly = true): Promise<Category[]> {
    const { rows } = await pool.query<Category>(
      `SELECT c.*,
         (SELECT COUNT(*) FROM recipe_categories rc WHERE rc.category_id = c.id) AS recipe_count
       FROM categories c
       ${activeOnly ? 'WHERE c.is_active = true' : ''}
       ORDER BY c.homepage_position, c.name`
    )
    return buildTree(rows)
  },

  async findById(id: number): Promise<Category | undefined> {
    const { rows } = await pool.query<Category>(
      `SELECT c.*,
         (SELECT COUNT(*) FROM recipe_categories rc WHERE rc.category_id = c.id) AS recipe_count
       FROM categories c WHERE c.id = $1`,
      [id]
    )
    if (!rows[0]) return undefined
    const cat = rows[0]
    cat.ancestors = await fetchAncestors(id)
    return cat
  },

  async findBySlug(slug: string): Promise<Category | undefined> {
    const { rows } = await pool.query<Category>(
      `SELECT c.*,
         (SELECT COUNT(*) FROM recipe_categories rc WHERE rc.category_id = c.id) AS recipe_count
       FROM categories c WHERE c.slug = $1`,
      [slug]
    )
    if (!rows[0]) return undefined
    const cat = rows[0]
    cat.ancestors = await fetchAncestors(cat.id)
    return cat
  },

  async create(input: CreateCategoryInput & { slug: string }): Promise<Category> {
    const { rows } = await pool.query<Category>(
      `INSERT INTO categories
         (parent_id, name, slug, description, image_url, is_active,
          show_on_homepage, homepage_style, homepage_items, homepage_position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        input.parent_id ?? null,
        input.name,
        input.slug,
        input.description ?? null,
        input.image_url ?? null,
        input.is_active ?? true,
        input.show_on_homepage ?? false,
        input.homepage_style ?? 'grid',
        input.homepage_items ?? 6,
        input.homepage_position ?? 0,
      ]
    )
    return rows[0]
  },

  async update(id: number, input: Partial<CreateCategoryInput & { slug: string }>): Promise<Category | undefined> {
    const { rows } = await pool.query<Category>(
      `UPDATE categories SET
         parent_id         = COALESCE($1, parent_id),
         name              = COALESCE($2, name),
         slug              = COALESCE($3, slug),
         description       = COALESCE($4, description),
         image_url         = COALESCE($5, image_url),
         is_active         = COALESCE($6, is_active),
         show_on_homepage  = COALESCE($7, show_on_homepage),
         homepage_style    = COALESCE($8, homepage_style),
         homepage_items    = COALESCE($9, homepage_items),
         homepage_position = COALESCE($10, homepage_position),
         updated_at        = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        input.parent_id ?? null,
        input.name ?? null,
        input.slug ?? null,
        input.description ?? null,
        input.image_url ?? null,
        input.is_active ?? null,
        input.show_on_homepage ?? null,
        input.homepage_style ?? null,
        input.homepage_items ?? null,
        input.homepage_position ?? null,
        id,
      ]
    )
    return rows[0]
  },

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM categories WHERE id = $1', [id])
    return (result.rowCount ?? 0) > 0
  },

  // Homepage sections — active categories with show_on_homepage=true, each with recipes
  async listForHomepage(): Promise<HomepageSection[]> {
    const { rows: cats } = await pool.query<Category>(
      `SELECT * FROM categories
       WHERE show_on_homepage = true AND is_active = true AND is_home = false
       ORDER BY homepage_position`
    )

    const sections: HomepageSection[] = []
    for (const cat of cats) {
      const limit = cat.homepage_items ?? 6
      const { rows: recipes } = await pool.query<Recipe>(
        `WITH RECURSIVE cat_tree AS (
           SELECT id FROM categories WHERE id = $1
           UNION ALL
           SELECT c.id FROM categories c JOIN cat_tree ct ON c.parent_id = ct.id
         )
         SELECT r.*,
           (SELECT COALESCE(json_agg(json_build_object('id',ca.id,'name',ca.name,'slug',ca.slug)),'[]')
            FROM recipe_categories rc2 JOIN categories ca ON ca.id = rc2.category_id
            WHERE rc2.recipe_id = r.id) AS categories
         FROM recipes r
         WHERE r.id IN (
           SELECT DISTINCT rc.recipe_id
           FROM recipe_categories rc
           WHERE rc.category_id IN (SELECT id FROM cat_tree)
         )
           AND r.is_public = true
         ORDER BY r.created_at DESC
         LIMIT $2`,
        [cat.id, limit]
      )
      sections.push({
        category: cat,
        recipes,
        style: cat.homepage_style,
        items: limit,
      })
    }
    return sections
  },

  // Recipes for a category page (recursive, paginated)
  async listRecipesByCategory(
    categoryId: number,
    opts: { q?: string; difficulty?: string; page?: number; pageSize?: number; sortOrder?: string } = {}
  ): Promise<{ data: Recipe[]; total: number }> {
    const page     = Math.max(1, opts.page ?? 1)
    const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20))
    const offset   = (page - 1) * pageSize
    const q        = opts.q?.trim() ?? ''
    const order    = opts.sortOrder === 'ASC' ? 'ASC' : 'DESC'
    const diff     = opts.difficulty ?? null

    const { rows } = await pool.query<Recipe & { total_count: number }>(
      `WITH RECURSIVE cat_tree AS (
         SELECT id FROM categories WHERE id = $1
         UNION ALL
         SELECT c.id FROM categories c JOIN cat_tree ct ON c.parent_id = ct.id
       )
       SELECT r.*,
         (SELECT COALESCE(json_agg(json_build_object('id',ca.id,'name',ca.name,'slug',ca.slug)),'[]')
          FROM recipe_categories rc2 JOIN categories ca ON ca.id = rc2.category_id
          WHERE rc2.recipe_id = r.id) AS categories,
         COUNT(*) OVER() AS total_count
       FROM recipes r
       WHERE r.id IN (
         SELECT DISTINCT rc.recipe_id
         FROM recipe_categories rc
         WHERE rc.category_id IN (SELECT id FROM cat_tree)
       )
         AND r.is_public = true
         AND ($2 = '' OR r.title ILIKE $3 OR r.description ILIKE $3)
         AND ($4::text IS NULL OR r.difficulty = $4)
       ORDER BY r.created_at ${order}
       LIMIT $5 OFFSET $6`,
      [categoryId, q, `%${q}%`, diff, pageSize, offset]
    )

    const total = rows.length > 0 ? Number(rows[0].total_count) : 0
    const data  = rows.map(({ total_count, ...rest }) => rest as Recipe)
    return { data, total }
  },
}
