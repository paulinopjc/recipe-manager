import { pool } from '../db/connection'
import type { HomepageSpecial, HomepageStyle } from '../types/category'

type UpdateInput = Partial<Pick<HomepageSpecial, 'label' | 'style' | 'items' | 'position' | 'is_active'>>

export const homepageSpecialService = {
  async list(): Promise<HomepageSpecial[]> {
    const { rows } = await pool.query<HomepageSpecial>(
      `SELECT * FROM homepage_specials ORDER BY position`
    )
    return rows
  },

  async update(type: string, input: UpdateInput): Promise<HomepageSpecial | undefined> {
    const sets: string[] = []
    const params: unknown[] = []
    let i = 1

    if ('label'     in input) { sets.push(`label     = $${i++}`); params.push(input.label) }
    if ('style'     in input) { sets.push(`style     = $${i++}`); params.push(input.style) }
    if ('items'     in input) { sets.push(`items     = $${i++}`); params.push(input.items) }
    if ('position'  in input) { sets.push(`position  = $${i++}`); params.push(input.position) }
    if ('is_active' in input) { sets.push(`is_active = $${i++}`); params.push(input.is_active) }

    if (sets.length === 0) {
      const all = await this.list()
      return all.find(s => s.type === type)
    }

    sets.push(`updated_at = NOW()`)
    params.push(type)

    const { rows } = await pool.query<HomepageSpecial>(
      `UPDATE homepage_specials SET ${sets.join(', ')} WHERE type = $${i} RETURNING *`,
      params
    )
    return rows[0]
  },
}
