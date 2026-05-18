import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/recipe_manager'

export const pool = new Pool({ connectionString })