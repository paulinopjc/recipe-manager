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
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS slug TEXT;
    CREATE TABLE IF NOT EXISTS categories (
      id                SERIAL PRIMARY KEY,
      parent_id         INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name              TEXT    NOT NULL,
      slug              TEXT    NOT NULL UNIQUE,
      description       TEXT,
      image_url         TEXT,
      is_home           BOOLEAN NOT NULL DEFAULT false,
      is_active         BOOLEAN NOT NULL DEFAULT true,
      show_on_homepage  BOOLEAN NOT NULL DEFAULT false,
      homepage_style    TEXT    CHECK (homepage_style IN ('slider','grid')) DEFAULT 'grid',
      homepage_items    INTEGER NOT NULL DEFAULT 6,
      homepage_position INTEGER NOT NULL DEFAULT 0,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS recipe_categories (
      recipe_id   INTEGER NOT NULL REFERENCES recipes(id)    ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      PRIMARY KEY (recipe_id, category_id)
    );
    CREATE TABLE IF NOT EXISTS nav_items (
      id          SERIAL PRIMARY KEY,
      parent_id   INTEGER REFERENCES nav_items(id) ON DELETE CASCADE,
      label       TEXT NOT NULL,
      type        TEXT NOT NULL CHECK (type IN ('category','recipe','custom')),
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      recipe_id   INTEGER REFERENCES recipes(id)    ON DELETE SET NULL,
      url         TEXT,
      position    INTEGER NOT NULL DEFAULT 0,
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action      TEXT NOT NULL,
      entity_type TEXT,
      entity_id   INTEGER,
      metadata    JSONB,
      ip          TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    UPDATE recipes SET slug = LOWER(REGEXP_REPLACE(TRIM(title), '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;
    ALTER TABLE recipes ALTER COLUMN slug SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_slug ON recipes(slug);
  `)
})

afterEach(async () => {
  await pool.query(`
    DELETE FROM audit_logs;
    DELETE FROM nav_items;
    DELETE FROM recipe_categories;
    DELETE FROM instructions;
    DELETE FROM ingredients;
    DELETE FROM recipe_sections;
    DELETE FROM recipes;
    DELETE FROM categories;
    DELETE FROM users;
  `)
})

afterAll(async () => {
  await pool.end()
})