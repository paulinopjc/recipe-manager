import { beforeAll, afterEach, afterAll } from '@jest/globals'
import { pool } from '../src/db/connection'

beforeAll(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      role        TEXT NOT NULL DEFAULT 'member',
      is_active   BOOLEAN NOT NULL DEFAULT true,
      google_sub  TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS recipes (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title           TEXT NOT NULL,
      description     TEXT,
      servings        INTEGER,
      prep_minutes    INTEGER,
      cook_minutes    INTEGER,
      cover_image_url TEXT,
      video_url       TEXT,
      is_public       BOOLEAN NOT NULL DEFAULT false,
      is_featured     BOOLEAN NOT NULL DEFAULT false,
      difficulty      TEXT CHECK (difficulty IN ('easy','medium','hard')),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS recipe_sections (
      id        SERIAL PRIMARY KEY,
      recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      name      TEXT    NOT NULL,
      position  INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ingredients (
      id          SERIAL PRIMARY KEY,
      recipe_id   INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      section_id  INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      amount      NUMERIC(6,2) NOT NULL,
      unit        TEXT,
      position    INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS instructions (
      id          SERIAL PRIMARY KEY,
      recipe_id   INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      section_id  INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE,
      text        TEXT NOT NULL,
      position    INTEGER NOT NULL
    );
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_public   BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty  TEXT CHECK (difficulty IN ('easy','medium','hard'));
    ALTER TABLE ingredients  ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE;
    ALTER TABLE instructions ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE;
  `)
})

afterEach(async () => {
  await pool.query('DELETE FROM instructions; DELETE FROM ingredients; DELETE FROM recipes; DELETE FROM users;')
})

afterAll(async () => {
  await pool.end()
})