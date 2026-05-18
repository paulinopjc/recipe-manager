import { pool } from '../db/connection'
import type { NavItem, CreateNavItemInput, UpdateNavItemInput } from '../types/navItem'

const SELECT_FIELDS = `
  n.*,
  CASE
    WHEN n.type = 'category' THEN '/recipes/category/' || c.slug
    WHEN n.type = 'recipe'   THEN '/recipes/' || n.recipe_id::text
    ELSE n.url
  END AS resolved_url`

const FROM_JOINS = `
  FROM nav_items n
  LEFT JOIN categories c ON c.id = n.category_id`

export const navItemService = {
  async list(): Promise<NavItem[]> {
    const { rows } = await pool.query<NavItem>(
      `SELECT ${SELECT_FIELDS} ${FROM_JOINS} ORDER BY n.parent_id NULLS FIRST, n.position, n.id`
    )
    return rows
  },

  async findById(id: number): Promise<NavItem | undefined> {
    const { rows } = await pool.query<NavItem>(
      `SELECT ${SELECT_FIELDS} ${FROM_JOINS} WHERE n.id = $1`,
      [id]
    )
    return rows[0]
  },

  // Active items only, nested structure (parents with children arrays)
  async listPublic(): Promise<NavItem[]> {
    const { rows } = await pool.query<NavItem>(
      `SELECT ${SELECT_FIELDS} ${FROM_JOINS}
       WHERE n.is_active = true
       ORDER BY n.parent_id NULLS FIRST, n.position, n.id`
    )
    // Build nested structure: top-level items with children arrays
    const parents: NavItem[] = []
    const childMap = new Map<number, NavItem[]>()

    for (const row of rows) {
      if (row.parent_id === null) {
        parents.push({ ...row, children: [] })
      } else {
        if (!childMap.has(row.parent_id)) childMap.set(row.parent_id, [])
        childMap.get(row.parent_id)!.push(row)
      }
    }

    for (const parent of parents) {
      parent.children = childMap.get(parent.id) ?? []
    }

    return parents
  },

  async create(input: CreateNavItemInput): Promise<NavItem> {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO nav_items
         (parent_id, label, type, category_id, recipe_id, url, position, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        input.parent_id ?? null,
        input.label,
        input.type,
        input.category_id ?? null,
        input.recipe_id ?? null,
        input.url ?? null,
        input.position ?? 0,
        input.is_active ?? true,
      ]
    )
    return (await this.findById(rows[0].id))!
  },

  async update(id: number, input: UpdateNavItemInput): Promise<NavItem | undefined> {
    // Build SET clause dynamically to avoid COALESCE issues with nullable FK fields
    const sets: string[] = []
    const params: unknown[] = []
    let i = 1

    if ('parent_id'   in input) { sets.push(`parent_id   = $${i++}`); params.push(input.parent_id   ?? null) }
    if ('label'       in input) { sets.push(`label       = $${i++}`); params.push(input.label) }
    if ('type'        in input) { sets.push(`type        = $${i++}`); params.push(input.type) }
    if ('category_id' in input) { sets.push(`category_id = $${i++}`); params.push(input.category_id ?? null) }
    if ('recipe_id'   in input) { sets.push(`recipe_id   = $${i++}`); params.push(input.recipe_id   ?? null) }
    if ('url'         in input) { sets.push(`url         = $${i++}`); params.push(input.url         ?? null) }
    if ('position'    in input) { sets.push(`position    = $${i++}`); params.push(input.position) }
    if ('is_active'   in input) { sets.push(`is_active   = $${i++}`); params.push(input.is_active) }

    if (sets.length === 0) return this.findById(id)
    sets.push(`updated_at = NOW()`)
    params.push(id)

    await pool.query(`UPDATE nav_items SET ${sets.join(', ')} WHERE id = $${i}`, params)
    return this.findById(id)
  },

  async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM nav_items WHERE id = $1', [id])
    return (result.rowCount ?? 0) > 0
  },
}
