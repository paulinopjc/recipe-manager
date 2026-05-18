import { pool } from '../db/connection'
import type { User, UserRole, UserFilters } from '../types/user'
import { USER_SORTABLE_COLUMNS } from '../constants/userColumns'
import { HttpError } from '../middleware/httpError'

export const userService = {
    async create(input: {name: string, email: string, role: UserRole}): Promise<User> {
        try {
            const { rows } = await pool.query(
                `INSERT INTO users (name, email, role) VALUES ($1, $2, $3) RETURNING *`,
                [input.name, input.email.toLowerCase(), input.role]
            )
            return rows[0]
        } catch (err: unknown) {
            const e = err as { code?: string }
            if (e.code === '23505') throw new HttpError(409, 'Email already in use')
            throw err
        }
    },

    async find(id: number): Promise<User | undefined> {
        const { rows } = await pool.query(
            `SELECT * FROM users WHERE id = $1`, [id]
        )
        return rows[0]
    },

    async findByEmail(email: string): Promise<User | undefined> {
        const { rows } = await pool.query(
            `SELECT * FROM users WHERE email = $1`, [email.toLowerCase()]
        )
        return rows[0]
    },

    async emailExists(email: string): Promise<boolean> {
        const { rows } = await pool.query(
            `SELECT 1 as x FROM users WHERE email = $1`, [email.toLowerCase()]
        )
        return rows.length > 0
    },

    async recordGoogleSub(id: number, sub: string): Promise<void> {
        await pool.query(
            `UPDATE users SET google_sub = $1, updated_at = NOW() WHERE id = $2`, [sub, id]
        )
    },

    async list(opts?: UserFilters): Promise<{ data: User[], total: number}> {
        const rawPage = Math.floor(opts?.page ?? 1)
        const rawPageSize = Math.floor(opts?.pageSize ?? 20)

        const page = Math.max(1, rawPage)
        const pageSize = Math.min(100, Math.max(1, rawPageSize))

        const offset = (page - 1) * pageSize
        const search = opts?.search?.trim() ?? ''
        const sortColumn = USER_SORTABLE_COLUMNS[opts?.sortBy ?? 'created_at']
        const sortOrder = opts?.sortOrder === 'ASC' ? 'ASC' : 'DESC'
        
        const { rows } = await pool.query(
            `SELECT *, COUNT(*) OVER () AS total_count FROM users WHERE ($1 = '' OR name ILIKE $2 OR email ILIKE $2) ORDER BY ${sortColumn} ${sortOrder} LIMIT $3 OFFSET $4`, [search, `%${search}%`, pageSize, offset]
        )
        const total = rows.length > 0 ? Number(rows[0].total_count) : 0
        const data = rows.map(({ total_count, ...rest }) => rest as User)
        return {data, total}
    },

    async toggleActive(id: number): Promise<User | undefined> {
        await pool.query(
            `UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1`, [id]
        )
        return this.find(id)
    },

    async update(id: number, data: { name: string, email: string, role: UserRole }): Promise<User | undefined> {
        const { rows } = await pool.query(
            `UPDATE users
            SET name = $1,
                email = $2,
                role = $3,
                google_sub = CASE WHEN email != $2 THEN NULL ELSE google_sub END,
                updated_at = NOW()
            WHERE id = $4
            RETURNING *`,
            [data.name, data.email.toLowerCase(), data.role, id]
        )
        return rows[0]
    },
}