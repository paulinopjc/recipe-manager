import 'dotenv/config'
import type { PoolClient } from 'pg'
import { pool } from './connection'
import { USER_ROLES, UserRole } from '../types/user'

const sqlRoles = USER_ROLES.map((role: UserRole) => `'${role}'`).join(', ')

const schema = `
    CREATE TABLE IF NOT EXISTS users (
        id              SERIAL PRIMARY KEY,
        name            TEXT NOT NULL,
        email           TEXT NOT NULL UNIQUE,
        role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN (${sqlRoles})),
        is_active       BOOLEAN NOT NULL DEFAULT true,
        google_sub      TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ingredients (
        id              SERIAL PRIMARY KEY,
        recipe_id       INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        name            TEXT NOT NULL,
        amount          NUMERIC(6,2) NOT NULL,
        unit            TEXT,
        position        INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS instructions (
        id              SERIAL PRIMARY KEY,
        recipe_id       INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        text            TEXT NOT NULL,
        position        INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id);
    CREATE INDEX IF NOT EXISTS idx_ingredients_recipe ON ingredients(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_instructions_recipe ON instructions(recipe_id);

    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_public   BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty  TEXT CHECK (difficulty IN ('easy','medium','hard'));

    CREATE TABLE IF NOT EXISTS recipe_sections (
        id        SERIAL PRIMARY KEY,
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        name      TEXT    NOT NULL,
        position  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sections_recipe ON recipe_sections(recipe_id);

    ALTER TABLE ingredients  ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE;
    ALTER TABLE instructions ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE;

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
    CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
    CREATE INDEX IF NOT EXISTS idx_categories_slug   ON categories(slug);

    CREATE TABLE IF NOT EXISTS recipe_categories (
        recipe_id   INTEGER NOT NULL REFERENCES recipes(id)    ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (recipe_id, category_id)
    );
    CREATE INDEX IF NOT EXISTS idx_rc_recipe   ON recipe_categories(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_rc_category ON recipe_categories(category_id);

    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

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
    CREATE INDEX IF NOT EXISTS idx_nav_items_parent ON nav_items(parent_id);

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
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user   ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS slug TEXT;
    UPDATE recipes SET slug = LOWER(REGEXP_REPLACE(TRIM(title), '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;
    UPDATE recipes r SET slug = r.slug || '-' || r.id
        WHERE EXISTS (SELECT 1 FROM recipes r2 WHERE r2.slug = r.slug AND r2.id < r.id);
    ALTER TABLE recipes ALTER COLUMN slug SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_slug ON recipes(slug);

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'nav_items_type_check_v2'
          AND conrelid = 'nav_items'::regclass
      ) THEN
        ALTER TABLE nav_items DROP CONSTRAINT IF EXISTS nav_items_type_check;
        ALTER TABLE nav_items ADD CONSTRAINT nav_items_type_check_v2
          CHECK (type IN ('category','recipe','custom','featured','most_viewed'));
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS homepage_specials (
      id         SERIAL PRIMARY KEY,
      type       TEXT NOT NULL UNIQUE CHECK (type IN ('featured','most_viewed')),
      label      TEXT NOT NULL DEFAULT '',
      style      TEXT NOT NULL CHECK (style IN ('slider','grid')) DEFAULT 'slider',
      items      INTEGER NOT NULL DEFAULT 6,
      position   INTEGER NOT NULL DEFAULT 100,
      is_active  BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    INSERT INTO homepage_specials (type, label, style, items, position, is_active) VALUES
      ('featured',    'Featured Recipes', 'slider', 6, 50, false),
      ('most_viewed', 'Most Viewed',      'slider', 6, 60, false)
    ON CONFLICT (type) DO NOTHING;
`

async function seedDefaultNavItems(client: PoolClient) {
    const { rows } = await client.query('SELECT COUNT(*) FROM nav_items')
    if (parseInt(rows[0].count, 10) > 0) return
    await client.query(`
        INSERT INTO nav_items (label, type, url, position, is_active) VALUES
            ('Home',    'custom', '/',        0, true),
            ('Recipes', 'custom', '/recipes', 1, true)
    `)
    console.log('Default nav items seeded: Home, Recipes')
}

async function seedAdmin(client: PoolClient) {
    const email = process.env.ADMIN_EMAIL
    if (!email) {
        console.log('ADMIN_EMAIL not set — skipping admin seed')
        return
    }
    await client.query(
        `INSERT INTO users (name, email, role)
         VALUES ($1, $2, 'admin')
         ON CONFLICT (email) DO NOTHING`,
        ['Admin', email]
    )
    console.log(`Admin seed: ${email}`)
}

async function migrate() {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')
        await client.query(schema)
        await seedAdmin(client)
        await seedDefaultNavItems(client)
        await client.query('COMMIT')
        console.log('Migration complete')
    } catch (err) {
        await client.query('ROLLBACK')
        console.error('Migration failed:', err)
        process.exit(1)
    } finally {
        client.release()
        await pool.end()
    }
}

migrate()