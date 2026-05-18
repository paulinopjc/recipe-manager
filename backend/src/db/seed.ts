import 'dotenv/config'
import { pool } from './connection'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getOrCreateAdminUser(client: any): Promise<number> {
  const { rows } = await client.query(
    `SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1`
  )
  if (rows.length) return rows[0].id
  const fallback = await client.query(`SELECT id FROM users ORDER BY id LIMIT 1`)
  if (fallback.rows.length) return fallback.rows[0].id
  throw new Error('No users found in the database. Create an account first, then run the seed.')
}

async function getCategoryId(client: any, slug: string): Promise<number> {
  const { rows } = await client.query('SELECT id FROM categories WHERE slug = $1', [slug])
  if (!rows.length) throw new Error(`Category slug not found: ${slug}`)
  return rows[0].id
}

async function recipeExists(client: any, title: string): Promise<boolean> {
  const { rows } = await client.query('SELECT 1 FROM recipes WHERE title = $1', [title])
  return rows.length > 0
}

interface Ingredient { name: string; amount: number; unit?: string | null }
interface RecipeDef {
  title: string
  description: string
  servings: number
  prep_minutes: number
  cook_minutes: number
  difficulty: 'easy' | 'medium' | 'hard'
  category_slug: string
  ingredients: Ingredient[]
  instructions: string[]
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function insertRecipe(client: any, userId: number, r: RecipeDef) {
  if (await recipeExists(client, r.title)) {
    console.log(`  skip: ${r.title}`)
    return
  }
  const catId = await getCategoryId(client, r.category_slug)
  const baseSlug = slugify(r.title)
  // ensure uniqueness by appending a counter if slug already exists
  let slug = baseSlug
  let attempt = 1
  while (true) {
    const { rows: existing } = await client.query('SELECT 1 FROM recipes WHERE slug = $1', [slug])
    if (!existing.length) break
    slug = `${baseSlug}-${++attempt}`
  }
  const { rows } = await client.query(
    `INSERT INTO recipes (user_id, title, slug, description, servings, prep_minutes, cook_minutes,
       difficulty, is_public, is_featured)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,false) RETURNING id`,
    [userId, r.title, slug, r.description, r.servings, r.prep_minutes, r.cook_minutes, r.difficulty]
  )
  const recipeId = rows[0].id
  for (let i = 0; i < r.ingredients.length; i++) {
    const ing = r.ingredients[i]
    await client.query(
      'INSERT INTO ingredients (recipe_id, name, amount, unit, position) VALUES ($1,$2,$3,$4,$5)',
      [recipeId, ing.name, ing.amount, ing.unit ?? null, i + 1]
    )
  }
  for (let i = 0; i < r.instructions.length; i++) {
    await client.query(
      'INSERT INTO instructions (recipe_id, text, position) VALUES ($1,$2,$3)',
      [recipeId, r.instructions[i], i + 1]
    )
  }
  await client.query(
    'INSERT INTO recipe_categories (recipe_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [recipeId, catId]
  )
  console.log(`  + ${r.title}`)
}

// ── Category tree ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  // Root
  { slug: 'home',              name: 'Home',            parent: null,              is_home: true,  show: true,  style: 'grid',   items: 6, pos: 0 },
  // Asia
  { slug: 'asia',              name: 'Asia',            parent: null,              is_home: false, show: true,  style: 'grid',   items: 6, pos: 1 },
  { slug: 'east-asia',         name: 'East Asia',       parent: 'asia',            is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'chinese',           name: 'Chinese',         parent: 'east-asia',       is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'japanese',          name: 'Japanese',        parent: 'east-asia',       is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'south-east-asia',   name: 'South East Asia', parent: 'asia',            is_home: false, show: true,  style: 'slider', items: 6, pos: 2 },
  { slug: 'filipino',          name: 'Filipino',        parent: 'south-east-asia', is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'thai',              name: 'Thai',            parent: 'south-east-asia', is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'south-asia',        name: 'South Asia',      parent: 'asia',            is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'indian',            name: 'Indian',          parent: 'south-asia',      is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  // Africa
  { slug: 'africa',            name: 'Africa',          parent: null,              is_home: false, show: true,  style: 'grid',   items: 6, pos: 3 },
  { slug: 'east-africa',       name: 'East Africa',     parent: 'africa',          is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'kenyan',            name: 'Kenyan',          parent: 'east-africa',     is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'west-africa',       name: 'West Africa',     parent: 'africa',          is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'west-african',      name: 'West African',    parent: 'west-africa',     is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'northeast-africa',  name: 'Northeast Africa',parent: 'africa',          is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'ethiopian',         name: 'Ethiopian',       parent: 'northeast-africa',is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  // Europe
  { slug: 'europe',            name: 'Europe',          parent: null,              is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'western-europe',    name: 'Western Europe',  parent: 'europe',          is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'french',            name: 'French',          parent: 'western-europe',  is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'italian',           name: 'Italian',         parent: 'western-europe',  is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  // Americas
  { slug: 'americas',          name: 'Americas',        parent: null,              is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'caribbean',         name: 'Caribbean',       parent: 'americas',        is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'jamaican',          name: 'Jamaican',        parent: 'caribbean',       is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'central-america',   name: 'Central America', parent: 'americas',        is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
  { slug: 'mexican',           name: 'Mexican',         parent: 'central-america', is_home: false, show: false, style: 'grid',   items: 6, pos: 0 },
]

async function seedCategories(client: any) {
  console.log('\nSeeding categories...')
  const slugToId = new Map<string, number>()

  for (const c of CATEGORIES) {
    const parentId = c.parent ? slugToId.get(c.parent) ?? null : null
    const { rows } = await client.query(
      `INSERT INTO categories (name, slug, parent_id, is_home, is_active, show_on_homepage,
         homepage_style, homepage_items, homepage_position)
       VALUES ($1,$2,$3,$4,true,$5,$6,$7,$8)
       ON CONFLICT (slug) DO UPDATE SET
         show_on_homepage  = EXCLUDED.show_on_homepage,
         homepage_style    = EXCLUDED.homepage_style,
         homepage_items    = EXCLUDED.homepage_items,
         homepage_position = EXCLUDED.homepage_position,
         is_home           = EXCLUDED.is_home,
         updated_at        = NOW()
       RETURNING id`,
      [c.name, c.slug, parentId, c.is_home, c.show, c.style, c.items, c.pos]
    )
    slugToId.set(c.slug, rows[0].id)
    console.log(`  + ${c.name}`)
  }
}

// ── Filipino recipes ──────────────────────────────────────────────────────────

const FILIPINO: RecipeDef[] = [
  {
    title: 'Chicken Adobo',
    description: 'The national dish of the Philippines. Chicken braised in vinegar, soy sauce, garlic, and bay leaves until deeply savory and tender.',
    servings: 4, prep_minutes: 15, cook_minutes: 45, difficulty: 'easy',
    category_slug: 'filipino',
    ingredients: [
      { name: 'chicken thighs', amount: 1000, unit: 'g' },
      { name: 'soy sauce', amount: 80, unit: 'ml' },
      { name: 'white cane vinegar', amount: 80, unit: 'ml' },
      { name: 'garlic cloves, crushed', amount: 8, unit: null },
      { name: 'bay leaves', amount: 4, unit: null },
      { name: 'black peppercorns', amount: 1, unit: 'tsp' },
      { name: 'water', amount: 120, unit: 'ml' },
      { name: 'cooking oil', amount: 2, unit: 'tbsp' },
    ],
    instructions: [
      'Combine chicken, soy sauce, vinegar, garlic, bay leaves, peppercorns, and water in a large pot. Marinate for at least 30 minutes (or overnight).',
      'Bring to a boil over medium-high heat, then reduce to a simmer. Cook uncovered for 25–30 minutes, turning chicken halfway, until tender.',
      'Remove chicken from the pot. Increase heat and reduce the braising liquid by half, about 8 minutes.',
      'Heat oil in a skillet over high heat and sear the chicken pieces skin-side down until golden, about 3 minutes.',
      'Return chicken to the pot, coat with the reduced sauce, and serve over steamed white rice.',
    ],
  },
  {
    title: 'Sinigang na Baboy',
    description: 'A hearty sour tamarind pork soup with vegetables. One of the most beloved comfort foods in Filipino cuisine.',
    servings: 6, prep_minutes: 20, cook_minutes: 60, difficulty: 'medium',
    category_slug: 'filipino',
    ingredients: [
      { name: 'pork ribs', amount: 1000, unit: 'g' },
      { name: 'tamarind powder or paste', amount: 40, unit: 'g' },
      { name: 'water', amount: 2, unit: 'L' },
      { name: 'tomatoes, quartered', amount: 200, unit: 'g' },
      { name: 'onion, quartered', amount: 1, unit: null },
      { name: 'radish (labanos), sliced', amount: 200, unit: 'g' },
      { name: 'string beans', amount: 150, unit: 'g' },
      { name: 'kangkong (water spinach)', amount: 100, unit: 'g' },
      { name: 'fish sauce', amount: 2, unit: 'tbsp' },
      { name: 'salt and pepper', amount: 1, unit: 'tsp' },
    ],
    instructions: [
      'Place pork ribs and water in a large pot. Bring to a boil, skimming off scum that rises to the surface.',
      'Add onions and tomatoes. Reduce heat and simmer for 30 minutes until pork begins to soften.',
      'Dissolve tamarind powder in a cup of the broth and add back to the pot. Season with fish sauce, salt, and pepper.',
      'Add radish and string beans. Cook for 10 minutes until vegetables are just tender.',
      'Add kangkong and simmer for 2 more minutes. Adjust sourness and saltiness to taste. Serve hot.',
    ],
  },
  {
    title: 'Kare-Kare',
    description: 'A rich oxtail and tripe stew in a thick peanut-based sauce. Always served with bagoong (fermented shrimp paste) on the side.',
    servings: 6, prep_minutes: 30, cook_minutes: 180, difficulty: 'hard',
    category_slug: 'filipino',
    ingredients: [
      { name: 'oxtail, cut into pieces', amount: 1200, unit: 'g' },
      { name: 'ground roasted peanuts', amount: 250, unit: 'g' },
      { name: 'peanut butter', amount: 3, unit: 'tbsp' },
      { name: 'eggplant, cut into chunks', amount: 250, unit: 'g' },
      { name: 'banana blossom (puso ng saging)', amount: 200, unit: 'g' },
      { name: 'string beans', amount: 150, unit: 'g' },
      { name: 'bok choy', amount: 150, unit: 'g' },
      { name: 'annatto seeds (for color)', amount: 2, unit: 'tbsp' },
      { name: 'onion, chopped', amount: 1, unit: null },
      { name: 'garlic, minced', amount: 4, unit: 'cloves' },
      { name: 'fish sauce', amount: 2, unit: 'tbsp' },
      { name: 'salt and pepper', amount: 1, unit: 'tsp' },
    ],
    instructions: [
      'Boil oxtail in water for 2–3 hours (or pressure cook for 45 minutes) until very tender. Reserve 4 cups of the broth.',
      'Soak annatto seeds in 1/2 cup warm water for 5 minutes, then strain out seeds and keep the orange liquid.',
      'Sauté garlic and onion in oil until soft. Add oxtail and brown lightly. Add reserved broth and annatto water.',
      'Stir in ground peanuts and peanut butter. Simmer over low heat for 15 minutes, stirring frequently, until sauce thickens.',
      'Add eggplant, banana blossom, and string beans. Cook for 8 minutes. Add bok choy last and cook 2 more minutes.',
      'Season with fish sauce, salt, and pepper. Serve with bagoong alamang (shrimp paste) and steamed rice.',
    ],
  },
  {
    title: 'Lechon Kawali',
    description: 'Crispy deep-fried pork belly. The skin crackles and the meat stays juicy — best served with liver sauce.',
    servings: 4, prep_minutes: 20, cook_minutes: 90, difficulty: 'medium',
    category_slug: 'filipino',
    ingredients: [
      { name: 'pork belly', amount: 1000, unit: 'g' },
      { name: 'salt', amount: 2, unit: 'tsp' },
      { name: 'black pepper', amount: 1, unit: 'tsp' },
      { name: 'bay leaves', amount: 3, unit: null },
      { name: 'garlic cloves', amount: 5, unit: null },
      { name: 'cooking oil for deep frying', amount: 1, unit: 'L' },
    ],
    instructions: [
      'Place pork belly in a pot with enough water to cover. Add salt, pepper, bay leaves, and garlic. Boil for 45–60 minutes until fork-tender.',
      'Remove pork and let it cool completely, then refrigerate uncovered for at least 2 hours (overnight is better for extra crispy skin).',
      'Heat oil in a deep pot to 180°C. Pat the pork belly very dry with paper towels.',
      'Carefully lower pork belly into hot oil skin-side down. Fry for 20–25 minutes, basting with oil, until skin is golden and blistered.',
      'Drain on paper towels. Chop into pieces and serve immediately with spiced vinegar dipping sauce.',
    ],
  },
  {
    title: 'Pancit Bihon',
    description: 'Stir-fried rice noodles with vegetables and meat. A staple at Filipino celebrations representing long life.',
    servings: 6, prep_minutes: 20, cook_minutes: 20, difficulty: 'easy',
    category_slug: 'filipino',
    ingredients: [
      { name: 'rice vermicelli (bihon)', amount: 250, unit: 'g' },
      { name: 'chicken breast, sliced thin', amount: 300, unit: 'g' },
      { name: 'shrimp, peeled', amount: 200, unit: 'g' },
      { name: 'cabbage, shredded', amount: 150, unit: 'g' },
      { name: 'carrots, julienned', amount: 100, unit: 'g' },
      { name: 'snow peas', amount: 80, unit: 'g' },
      { name: 'soy sauce', amount: 3, unit: 'tbsp' },
      { name: 'oyster sauce', amount: 2, unit: 'tbsp' },
      { name: 'garlic, minced', amount: 4, unit: 'cloves' },
      { name: 'chicken broth', amount: 250, unit: 'ml' },
    ],
    instructions: [
      'Soak rice noodles in water for 10 minutes until pliable but not fully soft. Drain and set aside.',
      'Heat oil in a wok over high heat. Sauté garlic until fragrant, then add chicken and cook through. Add shrimp and cook 2 minutes.',
      'Add carrots and snow peas, stir-fry for 2 minutes. Add cabbage and toss briefly.',
      'Push everything to the sides. Add noodles to the centre with chicken broth, soy sauce, and oyster sauce. Toss everything together.',
      'Stir-fry for 3–4 minutes until noodles absorb most of the liquid. Serve garnished with sliced green onions and calamansi.',
    ],
  },
  {
    title: 'Chicken Tinola',
    description: 'A light, gingery chicken soup with green papaya and chili leaves. Simple, nourishing, and deeply comforting.',
    servings: 4, prep_minutes: 15, cook_minutes: 40, difficulty: 'easy',
    category_slug: 'filipino',
    ingredients: [
      { name: 'chicken, cut into pieces', amount: 900, unit: 'g' },
      { name: 'green papaya, peeled and cubed', amount: 300, unit: 'g' },
      { name: 'fresh ginger, sliced thin', amount: 30, unit: 'g' },
      { name: 'garlic, minced', amount: 4, unit: 'cloves' },
      { name: 'onion, sliced', amount: 1, unit: null },
      { name: 'fish sauce', amount: 2, unit: 'tbsp' },
      { name: 'chicken broth', amount: 1, unit: 'L' },
      { name: 'chili leaves or spinach', amount: 60, unit: 'g' },
    ],
    instructions: [
      'Heat oil in a pot over medium heat. Sauté ginger, garlic, and onion until onion is translucent and fragrant.',
      'Add chicken pieces and cook until lightly browned on the outside, about 5 minutes.',
      'Pour in chicken broth and season with fish sauce. Bring to a boil, then reduce heat and simmer for 20 minutes.',
      'Add green papaya cubes and cook until tender, about 10 minutes.',
      'Add chili leaves, stir once, and remove from heat. Serve immediately with steamed rice.',
    ],
  },
  {
    title: 'Laing',
    description: 'Taro leaves slow-cooked in rich coconut milk with pork and shrimp paste. A classic from the Bicol region.',
    servings: 4, prep_minutes: 10, cook_minutes: 50, difficulty: 'medium',
    category_slug: 'filipino',
    ingredients: [
      { name: 'dried taro leaves (dahon ng gabi)', amount: 100, unit: 'g' },
      { name: 'pork belly, cubed', amount: 200, unit: 'g' },
      { name: 'coconut milk', amount: 400, unit: 'ml' },
      { name: 'coconut cream', amount: 200, unit: 'ml' },
      { name: 'bagoong (shrimp paste)', amount: 2, unit: 'tbsp' },
      { name: 'bird eye chilies, whole', amount: 5, unit: null },
      { name: 'garlic, minced', amount: 4, unit: 'cloves' },
      { name: 'onion, sliced', amount: 1, unit: null },
    ],
    instructions: [
      'Do not wash the dried taro leaves — this causes itching. Sauté garlic and onion in oil until soft.',
      'Add pork belly and brown lightly. Add bagoong and stir to coat the pork.',
      'Pour in coconut milk and add whole chilies. Bring to a simmer.',
      'Add taro leaves without stirring. Cover and cook on low heat for 20 minutes. Do not uncover during this time.',
      'Stir everything together, then add coconut cream. Simmer uncovered for another 15 minutes until sauce is thick and oily. Serve with rice.',
    ],
  },
]

// ── Chinese recipes ───────────────────────────────────────────────────────────

const CHINESE: RecipeDef[] = [
  {
    title: 'Kung Pao Chicken',
    description: 'A Sichuan classic of diced chicken, roasted peanuts, and dried chilies in a sweet-spicy-tangy sauce.',
    servings: 4, prep_minutes: 20, cook_minutes: 15, difficulty: 'medium',
    category_slug: 'chinese',
    ingredients: [
      { name: 'chicken breast, diced 2cm', amount: 500, unit: 'g' },
      { name: 'roasted peanuts', amount: 80, unit: 'g' },
      { name: 'dried red chilies', amount: 10, unit: null },
      { name: 'Sichuan peppercorns', amount: 1, unit: 'tsp' },
      { name: 'soy sauce', amount: 2, unit: 'tbsp' },
      { name: 'rice vinegar', amount: 1, unit: 'tbsp' },
      { name: 'hoisin sauce', amount: 1, unit: 'tbsp' },
      { name: 'sugar', amount: 1, unit: 'tsp' },
      { name: 'cornstarch', amount: 1, unit: 'tbsp' },
      { name: 'garlic, minced', amount: 3, unit: 'cloves' },
      { name: 'fresh ginger, minced', amount: 10, unit: 'g' },
      { name: 'vegetable oil', amount: 3, unit: 'tbsp' },
    ],
    instructions: [
      'Mix soy sauce, rice vinegar, hoisin sauce, sugar, and 1 tsp cornstarch into the sauce. Separately, toss diced chicken with remaining cornstarch.',
      'Heat wok over high heat until smoking. Add oil, then dried chilies and Sichuan peppercorns. Stir 30 seconds until fragrant.',
      'Add chicken and stir-fry for 3–4 minutes until cooked through and lightly charred at edges.',
      'Push chicken aside, add garlic and ginger, stir 30 seconds. Pour sauce over everything and toss to coat.',
      'Add peanuts, toss once more, and serve immediately over steamed rice.',
    ],
  },
  {
    title: 'Mapo Tofu',
    description: 'Silken tofu in a fiery, numbing sauce of doubanjiang, fermented black beans, and ground pork. A Sichuan icon.',
    servings: 3, prep_minutes: 10, cook_minutes: 20, difficulty: 'medium',
    category_slug: 'chinese',
    ingredients: [
      { name: 'silken tofu, cubed', amount: 400, unit: 'g' },
      { name: 'ground pork', amount: 150, unit: 'g' },
      { name: 'doubanjiang (chili bean paste)', amount: 2, unit: 'tbsp' },
      { name: 'fermented black beans', amount: 1, unit: 'tbsp' },
      { name: 'chicken stock', amount: 200, unit: 'ml' },
      { name: 'Sichuan peppercorns, ground', amount: 1, unit: 'tsp' },
      { name: 'garlic, minced', amount: 3, unit: 'cloves' },
      { name: 'ginger, minced', amount: 10, unit: 'g' },
      { name: 'cornstarch', amount: 1, unit: 'tbsp' },
      { name: 'sesame oil', amount: 1, unit: 'tsp' },
      { name: 'green onions, sliced', amount: 3, unit: null },
    ],
    instructions: [
      'Gently slide tofu cubes into boiling salted water. Blanch 2 minutes, then carefully drain. This firms the tofu and seasons it.',
      'Heat oil in a wok. Add doubanjiang and black beans, stir-fry 1 minute until deep red and fragrant. Add garlic and ginger.',
      'Add ground pork and break it up, cooking until no longer pink.',
      'Add chicken stock and bring to a simmer. Gently add tofu cubes. Spoon sauce over tofu without breaking it.',
      'Mix cornstarch with 2 tbsp water and stir into the wok. Simmer 2 minutes until sauce coats the tofu. Finish with sesame oil and green onions. Top with ground Sichuan pepper.',
    ],
  },
  {
    title: 'Char Siu Pork',
    description: 'Cantonese BBQ pork glazed with honey, hoisin, and five-spice. Sticky, sweet, and deeply red.',
    servings: 4, prep_minutes: 15, cook_minutes: 40, difficulty: 'medium',
    category_slug: 'chinese',
    ingredients: [
      { name: 'pork shoulder or neck, in strips', amount: 800, unit: 'g' },
      { name: 'hoisin sauce', amount: 3, unit: 'tbsp' },
      { name: 'soy sauce', amount: 2, unit: 'tbsp' },
      { name: 'honey', amount: 2, unit: 'tbsp' },
      { name: 'Shaoxing rice wine', amount: 2, unit: 'tbsp' },
      { name: 'five-spice powder', amount: 1, unit: 'tsp' },
      { name: 'sesame oil', amount: 1, unit: 'tbsp' },
      { name: 'red food colouring (optional)', amount: 0.5, unit: 'tsp' },
    ],
    instructions: [
      'Combine all marinade ingredients. Toss pork strips in the marinade, cover, and refrigerate overnight (minimum 4 hours).',
      'Preheat oven to 200°C. Place pork on a wire rack over a foil-lined tray. Reserve the marinade.',
      'Roast for 20 minutes. Flip, brush with reserved marinade, and roast another 15 minutes.',
      'Brush with remaining honey and switch to broil (grill) for 3–5 minutes until edges char slightly.',
      'Rest for 5 minutes, then slice and serve over rice with some of the pan drippings drizzled over.',
    ],
  },
  {
    title: 'Wonton Soup',
    description: 'Delicate pork and shrimp dumplings in a clear, fragrant broth. A dim sum staple that is just as good made at home.',
    servings: 4, prep_minutes: 40, cook_minutes: 20, difficulty: 'medium',
    category_slug: 'chinese',
    ingredients: [
      { name: 'wonton wrappers (30 pcs)', amount: 200, unit: 'g' },
      { name: 'ground pork', amount: 200, unit: 'g' },
      { name: 'shrimp, peeled and finely chopped', amount: 150, unit: 'g' },
      { name: 'soy sauce', amount: 1, unit: 'tbsp' },
      { name: 'sesame oil', amount: 1, unit: 'tsp' },
      { name: 'ginger, grated', amount: 5, unit: 'g' },
      { name: 'green onion, minced', amount: 2, unit: null },
      { name: 'chicken stock', amount: 1.2, unit: 'L' },
      { name: 'bok choy, halved', amount: 200, unit: 'g' },
      { name: 'white pepper', amount: 0.5, unit: 'tsp' },
    ],
    instructions: [
      'Combine pork, shrimp, soy sauce, sesame oil, ginger, and green onion. Mix until sticky.',
      'Place 1 tsp filling in the centre of each wonton wrapper. Moisten edges, fold into a triangle, then bring the two bottom corners together and pinch.',
      'Heat stock with a pinch of salt and white pepper. Add bok choy and simmer 3 minutes.',
      'Cook wontons in a separate pot of boiling water for 4–5 minutes until they float and are cooked through.',
      'Divide wontons and bok choy among bowls, ladle over hot broth, and garnish with sesame oil and sliced green onion.',
    ],
  },
  {
    title: 'Egg Fried Rice',
    description: 'The definitive version — day-old rice, high heat, fluffy egg ribbons. Simple done properly.',
    servings: 2, prep_minutes: 5, cook_minutes: 10, difficulty: 'easy',
    category_slug: 'chinese',
    ingredients: [
      { name: 'cooked day-old jasmine rice', amount: 400, unit: 'g' },
      { name: 'eggs', amount: 3, unit: null },
      { name: 'soy sauce', amount: 2, unit: 'tbsp' },
      { name: 'sesame oil', amount: 1, unit: 'tsp' },
      { name: 'garlic, minced', amount: 2, unit: 'cloves' },
      { name: 'green onions, sliced', amount: 3, unit: null },
      { name: 'vegetable oil', amount: 3, unit: 'tbsp' },
      { name: 'white pepper', amount: 0.5, unit: 'tsp' },
    ],
    instructions: [
      'Break up cold rice with your hands so there are no clumps.',
      'Heat wok over maximum heat until it begins to smoke. Add oil and swirl to coat.',
      'Add garlic and stir 20 seconds. Add rice and spread out in a single layer. Leave undisturbed 1 minute to develop a light crust.',
      'Push rice to one side. Add eggs to the empty side and scramble until just set, then fold into rice.',
      'Add soy sauce and white pepper, toss everything vigorously for 2 minutes. Remove from heat, drizzle with sesame oil, and top with green onions.',
    ],
  },
  {
    title: 'Sweet and Sour Pork',
    description: 'Crispy pork pieces tossed in a glossy sweet-sour sauce with pineapple and capsicum. A Cantonese takeaway classic.',
    servings: 4, prep_minutes: 25, cook_minutes: 20, difficulty: 'medium',
    category_slug: 'chinese',
    ingredients: [
      { name: 'pork shoulder, cubed', amount: 600, unit: 'g' },
      { name: 'cornstarch', amount: 80, unit: 'g' },
      { name: 'egg', amount: 1, unit: null },
      { name: 'pineapple chunks', amount: 200, unit: 'g' },
      { name: 'red capsicum, diced', amount: 1, unit: null },
      { name: 'green capsicum, diced', amount: 1, unit: null },
      { name: 'ketchup', amount: 4, unit: 'tbsp' },
      { name: 'rice vinegar', amount: 3, unit: 'tbsp' },
      { name: 'sugar', amount: 3, unit: 'tbsp' },
      { name: 'soy sauce', amount: 1, unit: 'tbsp' },
      { name: 'vegetable oil for frying', amount: 500, unit: 'ml' },
    ],
    instructions: [
      'Toss pork with beaten egg and a pinch of salt. Coat each piece thoroughly in cornstarch.',
      'Make the sauce: combine ketchup, vinegar, sugar, soy sauce, and 2 tbsp water in a bowl.',
      'Deep-fry pork in batches at 180°C for 4–5 minutes until golden and cooked through. Drain on paper towels.',
      'Discard all but 1 tbsp oil from the wok. Stir-fry capsicum 2 minutes. Pour in sauce and bring to a boil until it thickens slightly.',
      'Add pineapple and pork, toss until coated and heated through. Serve immediately over rice.',
    ],
  },
  {
    title: 'Beef and Broccoli',
    description: 'Tender beef strips and crisp broccoli in a rich oyster-ginger sauce. A Chinese-American classic done the proper way.',
    servings: 4, prep_minutes: 20, cook_minutes: 15, difficulty: 'easy',
    category_slug: 'chinese',
    ingredients: [
      { name: 'beef flank steak, sliced thin against grain', amount: 500, unit: 'g' },
      { name: 'broccoli, cut into florets', amount: 400, unit: 'g' },
      { name: 'oyster sauce', amount: 3, unit: 'tbsp' },
      { name: 'soy sauce', amount: 2, unit: 'tbsp' },
      { name: 'Shaoxing wine', amount: 2, unit: 'tbsp' },
      { name: 'cornstarch', amount: 2, unit: 'tbsp' },
      { name: 'garlic, minced', amount: 3, unit: 'cloves' },
      { name: 'ginger, sliced', amount: 15, unit: 'g' },
      { name: 'sesame oil', amount: 1, unit: 'tsp' },
      { name: 'beef stock', amount: 80, unit: 'ml' },
    ],
    instructions: [
      'Marinate beef slices with 1 tbsp soy sauce, 1 tbsp Shaoxing wine, and 1 tbsp cornstarch for 15 minutes.',
      'Mix sauce: oyster sauce, remaining soy sauce and wine, beef stock, and 1 tbsp cornstarch.',
      'Blanch broccoli in boiling salted water for 2 minutes. Drain and set aside.',
      'Sear beef in a very hot oiled wok in a single layer for 1–2 minutes each side. Remove and set aside.',
      'Add garlic and ginger to the wok, stir 30 seconds. Pour in sauce, let it bubble, then return beef and broccoli. Toss to coat. Drizzle with sesame oil and serve.',
    ],
  },
]

// ── Japanese recipes ──────────────────────────────────────────────────────────

const JAPANESE: RecipeDef[] = [
  {
    title: 'Chicken Ramen',
    description: 'A rich, golden chicken broth with springy noodles, soft-boiled egg, and classic toppings. Deeply satisfying and entirely from scratch.',
    servings: 4, prep_minutes: 30, cook_minutes: 90, difficulty: 'hard',
    category_slug: 'japanese',
    ingredients: [
      { name: 'chicken carcasses or wings', amount: 1500, unit: 'g' },
      { name: 'fresh ramen noodles', amount: 400, unit: 'g' },
      { name: 'eggs', amount: 4, unit: null },
      { name: 'soy sauce', amount: 60, unit: 'ml' },
      { name: 'mirin', amount: 30, unit: 'ml' },
      { name: 'garlic cloves', amount: 6, unit: null },
      { name: 'fresh ginger, sliced', amount: 30, unit: 'g' },
      { name: 'green onions', amount: 4, unit: null },
      { name: 'nori sheets', amount: 4, unit: null },
      { name: 'bamboo shoots, sliced', amount: 100, unit: 'g' },
      { name: 'corn kernels', amount: 80, unit: 'g' },
      { name: 'sesame oil', amount: 1, unit: 'tbsp' },
    ],
    instructions: [
      'Blanch chicken in boiling water for 5 minutes, drain and rinse. This removes impurities for a clear broth.',
      'Combine chicken, garlic, ginger, and 2.5L water in a large pot. Bring to a boil, then simmer uncovered for 1.5 hours until the broth is golden and flavourful.',
      'Strain broth and discard solids. Season with soy sauce and mirin. Keep warm.',
      'Soft-boil eggs for 6.5 minutes, transfer to ice water, peel, then marinate in equal parts soy sauce and mirin for at least 30 minutes.',
      'Cook ramen noodles per packet instructions. Divide between bowls, ladle over hot broth, and top with halved marinated egg, nori, green onions, bamboo shoots, and corn. Finish with a drop of sesame oil.',
    ],
  },
  {
    title: 'Katsu Curry',
    description: 'Crispy panko-crumbed pork cutlet served over rice with a thick, fragrant Japanese curry sauce.',
    servings: 4, prep_minutes: 20, cook_minutes: 35, difficulty: 'medium',
    category_slug: 'japanese',
    ingredients: [
      { name: 'pork loin chops, 1.5cm thick', amount: 4, unit: null },
      { name: 'panko breadcrumbs', amount: 150, unit: 'g' },
      { name: 'plain flour', amount: 60, unit: 'g' },
      { name: 'eggs, beaten', amount: 2, unit: null },
      { name: 'Japanese curry roux (S&B or House)', amount: 100, unit: 'g' },
      { name: 'onion, sliced', amount: 1, unit: null },
      { name: 'carrot, cubed', amount: 150, unit: 'g' },
      { name: 'potato, cubed', amount: 200, unit: 'g' },
      { name: 'water', amount: 600, unit: 'ml' },
      { name: 'vegetable oil for frying', amount: 400, unit: 'ml' },
    ],
    instructions: [
      'For the curry: sauté onion until soft. Add carrot and potato, pour in water, and simmer 15 minutes until vegetables are tender. Break curry roux into pieces and stir in until dissolved. Simmer 5 minutes until thick.',
      'Pound pork chops to an even thickness. Season with salt and pepper.',
      'Coat each chop in flour, dip in beaten egg, then press firmly into panko crumbs on both sides.',
      'Heat oil to 170°C. Fry cutlets for 3–4 minutes per side until deep golden. Drain on a rack.',
      'Slice katsu into strips. Serve over steamed rice with curry sauce spooned generously alongside.',
    ],
  },
  {
    title: 'Gyoza',
    description: 'Pan-fried Japanese dumplings with a juicy pork and cabbage filling. Crispy on the bottom, tender on top.',
    servings: 4, prep_minutes: 45, cook_minutes: 15, difficulty: 'medium',
    category_slug: 'japanese',
    ingredients: [
      { name: 'gyoza wrappers (30–35 pcs)', amount: 200, unit: 'g' },
      { name: 'ground pork', amount: 250, unit: 'g' },
      { name: 'cabbage, very finely minced', amount: 200, unit: 'g' },
      { name: 'garlic, grated', amount: 3, unit: 'cloves' },
      { name: 'ginger, grated', amount: 10, unit: 'g' },
      { name: 'soy sauce', amount: 1, unit: 'tbsp' },
      { name: 'sesame oil', amount: 1, unit: 'tbsp' },
      { name: 'green onions, finely chopped', amount: 3, unit: null },
      { name: 'vegetable oil', amount: 2, unit: 'tbsp' },
    ],
    instructions: [
      'Salt cabbage, let sit 10 minutes, then squeeze out as much water as possible. Mix with pork, garlic, ginger, soy sauce, sesame oil, and green onions.',
      'Place 1 tsp filling in the centre of each wrapper. Moisten the edge, fold in half, and crimp into pleats along the top edge.',
      'Heat 1 tbsp oil in a flat-bottomed pan over medium-high heat. Add gyoza in a single layer, flat side down. Fry 2 minutes until bottoms are golden.',
      'Add 60ml water and cover immediately. Steam for 4 minutes until water is absorbed.',
      'Remove lid, add a splash more oil if needed, and let bases crisp up another 1 minute. Serve with soy sauce and rice vinegar for dipping.',
    ],
  },
  {
    title: 'Teriyaki Salmon',
    description: 'Pan-seared salmon glazed with a sticky, sweet-salty teriyaki sauce. On the table in under 20 minutes.',
    servings: 2, prep_minutes: 5, cook_minutes: 15, difficulty: 'easy',
    category_slug: 'japanese',
    ingredients: [
      { name: 'salmon fillets, skin-on', amount: 2, unit: null },
      { name: 'soy sauce', amount: 3, unit: 'tbsp' },
      { name: 'mirin', amount: 3, unit: 'tbsp' },
      { name: 'sake', amount: 2, unit: 'tbsp' },
      { name: 'sugar', amount: 1, unit: 'tbsp' },
      { name: 'vegetable oil', amount: 1, unit: 'tbsp' },
      { name: 'sesame seeds, toasted', amount: 1, unit: 'tsp' },
    ],
    instructions: [
      'Combine soy sauce, mirin, sake, and sugar in a small saucepan. Simmer over low heat for 3 minutes until slightly syrupy. Set aside.',
      'Pat salmon dry with paper towels. Season lightly with salt.',
      'Heat oil in a skillet over medium-high. Place salmon skin-side up and cook 3 minutes until golden. Flip and cook 2 more minutes.',
      'Pour teriyaki sauce over the salmon and spoon it over the fish as it glazes, about 2 minutes.',
      'Remove from heat, sprinkle with sesame seeds, and serve over rice with steamed broccolini.',
    ],
  },
  {
    title: 'Miso Soup with Tofu',
    description: 'The everyday Japanese soup that anchors breakfast, lunch, and dinner. Simple, nourishing, done in 10 minutes.',
    servings: 4, prep_minutes: 5, cook_minutes: 10, difficulty: 'easy',
    category_slug: 'japanese',
    ingredients: [
      { name: 'dashi stock (or water + dashi powder)', amount: 1, unit: 'L' },
      { name: 'white or red miso paste', amount: 4, unit: 'tbsp' },
      { name: 'silken tofu, cubed', amount: 200, unit: 'g' },
      { name: 'dried wakame seaweed', amount: 5, unit: 'g' },
      { name: 'green onions, thinly sliced', amount: 3, unit: null },
    ],
    instructions: [
      'Soak wakame in cold water for 5 minutes until rehydrated. Drain and squeeze gently.',
      'Heat dashi stock in a pot over medium heat. Do not let it boil.',
      'Place miso paste in a ladle and submerge into the hot dashi. Stir with chopsticks to dissolve the miso gradually into the soup. Never boil after adding miso.',
      'Gently add tofu cubes and rehydrated wakame. Heat through for 1–2 minutes.',
      'Ladle into bowls and top with green onions. Serve immediately.',
    ],
  },
  {
    title: 'Onigiri',
    description: 'Japanese rice balls with a savoury filling, wrapped in nori. The ultimate portable snack and lunch staple.',
    servings: 4, prep_minutes: 30, cook_minutes: 0, difficulty: 'easy',
    category_slug: 'japanese',
    ingredients: [
      { name: 'Japanese short-grain rice, cooked and cooled slightly', amount: 600, unit: 'g' },
      { name: 'canned tuna, drained', amount: 100, unit: 'g' },
      { name: 'Japanese mayonnaise', amount: 2, unit: 'tbsp' },
      { name: 'pickled plum (umeboshi)', amount: 4, unit: null },
      { name: 'nori sheets, cut into strips', amount: 4, unit: null },
      { name: 'salt', amount: 1, unit: 'tsp' },
      { name: 'sesame seeds', amount: 1, unit: 'tbsp' },
    ],
    instructions: [
      'Mix tuna with Japanese mayo for one filling. Keep umeboshi whole for another. Season rice lightly with salt.',
      'Wet your hands with cold water and sprinkle lightly with salt. Take a portion of rice (about 120g) and flatten it in your palm.',
      'Place 1 tsp of filling in the centre. Fold rice around the filling and shape into a triangle by pressing firmly with both hands, rotating to form even edges.',
      'Wrap the base of each onigiri with a strip of nori so it stays crisp until eating.',
      'Sprinkle with sesame seeds. Serve at room temperature — best eaten within a few hours of making.',
    ],
  },
]

// ── Thai recipes ──────────────────────────────────────────────────────────────

const THAI: RecipeDef[] = [
  {
    title: 'Pad Thai',
    description: 'Thailand\'s most famous stir-fried noodle dish — chewy rice noodles, egg, prawns, and the essential tamarind-fish sauce balance.',
    servings: 2, prep_minutes: 20, cook_minutes: 15, difficulty: 'medium',
    category_slug: 'thai',
    ingredients: [
      { name: 'flat rice noodles (sen lek), soaked', amount: 200, unit: 'g' },
      { name: 'prawns, peeled and deveined', amount: 200, unit: 'g' },
      { name: 'firm tofu, cubed', amount: 100, unit: 'g' },
      { name: 'eggs', amount: 2, unit: null },
      { name: 'tamarind paste', amount: 2, unit: 'tbsp' },
      { name: 'fish sauce', amount: 2, unit: 'tbsp' },
      { name: 'palm sugar or brown sugar', amount: 1, unit: 'tbsp' },
      { name: 'bean sprouts', amount: 80, unit: 'g' },
      { name: 'garlic, minced', amount: 3, unit: 'cloves' },
      { name: 'dried shrimp', amount: 1, unit: 'tbsp' },
      { name: 'roasted peanuts, crushed', amount: 40, unit: 'g' },
      { name: 'green onions, cut into 3cm lengths', amount: 3, unit: null },
    ],
    instructions: [
      'Mix tamarind paste, fish sauce, and sugar into the Pad Thai sauce. Taste — it should be sour, salty, and lightly sweet.',
      'Heat wok over high heat. Add oil, fry tofu until golden on all sides. Push aside. Add garlic and dried shrimp, stir 30 seconds.',
      'Add prawns and cook until just pink. Push everything to the edges. Crack eggs into the centre, scramble briefly, then fold into everything.',
      'Add drained noodles and sauce. Toss continuously for 2–3 minutes until noodles are coated and tender.',
      'Add bean sprouts and green onions, toss 30 seconds. Serve immediately with crushed peanuts, lime wedge, chili flakes, and extra fish sauce on the side.',
    ],
  },
  {
    title: 'Thai Green Curry',
    description: 'Fragrant green curry paste simmered in coconut milk with chicken and Thai vegetables. Aromatic, creamy, and fiery.',
    servings: 4, prep_minutes: 15, cook_minutes: 25, difficulty: 'medium',
    category_slug: 'thai',
    ingredients: [
      { name: 'chicken thighs, sliced', amount: 600, unit: 'g' },
      { name: 'green curry paste', amount: 3, unit: 'tbsp' },
      { name: 'coconut milk', amount: 400, unit: 'ml' },
      { name: 'coconut cream', amount: 200, unit: 'ml' },
      { name: 'Thai eggplant, quartered', amount: 200, unit: 'g' },
      { name: 'zucchini, sliced', amount: 150, unit: 'g' },
      { name: 'fish sauce', amount: 2, unit: 'tbsp' },
      { name: 'palm sugar', amount: 1, unit: 'tsp' },
      { name: 'Thai basil leaves', amount: 20, unit: null },
      { name: 'kaffir lime leaves', amount: 4, unit: null },
      { name: 'lemongrass stalk, bruised', amount: 1, unit: null },
    ],
    instructions: [
      'In a wok over medium-high heat, fry the green curry paste in 2 tbsp of coconut cream for 2 minutes until fragrant and the oil separates.',
      'Add chicken slices and toss to coat with the paste. Cook for 3 minutes.',
      'Pour in remaining coconut milk and cream. Add lemongrass and kaffir lime leaves. Bring to a gentle simmer.',
      'Add eggplant and zucchini. Season with fish sauce and palm sugar. Cook for 10–12 minutes until vegetables are tender.',
      'Stir in Thai basil just before serving. Remove lemongrass. Serve with jasmine rice.',
    ],
  },
  {
    title: 'Tom Yum Soup',
    description: 'Thailand\'s iconic hot and sour prawn soup. Bold, bright, and done in under 30 minutes.',
    servings: 4, prep_minutes: 15, cook_minutes: 20, difficulty: 'easy',
    category_slug: 'thai',
    ingredients: [
      { name: 'prawns, shell-on', amount: 400, unit: 'g' },
      { name: 'lemongrass stalks, bruised and cut', amount: 2, unit: null },
      { name: 'galangal or ginger, sliced', amount: 30, unit: 'g' },
      { name: 'kaffir lime leaves', amount: 6, unit: null },
      { name: 'bird eye chilies, bruised', amount: 4, unit: null },
      { name: 'straw mushrooms or button mushrooms', amount: 150, unit: 'g' },
      { name: 'fish sauce', amount: 3, unit: 'tbsp' },
      { name: 'lime juice', amount: 3, unit: 'tbsp' },
      { name: 'water or light stock', amount: 1, unit: 'L' },
      { name: 'evaporated milk (for tom yum khon version)', amount: 60, unit: 'ml' },
      { name: 'coriander, to garnish', amount: 10, unit: 'g' },
    ],
    instructions: [
      'Bring water or stock to a boil. Add lemongrass, galangal, kaffir lime leaves, and chilies. Boil 5 minutes to infuse.',
      'Add mushrooms and cook 3 minutes.',
      'Add prawns and cook until just pink, about 2–3 minutes. Do not overcook.',
      'Remove from heat. Season with fish sauce and lime juice. For a creamier version, stir in evaporated milk.',
      'Taste — it should be hot, sour, salty, and aromatic. Garnish with coriander and serve immediately.',
    ],
  },
  {
    title: 'Mango Sticky Rice',
    description: 'Warm glutinous rice soaked in sweet coconut milk, served with ripe mango slices and a drizzle of coconut cream.',
    servings: 4, prep_minutes: 10, cook_minutes: 30, difficulty: 'easy',
    category_slug: 'thai',
    ingredients: [
      { name: 'glutinous (sticky) rice, soaked overnight', amount: 300, unit: 'g' },
      { name: 'ripe mangoes', amount: 2, unit: null },
      { name: 'coconut milk', amount: 400, unit: 'ml' },
      { name: 'sugar', amount: 4, unit: 'tbsp' },
      { name: 'salt', amount: 0.5, unit: 'tsp' },
      { name: 'toasted sesame seeds', amount: 1, unit: 'tbsp' },
    ],
    instructions: [
      'Drain the soaked sticky rice. Steam in a bamboo steamer or over a pot for 20–25 minutes until translucent and tender.',
      'Warm coconut milk with sugar and salt in a small saucepan until sugar dissolves. Do not boil.',
      'Transfer hot steamed rice to a bowl. Pour two-thirds of the warm coconut milk over the rice, stir, and let it absorb for 10 minutes.',
      'Peel and slice mangoes into fans. Arrange alongside a mound of sticky rice.',
      'Drizzle remaining coconut sauce over the rice and mango. Sprinkle with sesame seeds and serve warm.',
    ],
  },
  {
    title: 'Massaman Curry',
    description: 'A slow-cooked, mildly spiced beef curry with potatoes and peanuts. Rich and warming — influenced by Persian and Indian cuisine.',
    servings: 4, prep_minutes: 20, cook_minutes: 90, difficulty: 'medium',
    category_slug: 'thai',
    ingredients: [
      { name: 'beef chuck, cubed', amount: 700, unit: 'g' },
      { name: 'massaman curry paste', amount: 3, unit: 'tbsp' },
      { name: 'coconut milk', amount: 400, unit: 'ml' },
      { name: 'potatoes, peeled and quartered', amount: 300, unit: 'g' },
      { name: 'roasted peanuts', amount: 60, unit: 'g' },
      { name: 'onion, cut into wedges', amount: 1, unit: null },
      { name: 'fish sauce', amount: 2, unit: 'tbsp' },
      { name: 'palm sugar', amount: 1, unit: 'tbsp' },
      { name: 'tamarind paste', amount: 1, unit: 'tbsp' },
      { name: 'cinnamon stick', amount: 1, unit: null },
      { name: 'cardamom pods', amount: 3, unit: null },
    ],
    instructions: [
      'Fry massaman paste in 3 tbsp coconut cream in a wide pot for 2 minutes. Add beef and toss to coat.',
      'Pour in remaining coconut milk and enough water to just cover the beef. Add cinnamon and cardamom.',
      'Bring to a boil, then simmer very gently for 1 hour until beef is starting to become tender.',
      'Add potatoes, onion, and peanuts. Cook another 25–30 minutes until potatoes are soft and the sauce has thickened.',
      'Season with fish sauce, palm sugar, and tamarind. The flavour should be gently sweet, sour, and savoury. Serve with steamed rice.',
    ],
  },
  {
    title: 'Pad See Ew',
    description: 'Wide rice noodles stir-fried with Chinese broccoli, egg, and your choice of protein in a rich sweet dark soy sauce.',
    servings: 2, prep_minutes: 15, cook_minutes: 10, difficulty: 'medium',
    category_slug: 'thai',
    ingredients: [
      { name: 'fresh wide rice noodles (sen yai)', amount: 300, unit: 'g' },
      { name: 'chicken breast, sliced thin', amount: 200, unit: 'g' },
      { name: 'Chinese broccoli (gai lan), cut', amount: 150, unit: 'g' },
      { name: 'eggs', amount: 2, unit: null },
      { name: 'dark soy sauce', amount: 2, unit: 'tbsp' },
      { name: 'oyster sauce', amount: 2, unit: 'tbsp' },
      { name: 'light soy sauce', amount: 1, unit: 'tbsp' },
      { name: 'sugar', amount: 1, unit: 'tsp' },
      { name: 'vegetable oil', amount: 3, unit: 'tbsp' },
    ],
    instructions: [
      'Mix dark soy sauce, oyster sauce, light soy sauce, and sugar into a sauce. Separate noodles gently with your hands.',
      'Heat wok over maximum heat until smoking. Add 2 tbsp oil and sear chicken until cooked. Remove from wok.',
      'Add remaining oil. Add noodles and let them sit undisturbed for 30 seconds to develop some char. Flip and char the other side.',
      'Push noodles aside. Crack eggs in, scramble briefly, then fold through the noodles.',
      'Return chicken, add Chinese broccoli and sauce. Toss together for 1–2 minutes. Serve with chili vinegar on the side.',
    ],
  },
]

// ── Indian recipes ────────────────────────────────────────────────────────────

const INDIAN: RecipeDef[] = [
  {
    title: 'Butter Chicken',
    description: 'Tandoori-marinated chicken in a velvety tomato and butter sauce. The most recognisable Indian dish in the world, and one of the best.',
    servings: 4, prep_minutes: 30, cook_minutes: 45, difficulty: 'medium',
    category_slug: 'indian',
    ingredients: [
      { name: 'chicken thighs, boneless', amount: 800, unit: 'g' },
      { name: 'full-fat yoghurt', amount: 150, unit: 'g' },
      { name: 'garam masala', amount: 2, unit: 'tsp' },
      { name: 'ground cumin', amount: 1, unit: 'tsp' },
      { name: 'tomato passata', amount: 400, unit: 'ml' },
      { name: 'heavy cream', amount: 120, unit: 'ml' },
      { name: 'butter', amount: 60, unit: 'g' },
      { name: 'onion, finely chopped', amount: 1, unit: null },
      { name: 'garlic, minced', amount: 5, unit: 'cloves' },
      { name: 'ginger, grated', amount: 20, unit: 'g' },
      { name: 'kashmiri chili powder', amount: 1.5, unit: 'tsp' },
      { name: 'sugar', amount: 1, unit: 'tsp' },
    ],
    instructions: [
      'Marinate chicken with yoghurt, 1 tsp garam masala, cumin, kashmiri chili, salt, and ginger for at least 1 hour. Grill or pan-fry over high heat until charred in spots. Set aside.',
      'Melt butter in a heavy pan. Sauté onion until golden, about 12 minutes. Add garlic and ginger, cook 2 minutes.',
      'Add passata and remaining garam masala. Simmer for 15 minutes until sauce deepens in colour.',
      'Blend the sauce until smooth. Return to pan, add cream and sugar. Simmer gently for 5 minutes.',
      'Add grilled chicken and any resting juices. Simmer 10 minutes until chicken is coated and sauce is rich. Serve with naan or basmati rice.',
    ],
  },
  {
    title: 'Dal Tadka',
    description: 'Yellow lentils slow-cooked until creamy, then finished with a sizzling tadka of spiced ghee. Hearty everyday comfort food.',
    servings: 4, prep_minutes: 10, cook_minutes: 35, difficulty: 'easy',
    category_slug: 'indian',
    ingredients: [
      { name: 'toor dal (split pigeon peas)', amount: 250, unit: 'g' },
      { name: 'ghee', amount: 3, unit: 'tbsp' },
      { name: 'onion, finely chopped', amount: 1, unit: null },
      { name: 'tomatoes, chopped', amount: 2, unit: null },
      { name: 'garlic, minced', amount: 4, unit: 'cloves' },
      { name: 'ginger, grated', amount: 10, unit: 'g' },
      { name: 'cumin seeds', amount: 1, unit: 'tsp' },
      { name: 'dried red chilies', amount: 2, unit: null },
      { name: 'turmeric', amount: 0.5, unit: 'tsp' },
      { name: 'red chili powder', amount: 0.5, unit: 'tsp' },
      { name: 'coriander, chopped', amount: 15, unit: 'g' },
    ],
    instructions: [
      'Rinse dal and pressure cook with turmeric and 700ml water for 4 whistles (or simmer 30 minutes) until completely soft. Whisk smooth.',
      'Sauté onion in 2 tbsp ghee until deep golden. Add garlic, ginger, and tomatoes. Cook until tomatoes break down, about 10 minutes.',
      'Add chili powder and stir into the tomato-onion base. Pour in the cooked dal, add water to desired consistency. Simmer 5 minutes.',
      'For the tadka: heat remaining ghee in a small pan until hot. Add cumin seeds and dried chilies — they should sizzle immediately. Pour straight over the dal.',
      'Stir in coriander leaves and serve with rice or roti.',
    ],
  },
  {
    title: 'Palak Paneer',
    description: 'Cubes of fresh Indian cheese in a silky, spiced spinach sauce. A vegetarian classic that is genuinely hard to stop eating.',
    servings: 4, prep_minutes: 15, cook_minutes: 25, difficulty: 'medium',
    category_slug: 'indian',
    ingredients: [
      { name: 'paneer, cubed', amount: 300, unit: 'g' },
      { name: 'fresh spinach', amount: 500, unit: 'g' },
      { name: 'onion, chopped', amount: 1, unit: null },
      { name: 'tomatoes, chopped', amount: 2, unit: null },
      { name: 'garlic', amount: 4, unit: 'cloves' },
      { name: 'ginger', amount: 15, unit: 'g' },
      { name: 'heavy cream', amount: 60, unit: 'ml' },
      { name: 'ghee or butter', amount: 2, unit: 'tbsp' },
      { name: 'garam masala', amount: 1, unit: 'tsp' },
      { name: 'cumin seeds', amount: 1, unit: 'tsp' },
      { name: 'kashmiri chili powder', amount: 0.5, unit: 'tsp' },
    ],
    instructions: [
      'Blanch spinach in boiling water for 1 minute. Transfer to ice water, drain, and blend until smooth.',
      'Fry paneer cubes in ghee until golden on two sides. Remove and set aside.',
      'In the same pan, add cumin seeds. Once they sizzle, add onion and cook until golden. Add garlic, ginger, tomatoes, and spices. Cook 8 minutes.',
      'Add spinach purée and cream. Simmer for 5 minutes. Season with salt.',
      'Fold in paneer. Simmer 3 minutes. Drizzle with extra cream and serve with roti or rice.',
    ],
  },
  {
    title: 'Chicken Biryani',
    description: 'Layered slow-cooked chicken and fragrant basmati rice sealed and finished in the dum style. A festive dish worth the effort.',
    servings: 6, prep_minutes: 40, cook_minutes: 60, difficulty: 'hard',
    category_slug: 'indian',
    ingredients: [
      { name: 'chicken pieces, bone-in', amount: 1200, unit: 'g' },
      { name: 'basmati rice, soaked 30 min', amount: 400, unit: 'g' },
      { name: 'full-fat yoghurt', amount: 200, unit: 'g' },
      { name: 'fried onions (birista)', amount: 100, unit: 'g' },
      { name: 'whole spices (cinnamon, cardamom, cloves, bay leaf)', amount: 1, unit: 'tbsp' },
      { name: 'saffron in 3 tbsp warm milk', amount: 0.5, unit: 'tsp' },
      { name: 'mint leaves', amount: 20, unit: 'g' },
      { name: 'ghee', amount: 4, unit: 'tbsp' },
      { name: 'biryani masala powder', amount: 2, unit: 'tbsp' },
      { name: 'ginger-garlic paste', amount: 3, unit: 'tbsp' },
    ],
    instructions: [
      'Marinate chicken with yoghurt, biryani masala, ginger-garlic paste, salt, and half the fried onions for 2 hours.',
      'Par-boil drained rice in heavily salted water with whole spices for 5 minutes — it should be 70% cooked. Drain.',
      'In a heavy pot, heat ghee and cook the marinated chicken for 15 minutes until half-done and sauce has dried slightly.',
      'Layer rice over the chicken. Scatter remaining fried onions, mint, and pour over saffron milk. Seal the pot with foil then the lid.',
      'Cook on high heat for 5 minutes, then the lowest possible heat for 30 minutes (dum). Rest 10 minutes before opening. Gently mix once from the sides before serving.',
    ],
  },
  {
    title: 'Chana Masala',
    description: 'Tender chickpeas in a bold, tangy tomato and onion masala. A street food staple — vegan, protein-rich, and absolutely satisfying.',
    servings: 4, prep_minutes: 15, cook_minutes: 30, difficulty: 'easy',
    category_slug: 'indian',
    ingredients: [
      { name: 'cooked chickpeas', amount: 600, unit: 'g' },
      { name: 'tomatoes, crushed', amount: 400, unit: 'g' },
      { name: 'onion, finely chopped', amount: 2, unit: null },
      { name: 'garlic, minced', amount: 5, unit: 'cloves' },
      { name: 'ginger, grated', amount: 15, unit: 'g' },
      { name: 'chana masala powder', amount: 2, unit: 'tbsp' },
      { name: 'cumin seeds', amount: 1, unit: 'tsp' },
      { name: 'amchur (dried mango powder)', amount: 1, unit: 'tsp' },
      { name: 'oil', amount: 3, unit: 'tbsp' },
      { name: 'coriander, to finish', amount: 15, unit: 'g' },
    ],
    instructions: [
      'Sauté onions in oil over medium heat until deep brown, about 15 minutes. This patience pays off in flavour.',
      'Add garlic and ginger, cook 2 minutes. Add chana masala powder and cumin seeds, stir 1 minute.',
      'Add crushed tomatoes and cook 10 minutes until the oil separates from the masala.',
      'Add chickpeas and 200ml water. Simmer 10 minutes, mashing a few chickpeas to thicken the sauce.',
      'Stir in amchur for tartness. Season with salt and finish with coriander. Serve with bhatura, puri, or rice.',
    ],
  },
  {
    title: 'Vegetable Samosas',
    description: 'Crispy fried pastry parcels filled with spiced potatoes and peas. The ultimate snack — serve hot with mint chutney.',
    servings: 4, prep_minutes: 45, cook_minutes: 30, difficulty: 'hard',
    category_slug: 'indian',
    ingredients: [
      { name: 'plain flour', amount: 250, unit: 'g' },
      { name: 'potatoes, boiled and mashed roughly', amount: 400, unit: 'g' },
      { name: 'frozen peas, thawed', amount: 100, unit: 'g' },
      { name: 'ghee or oil', amount: 2, unit: 'tbsp' },
      { name: 'cumin seeds', amount: 1, unit: 'tsp' },
      { name: 'garam masala', amount: 1, unit: 'tsp' },
      { name: 'green chili, finely chopped', amount: 1, unit: null },
      { name: 'ginger, grated', amount: 10, unit: 'g' },
      { name: 'coriander leaves', amount: 10, unit: 'g' },
      { name: 'oil for deep frying', amount: 1, unit: 'L' },
    ],
    instructions: [
      'Make pastry: rub ghee into flour until crumbly. Add salt and cold water gradually to form a stiff, smooth dough. Rest 20 minutes.',
      'Heat 2 tbsp oil, fry cumin seeds until they pop. Add ginger and green chili. Add mashed potato, peas, garam masala, and salt. Stir well and cool completely.',
      'Divide dough into 8 balls. Roll each into an oval, cut in half. Shape each half into a cone, fill with 2 tbsp potato mixture, seal the edges firmly with water.',
      'Heat oil to 160°C (lower than you think — slow frying gives the crispiest result). Fry samosas for 8–10 minutes, turning, until deep golden.',
      'Drain and serve hot with mint and tamarind chutneys.',
    ],
  },
  {
    title: 'Chicken Tikka Masala',
    description: 'Smoky chargrilled chicken tikka pieces in a creamy, mildly spiced tomato sauce. Arguably the world\'s most popular curry.',
    servings: 4, prep_minutes: 30, cook_minutes: 40, difficulty: 'medium',
    category_slug: 'indian',
    ingredients: [
      { name: 'chicken breast, cubed', amount: 800, unit: 'g' },
      { name: 'full-fat yoghurt', amount: 150, unit: 'g' },
      { name: 'tikka masala paste', amount: 3, unit: 'tbsp' },
      { name: 'tomato passata', amount: 400, unit: 'ml' },
      { name: 'heavy cream', amount: 150, unit: 'ml' },
      { name: 'butter', amount: 40, unit: 'g' },
      { name: 'onion, diced', amount: 1, unit: null },
      { name: 'garlic', amount: 4, unit: 'cloves' },
      { name: 'ginger', amount: 15, unit: 'g' },
      { name: 'dried fenugreek leaves (kasuri methi)', amount: 1, unit: 'tsp' },
    ],
    instructions: [
      'Marinate chicken in yoghurt, 1 tbsp tikka paste, and a pinch of salt for 1–4 hours.',
      'Grill or pan-fry marinated chicken over high heat until charred at the edges. Set aside.',
      'In a wide pan, melt butter and soften onion until golden. Add garlic, ginger, and remaining tikka paste. Cook 3 minutes.',
      'Add passata and simmer 15 minutes until sauce thickens and deepens in colour.',
      'Add cream and kasuri methi. Stir in the charred chicken pieces. Simmer 10 minutes. Serve with naan or basmati rice.',
    ],
  },
  {
    title: 'Raita',
    description: 'A cooling yoghurt condiment with cucumber, mint, and cumin. Essential alongside any spiced Indian meal.',
    servings: 4, prep_minutes: 10, cook_minutes: 0, difficulty: 'easy',
    category_slug: 'indian',
    ingredients: [
      { name: 'full-fat plain yoghurt', amount: 400, unit: 'g' },
      { name: 'cucumber, grated and squeezed dry', amount: 150, unit: 'g' },
      { name: 'fresh mint, finely chopped', amount: 15, unit: 'g' },
      { name: 'cumin seeds, toasted and ground', amount: 0.5, unit: 'tsp' },
      { name: 'salt', amount: 0.5, unit: 'tsp' },
      { name: 'chili powder, pinch', amount: 0.25, unit: 'tsp' },
    ],
    instructions: [
      'Grate the cucumber and squeeze firmly in a clean cloth to remove as much water as possible.',
      'Whisk yoghurt until smooth and creamy. Fold in the squeezed cucumber.',
      'Add mint, ground cumin, and salt. Mix well. Taste and adjust seasoning.',
      'Transfer to a serving bowl and dust lightly with chili powder.',
      'Refrigerate at least 15 minutes before serving. Keeps well for 2 days.',
    ],
  },
]

// ── Kenyan recipes ────────────────────────────────────────────────────────────

const KENYAN: RecipeDef[] = [
  {
    title: 'Nyama Choma',
    description: 'Kenya\'s beloved roasted meat — usually goat or beef, salted simply and cooked low and slow over charcoal until smoky and tender. The centrepiece of any gathering.',
    servings: 4, prep_minutes: 15, cook_minutes: 90, difficulty: 'medium',
    category_slug: 'kenyan',
    ingredients: [
      { name: 'goat ribs or beef short ribs', amount: 1500, unit: 'g' },
      { name: 'coarse salt', amount: 2, unit: 'tsp' },
      { name: 'garlic powder', amount: 1, unit: 'tsp' },
      { name: 'black pepper', amount: 1, unit: 'tsp' },
      { name: 'lemon juice', amount: 2, unit: 'tbsp' },
      { name: 'cooking oil', amount: 2, unit: 'tbsp' },
    ],
    instructions: [
      'Score the meat every 3cm with a knife to allow the seasoning to penetrate. Rub with salt, pepper, garlic powder, lemon juice, and oil.',
      'Prepare a charcoal grill for indirect heat. The coals should be white-hot but not flaming.',
      'Place meat over indirect heat. Cover or tent with foil and cook for 60–75 minutes, turning every 20 minutes.',
      'Move to direct heat for the final 15 minutes, turning frequently to char the outside without burning.',
      'Rest for 10 minutes. Serve chopped into pieces with kachumbari (tomato-onion salad) and ugali on the side.',
    ],
  },
  {
    title: 'Ugali and Sukuma Wiki',
    description: 'Stiff maize flour porridge paired with sautéed collard greens. The everyday staple of Kenyan households — simple, filling, and nourishing.',
    servings: 4, prep_minutes: 10, cook_minutes: 25, difficulty: 'easy',
    category_slug: 'kenyan',
    ingredients: [
      { name: 'white maize flour (unga)', amount: 400, unit: 'g' },
      { name: 'water', amount: 1, unit: 'L' },
      { name: 'collard greens (sukuma wiki), stems removed and sliced', amount: 500, unit: 'g' },
      { name: 'tomatoes, chopped', amount: 2, unit: null },
      { name: 'onion, chopped', amount: 1, unit: null },
      { name: 'garlic, minced', amount: 2, unit: 'cloves' },
      { name: 'cooking oil', amount: 2, unit: 'tbsp' },
      { name: 'salt', amount: 1, unit: 'tsp' },
    ],
    instructions: [
      'For ugali: bring water to a rolling boil in a heavy pot. Add a pinch of salt.',
      'Pour in maize flour gradually in a steady stream, stirring continuously with a wooden spoon to prevent lumps.',
      'Reduce heat to low. Stir vigorously for 8–10 minutes, pulling away from sides until the ugali is thick, smooth, and pulls cleanly from the pot. Cover and rest 5 minutes.',
      'For sukuma wiki: heat oil, fry onion and garlic until soft. Add tomatoes and cook until they break down.',
      'Add the collard greens, stir to coat, and cook for 5–7 minutes until wilted but still bright green. Season with salt. Serve alongside ugali.',
    ],
  },
  {
    title: 'Githeri',
    description: 'A hearty stew of boiled maize and beans, slow-cooked with tomatoes and aromatics. A traditional Kikuyu dish that sustained generations.',
    servings: 4, prep_minutes: 20, cook_minutes: 60, difficulty: 'easy',
    category_slug: 'kenyan',
    ingredients: [
      { name: 'dried kidney beans, soaked overnight', amount: 250, unit: 'g' },
      { name: 'dried maize kernels, soaked overnight', amount: 250, unit: 'g' },
      { name: 'tomatoes, chopped', amount: 3, unit: null },
      { name: 'onion, chopped', amount: 1, unit: null },
      { name: 'garlic, minced', amount: 3, unit: 'cloves' },
      { name: 'green pepper, diced', amount: 1, unit: null },
      { name: 'cooking oil', amount: 2, unit: 'tbsp' },
      { name: 'salt', amount: 1, unit: 'tsp' },
      { name: 'fresh coriander', amount: 10, unit: 'g' },
    ],
    instructions: [
      'Drain the soaked maize and beans. Place in a pressure cooker with fresh water and cook for 35–40 minutes until both are tender (or simmer for 90 minutes in a regular pot).',
      'In a separate pan, sauté onion and garlic in oil until golden. Add tomatoes and green pepper, cook 10 minutes until saucy.',
      'Add the cooked maize and beans to the tomato base. Stir to combine and add a splash of the cooking liquid.',
      'Simmer together for 10 minutes until the stew comes together. Season with salt.',
      'Garnish with fresh coriander and serve as a main dish or alongside vegetable sides.',
    ],
  },
  {
    title: 'Kenyan Pilau',
    description: 'Fragrant spiced rice cooked with beef and whole spices — a Swahili coastal classic with deep Arabic influences.',
    servings: 6, prep_minutes: 20, cook_minutes: 60, difficulty: 'medium',
    category_slug: 'kenyan',
    ingredients: [
      { name: 'basmati rice', amount: 400, unit: 'g' },
      { name: 'beef, cubed', amount: 500, unit: 'g' },
      { name: 'onions, thinly sliced', amount: 2, unit: null },
      { name: 'garlic, minced', amount: 5, unit: 'cloves' },
      { name: 'ginger, grated', amount: 20, unit: 'g' },
      { name: 'whole cumin seeds', amount: 1, unit: 'tsp' },
      { name: 'whole cloves', amount: 5, unit: null },
      { name: 'cardamom pods', amount: 4, unit: null },
      { name: 'cinnamon stick', amount: 1, unit: null },
      { name: 'black peppercorns', amount: 1, unit: 'tsp' },
      { name: 'tomatoes, blended', amount: 3, unit: null },
      { name: 'cooking oil', amount: 4, unit: 'tbsp' },
    ],
    instructions: [
      'Fry onions in oil over medium-high heat until very dark and caramelised — this takes 20 minutes and gives pilau its signature colour.',
      'Add garlic, ginger, and all whole spices. Stir 2 minutes until fragrant.',
      'Add beef and brown all over. Pour in blended tomatoes and simmer 20 minutes until beef is half-cooked and sauce is dry.',
      'Wash and drain rice. Add to the pot with the beef. Pour in 700ml water, season with salt. Stir once.',
      'Bring to a boil, then cover tightly and cook on the lowest heat for 20 minutes until rice is cooked and all water is absorbed. Fluff with a fork and serve with kachumbari.',
    ],
  },
  {
    title: 'Mandazi',
    description: 'East African fried dough flavoured with coconut milk and cardamom. Eaten for breakfast or as a snack with chai.',
    servings: 4, prep_minutes: 20, cook_minutes: 20, difficulty: 'easy',
    category_slug: 'kenyan',
    ingredients: [
      { name: 'plain flour', amount: 300, unit: 'g' },
      { name: 'coconut milk', amount: 150, unit: 'ml' },
      { name: 'sugar', amount: 3, unit: 'tbsp' },
      { name: 'instant yeast', amount: 1, unit: 'tsp' },
      { name: 'ground cardamom', amount: 0.5, unit: 'tsp' },
      { name: 'egg', amount: 1, unit: null },
      { name: 'oil for deep frying', amount: 500, unit: 'ml' },
    ],
    instructions: [
      'Combine flour, sugar, yeast, and cardamom. Add egg and coconut milk gradually, mixing to a soft, smooth dough. Knead 5 minutes.',
      'Cover and rest in a warm place for 30 minutes until slightly puffed.',
      'Roll dough to 1cm thickness. Cut into triangles or rounds.',
      'Heat oil to 175°C. Fry mandazi in batches for 3–4 minutes, turning once, until golden on both sides.',
      'Drain on paper towels. Best eaten warm with spiced Kenyan chai.',
    ],
  },
  {
    title: 'Matoke',
    description: 'Green bananas stewed in a rich beef and tomato sauce. A staple across East Africa — starchy, filling, and deeply savoury.',
    servings: 4, prep_minutes: 20, cook_minutes: 50, difficulty: 'medium',
    category_slug: 'kenyan',
    ingredients: [
      { name: 'green cooking bananas (matoke), peeled', amount: 8, unit: null },
      { name: 'beef, cubed', amount: 400, unit: 'g' },
      { name: 'tomatoes, chopped', amount: 3, unit: null },
      { name: 'onion, chopped', amount: 1, unit: null },
      { name: 'garlic, minced', amount: 3, unit: 'cloves' },
      { name: 'ginger, grated', amount: 10, unit: 'g' },
      { name: 'beef stock or water', amount: 300, unit: 'ml' },
      { name: 'turmeric', amount: 0.5, unit: 'tsp' },
      { name: 'cooking oil', amount: 2, unit: 'tbsp' },
    ],
    instructions: [
      'Peel the green bananas using gloves if possible — the sap stains. Halve them and keep in salted water to prevent browning.',
      'Brown beef in oil. Add onion, garlic, and ginger, cook until soft.',
      'Add tomatoes and turmeric. Cook until tomatoes break down into a sauce.',
      'Add drained matoke and beef stock. Bring to a boil, then cover and simmer over low heat for 30–35 minutes until bananas are tender.',
      'The bananas should be soft but hold their shape. Season with salt and serve with a green vegetable.',
    ],
  },
]

// ── West African recipes ──────────────────────────────────────────────────────

const WEST_AFRICAN: RecipeDef[] = [
  {
    title: 'Jollof Rice',
    description: 'The dish that unites and divides West Africa in equal measure. Long-grain rice cooked in a smoky tomato-pepper base until each grain is stained red and deeply flavoured.',
    servings: 6, prep_minutes: 20, cook_minutes: 60, difficulty: 'medium',
    category_slug: 'west-african',
    ingredients: [
      { name: 'long-grain parboiled rice', amount: 400, unit: 'g' },
      { name: 'plum tomatoes', amount: 400, unit: 'g' },
      { name: 'red bell peppers', amount: 2, unit: null },
      { name: 'scotch bonnet pepper', amount: 1, unit: null },
      { name: 'onions', amount: 2, unit: null },
      { name: 'tomato paste', amount: 2, unit: 'tbsp' },
      { name: 'chicken stock', amount: 500, unit: 'ml' },
      { name: 'cooking oil', amount: 80, unit: 'ml' },
      { name: 'bay leaves', amount: 2, unit: null },
      { name: 'seasoning cubes', amount: 2, unit: null },
      { name: 'dried thyme', amount: 1, unit: 'tsp' },
      { name: 'salt', amount: 1, unit: 'tsp' },
    ],
    instructions: [
      'Blend tomatoes, red peppers, scotch bonnet, and one onion until smooth. Set aside.',
      'Heat oil in a heavy pot. Fry sliced onion until golden. Add tomato paste and fry 3 minutes until it darkens slightly.',
      'Pour in the blended tomato mixture. Cook over medium-high heat for 20–25 minutes, stirring regularly, until the rawness is completely gone and the sauce has thickened and turned a deeper red.',
      'Wash and drain rice. Add to the sauce with stock, bay leaves, thyme, and seasoning cubes. Stir once.',
      'Cover tightly with foil then the lid. Cook on the lowest heat for 25–30 minutes. The rice at the bottom should form a slight crust (the "party jollof" smoky bottom). Fluff with a fork and serve.',
    ],
  },
  {
    title: 'Egusi Soup',
    description: 'A thick, intensely flavoured soup made from ground melon seeds, leafy greens, and assorted meat. Eaten with fufu, eba, or pounded yam.',
    servings: 6, prep_minutes: 25, cook_minutes: 60, difficulty: 'hard',
    category_slug: 'west-african',
    ingredients: [
      { name: 'ground egusi (melon seeds)', amount: 250, unit: 'g' },
      { name: 'beef or goat, cut into pieces', amount: 600, unit: 'g' },
      { name: 'smoked fish, flaked', amount: 150, unit: 'g' },
      { name: 'palm oil', amount: 80, unit: 'ml' },
      { name: 'spinach or bitter leaf', amount: 200, unit: 'g' },
      { name: 'ground crayfish', amount: 2, unit: 'tbsp' },
      { name: 'scotch bonnet, ground', amount: 1, unit: null },
      { name: 'onion, blended', amount: 1, unit: null },
      { name: 'stock cubes', amount: 2, unit: null },
      { name: 'locust beans (iru/dawadawa)', amount: 1, unit: 'tbsp' },
    ],
    instructions: [
      'Season and boil the meat with onion, stock cubes, and salt until tender, about 30 minutes. Reserve the stock.',
      'Heat palm oil in a pot. Add blended scotch bonnet and onion, fry for 5 minutes.',
      'Mix ground egusi with a little water to form a paste. Add in clumps to the hot oil — do not stir. Let it fry for 5 minutes until the egusi begins to dry out and form lumps.',
      'Add cooked meat, smoked fish, crayfish, locust beans, and enough stock to achieve your desired consistency. Stir well.',
      'Simmer for 15 minutes, then add leafy greens. Cook 5 more minutes. Serve with pounded yam or eba.',
    ],
  },
  {
    title: 'Suya',
    description: 'West African spiced beef skewers, grilled over an open flame and dusted with yaji spice mix. The ultimate street food.',
    servings: 4, prep_minutes: 20, cook_minutes: 15, difficulty: 'medium',
    category_slug: 'west-african',
    ingredients: [
      { name: 'beef sirloin or rump, sliced thin', amount: 600, unit: 'g' },
      { name: 'ground roasted peanuts', amount: 80, unit: 'g' },
      { name: 'ground ginger', amount: 1, unit: 'tsp' },
      { name: 'paprika', amount: 2, unit: 'tsp' },
      { name: 'ground garlic', amount: 1, unit: 'tsp' },
      { name: 'ground crayfish', amount: 1, unit: 'tbsp' },
      { name: 'chili powder', amount: 1, unit: 'tsp' },
      { name: 'salt', amount: 1, unit: 'tsp' },
      { name: 'vegetable oil', amount: 2, unit: 'tbsp' },
    ],
    instructions: [
      'Mix ground peanuts, paprika, ginger, garlic, crayfish, chili, and salt to make the yaji spice rub.',
      'Slice beef very thin — about 3mm. Brush with oil, then coat both sides thoroughly with the yaji spice mix.',
      'Thread onto skewers. Let stand 15 minutes.',
      'Grill over high heat for 3–4 minutes each side until cooked through and charred at the edges.',
      'Dust with a final sprinkle of yaji before serving. Serve with sliced raw onion, tomato, and more chili on the side.',
    ],
  },
  {
    title: 'Puff Puff',
    description: 'Deep-fried dough balls — slightly sweet, yeasted, and puffy. A beloved West African street snack eaten at any time of day.',
    servings: 6, prep_minutes: 15, cook_minutes: 20, difficulty: 'easy',
    category_slug: 'west-african',
    ingredients: [
      { name: 'plain flour', amount: 300, unit: 'g' },
      { name: 'sugar', amount: 80, unit: 'g' },
      { name: 'instant yeast', amount: 1.5, unit: 'tsp' },
      { name: 'warm water', amount: 200, unit: 'ml' },
      { name: 'salt', amount: 0.5, unit: 'tsp' },
      { name: 'ground nutmeg', amount: 0.25, unit: 'tsp' },
      { name: 'oil for deep frying', amount: 1, unit: 'L' },
    ],
    instructions: [
      'Dissolve yeast and a pinch of sugar in warm water. Rest 5 minutes until foamy.',
      'Mix flour, remaining sugar, salt, and nutmeg. Add the yeast mixture and stir to a smooth, thick batter. It should be thicker than pancake batter.',
      'Cover and prove in a warm place for 45 minutes until bubbled and risen.',
      'Heat oil to 175°C. Using two wet spoons or your hand, scoop walnut-sized portions of batter into the oil. Fry for 4–5 minutes, turning, until deep golden all over.',
      'Drain on paper towels and dust with icing sugar if desired. Eat warm.',
    ],
  },
  {
    title: 'Groundnut Soup',
    description: 'A rich, peanut-based stew with chicken and vegetables. Common across West and Central Africa — each country has its own version.',
    servings: 4, prep_minutes: 20, cook_minutes: 50, difficulty: 'medium',
    category_slug: 'west-african',
    ingredients: [
      { name: 'chicken pieces', amount: 900, unit: 'g' },
      { name: 'natural peanut butter', amount: 200, unit: 'g' },
      { name: 'tomatoes, blended', amount: 3, unit: null },
      { name: 'onion, chopped', amount: 1, unit: null },
      { name: 'scotch bonnet, blended', amount: 1, unit: null },
      { name: 'garlic', amount: 3, unit: 'cloves' },
      { name: 'chicken stock', amount: 500, unit: 'ml' },
      { name: 'ground crayfish', amount: 1, unit: 'tbsp' },
      { name: 'stock cube', amount: 1, unit: null },
      { name: 'spinach or kontomire', amount: 100, unit: 'g' },
    ],
    instructions: [
      'Season and fry chicken pieces until browned. Set aside. In the same pot, sauté onion and garlic.',
      'Add blended tomato and scotch bonnet. Fry for 10 minutes until the oil rises.',
      'Dissolve peanut butter in 200ml warm stock to make a smooth paste. Add to the pot along with remaining stock.',
      'Return chicken to the pot. Add crayfish and stock cube. Simmer over medium-low heat for 25 minutes, stirring frequently — the peanut mixture can stick.',
      'Add spinach and cook 5 more minutes. The soup should be thick and peanut-rich. Serve with rice, fufu, or plantain.',
    ],
  },
  {
    title: 'Kelewele',
    description: 'Ghanaian spiced fried plantain — crispy outside, sweet and fiery inside. Sold everywhere on Accra\'s streets at night.',
    servings: 4, prep_minutes: 10, cook_minutes: 15, difficulty: 'easy',
    category_slug: 'west-african',
    ingredients: [
      { name: 'very ripe plantains', amount: 3, unit: null },
      { name: 'fresh ginger, grated', amount: 15, unit: 'g' },
      { name: 'ground cayenne pepper', amount: 1, unit: 'tsp' },
      { name: 'salt', amount: 0.5, unit: 'tsp' },
      { name: 'ground cloves', amount: 0.25, unit: 'tsp' },
      { name: 'oil for deep frying', amount: 400, unit: 'ml' },
    ],
    instructions: [
      'Peel plantains and cut into 2cm cubes.',
      'Mix grated ginger, cayenne, cloves, and salt with 1 tbsp water to make a paste. Toss plantain cubes in the spice paste until evenly coated.',
      'Heat oil to 180°C. Fry plantain pieces in batches for 4–5 minutes until golden and slightly caramelised.',
      'Do not crowd the pan — they need space to crisp up properly.',
      'Drain on paper towels. Serve hot as a snack or alongside peanuts and a cold drink.',
    ],
  },
]

// ── Ethiopian recipes ─────────────────────────────────────────────────────────

const ETHIOPIAN: RecipeDef[] = [
  {
    title: 'Doro Wat',
    description: 'Ethiopia\'s national dish — chicken legs slow-braised in a deeply spiced berbere and caramelised onion sauce. Served on injera with a whole boiled egg.',
    servings: 4, prep_minutes: 20, cook_minutes: 90, difficulty: 'hard',
    category_slug: 'ethiopian',
    ingredients: [
      { name: 'chicken legs, skin removed', amount: 1200, unit: 'g' },
      { name: 'red onions, very finely minced', amount: 4, unit: null },
      { name: 'berbere spice blend', amount: 4, unit: 'tbsp' },
      { name: 'niter kibbeh (spiced clarified butter) or regular butter', amount: 80, unit: 'g' },
      { name: 'hard-boiled eggs, pierced all over', amount: 4, unit: null },
      { name: 'garlic, minced', amount: 6, unit: 'cloves' },
      { name: 'ginger, grated', amount: 20, unit: 'g' },
      { name: 'dry red wine or tej (honey wine)', amount: 60, unit: 'ml' },
      { name: 'chicken stock', amount: 200, unit: 'ml' },
    ],
    instructions: [
      'Cook onions dry in a heavy pot over medium heat with no oil for 15 minutes, stirring constantly, until they dry out and start to caramelise. This is the key step.',
      'Add niter kibbeh and cook onions in the butter for another 10 minutes until deeply golden.',
      'Add garlic and ginger, cook 3 minutes. Add berbere in stages, stirring and frying each addition for 1–2 minutes.',
      'Add wine and stock, bring to a simmer. Score the chicken legs deeply and add to the sauce. Nestle the pierced eggs in alongside. Cover and cook on low heat for 45 minutes.',
      'The sauce should be very thick and coating the chicken. Adjust seasoning. Serve on injera with the whole eggs placed on top.',
    ],
  },
  {
    title: 'Injera with Misir Wat',
    description: 'Spongy, tangy sourdough flatbread served with slow-cooked red lentil stew. The foundation of Ethiopian communal dining.',
    servings: 4, prep_minutes: 30, cook_minutes: 45, difficulty: 'medium',
    category_slug: 'ethiopian',
    ingredients: [
      { name: 'teff flour', amount: 200, unit: 'g' },
      { name: 'plain flour', amount: 100, unit: 'g' },
      { name: 'water', amount: 350, unit: 'ml' },
      { name: 'red lentils', amount: 300, unit: 'g' },
      { name: 'red onion, minced', amount: 2, unit: null },
      { name: 'berbere spice', amount: 2, unit: 'tbsp' },
      { name: 'niter kibbeh or butter', amount: 3, unit: 'tbsp' },
      { name: 'garlic', amount: 4, unit: 'cloves' },
      { name: 'ginger', amount: 10, unit: 'g' },
      { name: 'tomato paste', amount: 1, unit: 'tbsp' },
    ],
    instructions: [
      'For injera: mix teff and plain flour with water. Whisk until smooth, cover, and ferment at room temperature for 24–48 hours until bubbly and slightly sour.',
      'Cook injera one at a time in a dry, hot non-stick pan: pour a thin spiral of batter from outside in, cover, and steam for 2–3 minutes until holes form and edges curl. Do not flip.',
      'For misir wat: cook onions dry until caramelised. Add butter, garlic, ginger, and berbere. Fry 3 minutes.',
      'Add tomato paste, then rinsed red lentils and 600ml water. Simmer 25–30 minutes, stirring, until lentils are completely broken down and the stew is thick.',
      'Serve the misir wat on the injera — guests tear the injera and scoop up the stew.',
    ],
  },
  {
    title: 'Tibs',
    description: 'Sautéed cubes of beef or lamb with rosemary, garlic, and berbere, cooked on a hot clay pan. Fast, bold, and smoky.',
    servings: 4, prep_minutes: 15, cook_minutes: 15, difficulty: 'easy',
    category_slug: 'ethiopian',
    ingredients: [
      { name: 'beef tenderloin or lamb leg, cubed', amount: 600, unit: 'g' },
      { name: 'niter kibbeh or butter', amount: 3, unit: 'tbsp' },
      { name: 'red onion, sliced', amount: 1, unit: null },
      { name: 'jalapeño, sliced', amount: 2, unit: null },
      { name: 'garlic, minced', amount: 4, unit: 'cloves' },
      { name: 'fresh rosemary sprigs', amount: 2, unit: null },
      { name: 'berbere', amount: 1, unit: 'tsp' },
      { name: 'black pepper', amount: 0.5, unit: 'tsp' },
    ],
    instructions: [
      'Pat meat dry and season with salt, pepper, and berbere.',
      'Heat a cast-iron or heavy pan over very high heat until smoking.',
      'Add niter kibbeh. Once it foams, add the meat in a single layer. Do not stir for 1 minute — let it sear hard.',
      'Add onion, jalapeño, garlic, and rosemary. Toss and cook for 5–7 minutes until meat is browned but still slightly pink in the middle.',
      'Serve immediately on injera or with rice. The dish is best eaten the moment it leaves the pan.',
    ],
  },
  {
    title: 'Shiro',
    description: 'A smooth, comforting stew of ground chickpea flour spiced with berbere and aromatics. Vegan and one of Ethiopia\'s most popular everyday dishes.',
    servings: 4, prep_minutes: 10, cook_minutes: 25, difficulty: 'easy',
    category_slug: 'ethiopian',
    ingredients: [
      { name: 'shiro powder (ground chickpea flour blend)', amount: 150, unit: 'g' },
      { name: 'red onion, finely chopped', amount: 2, unit: null },
      { name: 'garlic, minced', amount: 4, unit: 'cloves' },
      { name: 'niter kibbeh or oil', amount: 3, unit: 'tbsp' },
      { name: 'berbere', amount: 1, unit: 'tsp' },
      { name: 'water', amount: 600, unit: 'ml' },
      { name: 'salt', amount: 0.5, unit: 'tsp' },
    ],
    instructions: [
      'Cook onions in niter kibbeh over medium heat for 12–15 minutes until very soft and golden.',
      'Add garlic and berbere. Stir and cook 2 minutes.',
      'Add 500ml water and bring to a simmer.',
      'Whisk shiro powder with 100ml water until lump-free. Pour gradually into the simmering water, whisking constantly.',
      'Cook on low heat, stirring frequently, for 10 minutes until thick and smooth. Season with salt. The stew should have the consistency of thick hummus. Serve on injera.',
    ],
  },
  {
    title: 'Kitfo',
    description: 'Ethiopian steak tartare — hand-minced lean beef seasoned with mitmita spice and niter kibbeh. Served raw or lightly warmed (lebleb).',
    servings: 4, prep_minutes: 20, cook_minutes: 5, difficulty: 'medium',
    category_slug: 'ethiopian',
    ingredients: [
      { name: 'lean beef (tenderloin or eye of round), hand-minced', amount: 500, unit: 'g' },
      { name: 'niter kibbeh (spiced butter)', amount: 3, unit: 'tbsp' },
      { name: 'mitmita spice (or cayenne + cardamom + cloves)', amount: 1, unit: 'tsp' },
      { name: 'salt', amount: 0.5, unit: 'tsp' },
      { name: 'ayib (Ethiopian fresh cheese) or ricotta', amount: 150, unit: 'g' },
      { name: 'injera or flatbread, to serve', amount: 4, unit: null },
    ],
    instructions: [
      'Use the freshest beef possible. Hand-mince with a sharp knife rather than a grinder for better texture.',
      'Warm niter kibbeh gently in a pan — it should be liquid but not hot.',
      'Toss minced beef with warm niter kibbeh, mitmita, and salt until evenly coated.',
      'For raw kitfo: serve immediately at room temperature. For lebleb: stir in the pan over low heat for just 2–3 minutes until the outside turns from red to pink.',
      'Plate with ayib on the side and serve on injera. The cool, mild cheese balances the spiced beef.',
    ],
  },
]
// ── French recipes ────────────────────────────────────────────────────────────

const FRENCH: RecipeDef[] = [
  {
    title: 'Coq au Vin',
    description: 'Chicken braised low and slow in red wine with lardons, mushrooms, and pearl onions until the sauce is silky and the meat falls from the bone.',
    servings: 4, prep_minutes: 30, cook_minutes: 90, difficulty: 'hard',
    category_slug: 'french',
    ingredients: [
      { name: 'chicken pieces, bone-in', amount: 1400, unit: 'g' },
      { name: 'red wine (Burgundy or Pinot Noir)', amount: 750, unit: 'ml' },
      { name: 'lardons or diced bacon', amount: 150, unit: 'g' },
      { name: 'pearl onions, peeled', amount: 200, unit: 'g' },
      { name: 'button mushrooms', amount: 250, unit: 'g' },
      { name: 'garlic cloves', amount: 4, unit: null },
      { name: 'chicken stock', amount: 250, unit: 'ml' },
      { name: 'tomato paste', amount: 1, unit: 'tbsp' },
      { name: 'fresh thyme sprigs', amount: 4, unit: null },
      { name: 'bay leaves', amount: 2, unit: null },
      { name: 'butter', amount: 40, unit: 'g' },
      { name: 'plain flour', amount: 2, unit: 'tbsp' },
    ],
    instructions: [
      'Marinate chicken in wine with thyme, bay leaves, and garlic overnight in the fridge.',
      'Remove chicken and pat dry. Reserve the marinade. Brown chicken in butter in a casserole over high heat. Set aside.',
      'Fry lardons until crisp. Add pearl onions and brown lightly. Sprinkle in flour and stir to coat. Pour in the reserved marinade and stock.',
      'Add tomato paste, return chicken to the pot, and bring to a simmer. Cover and cook over very low heat for 60–70 minutes until chicken is very tender.',
      'Sauté mushrooms separately in butter and add to the pot for the last 10 minutes. Remove thyme and bay leaves. Adjust seasoning and serve with crusty bread or mash.',
    ],
  },
  {
    title: 'French Onion Soup',
    description: 'Deeply caramelised onions in a rich beef broth, topped with a crouton buried under melted Gruyère. Patience is the key ingredient.',
    servings: 4, prep_minutes: 15, cook_minutes: 75, difficulty: 'medium',
    category_slug: 'french',
    ingredients: [
      { name: 'onions, thinly sliced', amount: 1200, unit: 'g' },
      { name: 'beef stock', amount: 1.2, unit: 'L' },
      { name: 'dry white wine or vermouth', amount: 150, unit: 'ml' },
      { name: 'butter', amount: 50, unit: 'g' },
      { name: 'olive oil', amount: 1, unit: 'tbsp' },
      { name: 'fresh thyme', amount: 4, unit: 'sprigs' },
      { name: 'bay leaf', amount: 1, unit: null },
      { name: 'baguette, sliced', amount: 8, unit: 'slices' },
      { name: 'Gruyère cheese, grated', amount: 200, unit: 'g' },
      { name: 'brandy or Cognac', amount: 2, unit: 'tbsp' },
    ],
    instructions: [
      'Melt butter with olive oil in a heavy pot. Add all the onions with a pinch of salt. Cook over medium-low heat for 45–60 minutes, stirring every 10 minutes, until deep amber and jammy.',
      'Add brandy and let it bubble off. Add wine and reduce for 3 minutes.',
      'Add stock, thyme, and bay leaf. Simmer for 15 minutes. Season well.',
      'Toast baguette slices under a grill until golden on both sides.',
      'Ladle soup into oven-safe bowls. Float croutons on top and bury under a generous mound of Gruyère. Grill until cheese is bubbling and spotted brown.',
    ],
  },
  {
    title: 'Ratatouille',
    description: 'A Provençal vegetable stew of tomatoes, zucchini, eggplant, and peppers. Simple vegetables coaxed into something greater than their parts.',
    servings: 4, prep_minutes: 25, cook_minutes: 50, difficulty: 'medium',
    category_slug: 'french',
    ingredients: [
      { name: 'eggplant, cubed', amount: 300, unit: 'g' },
      { name: 'zucchini, cubed', amount: 300, unit: 'g' },
      { name: 'red and yellow capsicum, diced', amount: 2, unit: null },
      { name: 'plum tomatoes, chopped', amount: 400, unit: 'g' },
      { name: 'onion, diced', amount: 1, unit: null },
      { name: 'garlic cloves, minced', amount: 4, unit: null },
      { name: 'olive oil', amount: 60, unit: 'ml' },
      { name: 'fresh thyme and rosemary', amount: 4, unit: 'sprigs' },
      { name: 'fresh basil', amount: 15, unit: 'g' },
      { name: 'salt and pepper', amount: 1, unit: 'tsp' },
    ],
    instructions: [
      'Salt eggplant cubes and rest 15 minutes. Rinse and pat dry — this removes bitterness.',
      'Sauté each vegetable separately in olive oil until lightly golden. This step keeps each vegetable\'s texture distinct.',
      'In the same pot, soften onion and garlic. Add tomatoes, thyme, and rosemary. Simmer 10 minutes.',
      'Add all the cooked vegetables to the tomato base. Season generously and simmer together for 20 minutes, partially covered.',
      'Remove herb sprigs. Tear in fresh basil. Serve warm or at room temperature — ratatouille is better the next day.',
    ],
  },
  {
    title: 'Crêpes',
    description: 'Thin French pancakes — lacy-edged, butter-scented, and endlessly versatile. The batter needs just 30 minutes rest to be perfect.',
    servings: 4, prep_minutes: 10, cook_minutes: 20, difficulty: 'easy',
    category_slug: 'french',
    ingredients: [
      { name: 'plain flour', amount: 150, unit: 'g' },
      { name: 'eggs', amount: 2, unit: null },
      { name: 'milk', amount: 350, unit: 'ml' },
      { name: 'butter, melted', amount: 30, unit: 'g' },
      { name: 'salt', amount: 0.25, unit: 'tsp' },
      { name: 'sugar', amount: 1, unit: 'tbsp' },
      { name: 'vanilla extract', amount: 0.5, unit: 'tsp' },
      { name: 'butter for frying', amount: 20, unit: 'g' },
    ],
    instructions: [
      'Whisk flour, salt, and sugar together. Make a well, add eggs, and whisk inward. Gradually add milk to get a smooth, thin batter. Whisk in melted butter and vanilla.',
      'Rest batter for 30 minutes — this relaxes the gluten and ensures tender crêpes.',
      'Heat a 20–22cm non-stick pan over medium-high. Add a small knob of butter and swirl to coat.',
      'Pour in just enough batter (about 60ml) to coat the base when you tilt the pan. Cook 1 minute until golden at the edges. Flip and cook 30 seconds more.',
      'Serve with lemon and sugar, Nutella, or jam. Stack with baking paper between each crêpe to keep them warm.',
    ],
  },
  {
    title: 'Beef Bourguignon',
    description: 'Beef braised in Burgundy wine with lardons, mushrooms, and vegetables. Julia Child\'s greatest gift to home cooks.',
    servings: 6, prep_minutes: 40, cook_minutes: 180, difficulty: 'hard',
    category_slug: 'french',
    ingredients: [
      { name: 'beef chuck, cut into large cubes', amount: 1200, unit: 'g' },
      { name: 'Burgundy wine', amount: 750, unit: 'ml' },
      { name: 'beef stock', amount: 400, unit: 'ml' },
      { name: 'lardons', amount: 200, unit: 'g' },
      { name: 'pearl onions', amount: 200, unit: 'g' },
      { name: 'mushrooms, quartered', amount: 300, unit: 'g' },
      { name: 'carrots, sliced', amount: 2, unit: null },
      { name: 'garlic cloves', amount: 4, unit: null },
      { name: 'tomato paste', amount: 2, unit: 'tbsp' },
      { name: 'fresh thyme and bay leaves', amount: 1, unit: 'bouquet' },
      { name: 'butter', amount: 50, unit: 'g' },
      { name: 'plain flour', amount: 3, unit: 'tbsp' },
    ],
    instructions: [
      'Pat beef dry and season. Sear in batches in a hot casserole with butter until deeply browned on all sides. Remove.',
      'Brown lardons. Add carrots, garlic, and tomato paste. Sprinkle flour over and stir to coat.',
      'Return beef to the pot. Pour wine over to just cover. Add stock and herb bouquet. Bring to a boil, skim, then cover.',
      'Braise in a 160°C oven for 2.5–3 hours until beef is completely tender and sauce is glossy.',
      'Separately sauté mushrooms and pearl onions until golden. Add to the braise for the last 20 minutes. Remove herbs and serve over mashed potatoes.',
    ],
  },
  {
    title: 'Tarte Tatin',
    description: 'Caramelised upside-down apple tart — buttery pastry, amber caramel, and soft apples. An accident turned masterpiece.',
    servings: 6, prep_minutes: 20, cook_minutes: 45, difficulty: 'medium',
    category_slug: 'french',
    ingredients: [
      { name: 'firm apples (Granny Smith or Braeburn), peeled, cored, halved', amount: 1200, unit: 'g' },
      { name: 'caster sugar', amount: 150, unit: 'g' },
      { name: 'butter', amount: 80, unit: 'g' },
      { name: 'ready-made puff pastry', amount: 250, unit: 'g' },
      { name: 'vanilla extract', amount: 0.5, unit: 'tsp' },
    ],
    instructions: [
      'Melt butter with sugar in a 24cm ovenproof skillet over medium heat. Cook without stirring until the caramel turns deep amber.',
      'Arrange apple halves cut-side up tightly in the caramel, packing them closely as they shrink during cooking. Cook 10 minutes on the stove.',
      'Roll pastry into a circle slightly larger than the skillet. Lay it over the apples, tucking the edges down inside the pan.',
      'Bake at 200°C for 25–30 minutes until pastry is golden and puffed.',
      'Rest 5 minutes, then invert immediately onto a plate. Serve warm with crème fraîche or vanilla ice cream.',
    ],
  },
]

// ── Italian recipes ───────────────────────────────────────────────────────────

const ITALIAN: RecipeDef[] = [
  {
    title: 'Cacio e Pepe',
    description: 'Three ingredients: pasta, Pecorino Romano, and black pepper. One of the most technically demanding yet simple pastas in Italian cooking.',
    servings: 2, prep_minutes: 5, cook_minutes: 15, difficulty: 'medium',
    category_slug: 'italian',
    ingredients: [
      { name: 'spaghetti or tonnarelli', amount: 200, unit: 'g' },
      { name: 'Pecorino Romano, finely grated', amount: 100, unit: 'g' },
      { name: 'Parmesan, finely grated', amount: 30, unit: 'g' },
      { name: 'black peppercorns, coarsely ground', amount: 2, unit: 'tsp' },
      { name: 'salt', amount: 1, unit: 'tsp' },
    ],
    instructions: [
      'Cook pasta in well-salted water until 2 minutes before al dente. Reserve 300ml starchy pasta water.',
      'Toast black pepper in a dry wide skillet until fragrant, about 1 minute. Add a ladleful of pasta water and let it reduce by half.',
      'Add pasta to the skillet and toss with the pepper water.',
      'Remove from heat. Mix grated cheeses with 80ml pasta water to form a creamy paste. Pour over pasta, tossing vigorously and adding more water a splash at a time — the goal is a glossy, clinging sauce, not scrambled eggs.',
      'Serve immediately with an extra crack of black pepper and more Pecorino.',
    ],
  },
  {
    title: 'Osso Buco',
    description: 'Braised veal shanks with white wine, vegetables, and gremolata. A Milanese classic best served with saffron risotto.',
    servings: 4, prep_minutes: 20, cook_minutes: 120, difficulty: 'hard',
    category_slug: 'italian',
    ingredients: [
      { name: 'veal shanks, cross-cut', amount: 4, unit: null },
      { name: 'dry white wine', amount: 250, unit: 'ml' },
      { name: 'beef or veal stock', amount: 400, unit: 'ml' },
      { name: 'plum tomatoes, chopped', amount: 300, unit: 'g' },
      { name: 'onion, diced', amount: 1, unit: null },
      { name: 'carrot, diced', amount: 1, unit: null },
      { name: 'celery stalk, diced', amount: 2, unit: null },
      { name: 'garlic', amount: 3, unit: 'cloves' },
      { name: 'plain flour for dusting', amount: 50, unit: 'g' },
      { name: 'lemon zest', amount: 1, unit: 'tsp' },
      { name: 'fresh parsley, chopped', amount: 20, unit: 'g' },
      { name: 'garlic, minced (for gremolata)', amount: 1, unit: 'clove' },
    ],
    instructions: [
      'Tie veal shanks with kitchen string to hold their shape. Dust lightly with flour and season.',
      'Sear shanks in olive oil over high heat until browned on both sides. Remove.',
      'Soften onion, carrot, celery, and garlic in the same pot. Add wine and let it reduce by half. Add tomatoes and stock.',
      'Return shanks to the pot. The liquid should come halfway up. Cover and braise at 160°C for 1.5–2 hours, turning once, until meat is pulling away from the bone.',
      'Make gremolata: mix lemon zest, minced garlic, and parsley. Scatter over shanks just before serving with risotto Milanese.',
    ],
  },
  {
    title: 'Ribollita',
    description: 'Tuscan bread and bean soup — thick enough to stand a spoon in, and better the second time it\'s reheated (hence the name: "reboiled").',
    servings: 6, prep_minutes: 20, cook_minutes: 60, difficulty: 'easy',
    category_slug: 'italian',
    ingredients: [
      { name: 'cannellini beans, cooked', amount: 600, unit: 'g' },
      { name: 'cavolo nero (Tuscan kale), chopped', amount: 300, unit: 'g' },
      { name: 'day-old sourdough or ciabatta, torn', amount: 200, unit: 'g' },
      { name: 'tomatoes, crushed', amount: 400, unit: 'g' },
      { name: 'onion, diced', amount: 1, unit: null },
      { name: 'carrot, diced', amount: 2, unit: null },
      { name: 'celery, diced', amount: 2, unit: 'stalks' },
      { name: 'garlic', amount: 4, unit: 'cloves' },
      { name: 'olive oil', amount: 60, unit: 'ml' },
      { name: 'vegetable stock', amount: 1.2, unit: 'L' },
      { name: 'rosemary', amount: 1, unit: 'sprig' },
    ],
    instructions: [
      'Sauté onion, carrot, celery, and garlic in olive oil until soft, about 10 minutes.',
      'Add tomatoes and rosemary, cook 5 minutes. Add stock and bring to a simmer.',
      'Mash half the beans to a paste. Add all beans (whole and mashed) to the soup. Simmer 20 minutes.',
      'Add cavolo nero and cook 10 minutes until tender. Season well.',
      'Stir in torn bread until it dissolves and the soup becomes very thick. Serve in bowls with a generous drizzle of your best olive oil. Leftovers are reheated — ribollita — and even better.',
    ],
  },
  {
    title: 'Tiramisu',
    description: 'Layers of espresso-soaked ladyfingers and mascarpone cream dusted with cocoa. No baking, just patience and good ingredients.',
    servings: 6, prep_minutes: 30, cook_minutes: 0, difficulty: 'medium',
    category_slug: 'italian',
    ingredients: [
      { name: 'ladyfinger biscuits (savoiardi)', amount: 24, unit: null },
      { name: 'mascarpone cheese', amount: 500, unit: 'g' },
      { name: 'eggs, separated', amount: 4, unit: null },
      { name: 'caster sugar', amount: 80, unit: 'g' },
      { name: 'strong espresso, cooled', amount: 200, unit: 'ml' },
      { name: 'Marsala wine or dark rum', amount: 3, unit: 'tbsp' },
      { name: 'good-quality cocoa powder', amount: 3, unit: 'tbsp' },
    ],
    instructions: [
      'Beat egg yolks with sugar until pale and thick, about 3 minutes. Fold in mascarpone until smooth.',
      'Whip egg whites to stiff peaks. Gently fold into the mascarpone mixture in two stages.',
      'Mix espresso with Marsala. Quickly dip each ladyfinger (1 second per side — do not soak through) and arrange in a single layer in a dish.',
      'Spread half the cream over the ladyfingers. Sift over half the cocoa. Repeat with a second layer of dipped biscuits and cream.',
      'Refrigerate for at least 4 hours (overnight is best). Dust generously with cocoa just before serving.',
    ],
  },
  {
    title: 'Risotto Milanese',
    description: 'Saffron-scented Milanese risotto — golden, creamy, and stirred to a flowing consistency. The classic partner to osso buco.',
    servings: 4, prep_minutes: 10, cook_minutes: 30, difficulty: 'medium',
    category_slug: 'italian',
    ingredients: [
      { name: 'Arborio or Carnaroli rice', amount: 320, unit: 'g' },
      { name: 'saffron threads', amount: 0.5, unit: 'tsp' },
      { name: 'dry white wine', amount: 150, unit: 'ml' },
      { name: 'chicken or beef stock, hot', amount: 1.2, unit: 'L' },
      { name: 'shallots, finely chopped', amount: 2, unit: null },
      { name: 'butter', amount: 80, unit: 'g' },
      { name: 'Parmesan, grated', amount: 80, unit: 'g' },
      { name: 'salt and white pepper', amount: 1, unit: 'tsp' },
    ],
    instructions: [
      'Steep saffron in 2 tbsp warm stock for 10 minutes.',
      'Sauté shallots in half the butter until soft. Add rice and toast for 2 minutes, stirring, until the grains turn slightly translucent at the edges.',
      'Add wine and stir until absorbed. Add the saffron stock.',
      'Add hot stock one ladle at a time, stirring constantly and waiting until each ladleful is absorbed before adding the next. This takes 18–20 minutes.',
      'When rice is al dente and the risotto flows like lava, remove from heat. Beat in remaining cold butter and Parmesan. Rest 1 minute, then serve immediately.',
    ],
  },
  {
    title: 'Pizza Margherita',
    description: 'Naples-style pizza with San Marzano tomato, fior di latte mozzarella, and basil. The benchmark all other pizzas are measured against.',
    servings: 4, prep_minutes: 30, cook_minutes: 10, difficulty: 'medium',
    category_slug: 'italian',
    ingredients: [
      { name: 'strong bread flour', amount: 500, unit: 'g' },
      { name: 'instant yeast', amount: 7, unit: 'g' },
      { name: 'salt', amount: 10, unit: 'g' },
      { name: 'warm water', amount: 320, unit: 'ml' },
      { name: 'San Marzano tomatoes, crushed by hand', amount: 400, unit: 'g' },
      { name: 'fior di latte or buffalo mozzarella, torn', amount: 300, unit: 'g' },
      { name: 'fresh basil leaves', amount: 20, unit: null },
      { name: 'olive oil', amount: 2, unit: 'tbsp' },
    ],
    instructions: [
      'Mix flour, yeast, and salt. Add water gradually and knead for 10 minutes until smooth and elastic. Divide into 4 balls, cover, and prove 1–2 hours until doubled.',
      'Heat oven to maximum with a pizza stone or heavy baking tray inside for at least 45 minutes.',
      'Season crushed tomatoes with salt and olive oil — do not cook.',
      'Stretch each dough ball by hand into a thin round. Spoon on a thin layer of tomato. Scatter mozzarella.',
      'Slide onto the hot stone and bake 8–10 minutes until crust is blistered and charred in spots. Remove, add fresh basil, and drizzle with olive oil.',
    ],
  },
  {
    title: 'Arancini',
    description: 'Sicilian fried rice balls with a molten mozzarella centre. The best use of leftover risotto ever conceived.',
    servings: 4, prep_minutes: 30, cook_minutes: 20, difficulty: 'hard',
    category_slug: 'italian',
    ingredients: [
      { name: 'cooked risotto, cold', amount: 600, unit: 'g' },
      { name: 'mozzarella, cut into small cubes', amount: 100, unit: 'g' },
      { name: 'plain flour', amount: 80, unit: 'g' },
      { name: 'eggs, beaten', amount: 2, unit: null },
      { name: 'breadcrumbs', amount: 150, unit: 'g' },
      { name: 'Parmesan, grated', amount: 40, unit: 'g' },
      { name: 'oil for deep frying', amount: 1, unit: 'L' },
    ],
    instructions: [
      'Mix cold risotto with Parmesan. Take a golf-ball-sized amount in your palm and flatten slightly.',
      'Place a cube of mozzarella in the centre. Enclose with more risotto and shape firmly into a ball or cone. Repeat.',
      'Set up a breading station: flour → beaten egg → breadcrumbs. Coat each arancino thoroughly, pressing crumbs to adhere.',
      'Refrigerate 30 minutes to firm up.',
      'Fry in batches at 175°C for 4–5 minutes until deep golden all over. Drain and rest 2 minutes — the cheese inside needs to settle. Serve with tomato sauce for dipping.',
    ],
  },
]

// ── Jamaican recipes ──────────────────────────────────────────────────────────

const JAMAICAN: RecipeDef[] = [
  {
    title: 'Jerk Chicken',
    description: 'Chicken marinated in a fiery Scotch bonnet and allspice jerk paste, then grilled over pimento wood until smoky and charred.',
    servings: 4, prep_minutes: 20, cook_minutes: 50, difficulty: 'medium',
    category_slug: 'jamaican',
    ingredients: [
      { name: 'chicken thighs and drumsticks', amount: 1200, unit: 'g' },
      { name: 'Scotch bonnet peppers', amount: 3, unit: null },
      { name: 'whole allspice berries, ground', amount: 2, unit: 'tbsp' },
      { name: 'fresh thyme leaves', amount: 2, unit: 'tbsp' },
      { name: 'garlic cloves', amount: 6, unit: null },
      { name: 'spring onions', amount: 4, unit: null },
      { name: 'fresh ginger', amount: 20, unit: 'g' },
      { name: 'soy sauce', amount: 2, unit: 'tbsp' },
      { name: 'brown sugar', amount: 1, unit: 'tbsp' },
      { name: 'cinnamon', amount: 0.5, unit: 'tsp' },
      { name: 'nutmeg', amount: 0.25, unit: 'tsp' },
      { name: 'lime juice', amount: 2, unit: 'tbsp' },
    ],
    instructions: [
      'Blend Scotch bonnets, allspice, thyme, garlic, spring onions, ginger, soy sauce, sugar, cinnamon, nutmeg, and lime juice into a smooth paste.',
      'Score the chicken deeply and rub the marinade all over and into the cuts. Marinate for at least 4 hours, preferably overnight.',
      'Prepare a grill for indirect heat, or preheat oven to 200°C.',
      'Grill chicken over medium-high direct heat for 10 minutes each side to char, then move to indirect heat and cook another 25–30 minutes until cooked through.',
      'Rest 5 minutes. Serve with rice and peas, festival dumplings, or hard dough bread.',
    ],
  },
  {
    title: 'Ackee and Saltfish',
    description: 'Jamaica\'s national dish — salted cod sautéed with ackee fruit, onion, tomatoes, and Scotch bonnet. A weekend breakfast tradition.',
    servings: 4, prep_minutes: 20, cook_minutes: 25, difficulty: 'medium',
    category_slug: 'jamaican',
    ingredients: [
      { name: 'salt cod (saltfish)', amount: 300, unit: 'g' },
      { name: 'canned ackee, drained', amount: 540, unit: 'g' },
      { name: 'onion, sliced', amount: 1, unit: null },
      { name: 'tomatoes, chopped', amount: 2, unit: null },
      { name: 'Scotch bonnet, seeded and minced', amount: 0.5, unit: null },
      { name: 'spring onions, sliced', amount: 3, unit: null },
      { name: 'fresh thyme', amount: 3, unit: 'sprigs' },
      { name: 'black pepper', amount: 0.5, unit: 'tsp' },
      { name: 'cooking oil', amount: 3, unit: 'tbsp' },
    ],
    instructions: [
      'Soak saltfish in cold water overnight, or bring to a boil and simmer for 15 minutes, changing water once. Drain, flake, and remove bones and skin.',
      'Sauté onion, spring onions, Scotch bonnet, and thyme in oil until soft. Add tomatoes and cook 5 minutes.',
      'Add the flaked saltfish and fold in gently. Cook 5 minutes.',
      'Add drained ackee and fold in carefully — ackee breaks easily and should stay in pieces.',
      'Season with black pepper (saltfish is already salty enough). Serve with boiled green bananas, dumplings, and breadfruit.',
    ],
  },
  {
    title: 'Rice and Peas',
    description: 'Jamaican rice cooked in coconut milk with kidney beans, thyme, and allspice. Not a side dish — the centrepiece of Sunday lunch.',
    servings: 4, prep_minutes: 10, cook_minutes: 30, difficulty: 'easy',
    category_slug: 'jamaican',
    ingredients: [
      { name: 'long-grain rice', amount: 350, unit: 'g' },
      { name: 'cooked kidney beans (or canned)', amount: 200, unit: 'g' },
      { name: 'coconut milk', amount: 400, unit: 'ml' },
      { name: 'water', amount: 300, unit: 'ml' },
      { name: 'garlic cloves', amount: 3, unit: null },
      { name: 'spring onions', amount: 3, unit: null },
      { name: 'fresh thyme', amount: 3, unit: 'sprigs' },
      { name: 'whole allspice berries', amount: 4, unit: null },
      { name: 'Scotch bonnet, whole and intact', amount: 1, unit: null },
      { name: 'salt', amount: 1, unit: 'tsp' },
    ],
    instructions: [
      'Combine coconut milk, water, garlic, spring onions, thyme, allspice, and whole (uncut) Scotch bonnet in a pot. Bring to a boil.',
      'Add kidney beans and salt. Return to a boil.',
      'Add washed rice. Stir once. The liquid should sit about 2cm above the rice.',
      'Cover tightly and cook on the lowest heat for 20–22 minutes until all liquid is absorbed. Do not lift the lid.',
      'Remove the whole Scotch bonnet (it flavours without making the rice hot). Fluff with a fork, discard herb sprigs, and serve.',
    ],
  },
  {
    title: 'Oxtail Stew',
    description: 'Slow-braised oxtail with butter beans, allspice, and Scotch bonnet until the meat is falling off the bone and the sauce is rich and sticky.',
    servings: 4, prep_minutes: 20, cook_minutes: 210, difficulty: 'hard',
    category_slug: 'jamaican',
    ingredients: [
      { name: 'oxtail pieces', amount: 1400, unit: 'g' },
      { name: 'butter beans, cooked', amount: 300, unit: 'g' },
      { name: 'onion, diced', amount: 2, unit: null },
      { name: 'garlic cloves', amount: 5, unit: null },
      { name: 'spring onions', amount: 4, unit: null },
      { name: 'Scotch bonnet, whole', amount: 1, unit: null },
      { name: 'whole allspice', amount: 1, unit: 'tbsp' },
      { name: 'fresh thyme', amount: 4, unit: 'sprigs' },
      { name: 'soy sauce', amount: 2, unit: 'tbsp' },
      { name: 'browning sauce', amount: 1, unit: 'tbsp' },
      { name: 'beef stock', amount: 500, unit: 'ml' },
    ],
    instructions: [
      'Season oxtail with soy sauce, browning, allspice, salt, and pepper. Marinate 1 hour.',
      'Brown oxtail in batches in a heavy pot over high heat. Set aside.',
      'Sauté onion, garlic, and spring onions. Return oxtail. Add stock, thyme, and whole Scotch bonnet.',
      'Bring to a boil, then reduce to a very low simmer. Cover and cook for 2.5–3 hours until meat is completely tender and almost falling from the bone.',
      'Add butter beans in the last 20 minutes. Remove Scotch bonnet. Serve over rice and peas.',
    ],
  },
  {
    title: 'Jamaican Beef Patties',
    description: 'Flaky, turmeric-yellow pastry filled with spiced ground beef. Sold from roadside stalls island-wide — best eaten hot.',
    servings: 4, prep_minutes: 45, cook_minutes: 30, difficulty: 'hard',
    category_slug: 'jamaican',
    ingredients: [
      { name: 'plain flour', amount: 350, unit: 'g' },
      { name: 'cold butter, cubed', amount: 150, unit: 'g' },
      { name: 'turmeric', amount: 1, unit: 'tsp' },
      { name: 'ice cold water', amount: 80, unit: 'ml' },
      { name: 'ground beef', amount: 400, unit: 'g' },
      { name: 'onion, minced', amount: 1, unit: null },
      { name: 'Scotch bonnet, minced', amount: 0.5, unit: null },
      { name: 'curry powder', amount: 1, unit: 'tsp' },
      { name: 'allspice', amount: 0.5, unit: 'tsp' },
      { name: 'fresh thyme', amount: 2, unit: 'sprigs' },
      { name: 'breadcrumbs', amount: 30, unit: 'g' },
    ],
    instructions: [
      'Make pastry: mix flour, turmeric, and salt. Rub in butter until crumbly. Add ice water and bring together into a dough. Wrap and refrigerate 30 minutes.',
      'Brown beef in a pan with onion, Scotch bonnet, curry powder, allspice, and thyme. Add a splash of water and breadcrumbs. Cook until dry. Cool completely.',
      'Roll pastry thin. Cut into 15cm circles. Place 2 tbsp filling on one half, fold over, and crimp edges with a fork.',
      'Brush with egg wash. Bake at 190°C for 25–30 minutes until golden.',
      'Cool 5 minutes before eating — the filling is molten hot inside.',
    ],
  },
]

// ── Mexican recipes ───────────────────────────────────────────────────────────

const MEXICAN: RecipeDef[] = [
  {
    title: 'Tacos al Pastor',
    description: 'Spit-roasted pork marinated in dried chilies and achiote, shaved into corn tortillas with pineapple and cilantro. Mexico City\'s greatest street food.',
    servings: 4, prep_minutes: 30, cook_minutes: 30, difficulty: 'medium',
    category_slug: 'mexican',
    ingredients: [
      { name: 'pork shoulder, sliced thin', amount: 800, unit: 'g' },
      { name: 'dried guajillo chilies, soaked', amount: 4, unit: null },
      { name: 'achiote paste', amount: 2, unit: 'tbsp' },
      { name: 'pineapple', amount: 200, unit: 'g' },
      { name: 'white onion, minced', amount: 1, unit: null },
      { name: 'garlic cloves', amount: 4, unit: null },
      { name: 'white vinegar', amount: 2, unit: 'tbsp' },
      { name: 'dried oregano', amount: 1, unit: 'tsp' },
      { name: 'cumin', amount: 0.5, unit: 'tsp' },
      { name: 'corn tortillas', amount: 12, unit: null },
      { name: 'fresh cilantro', amount: 20, unit: 'g' },
      { name: 'lime wedges', amount: 4, unit: null },
    ],
    instructions: [
      'Blend soaked guajillo chilies, achiote paste, garlic, vinegar, oregano, and cumin into a smooth marinade.',
      'Coat pork slices thoroughly and marinate at least 3 hours (overnight is best).',
      'Cook pork on a very hot griddle or cast-iron pan in batches, allowing it to char at the edges. Shave or chop into small pieces.',
      'In the same pan, briefly grill pineapple slices until caramelised. Dice finely.',
      'Warm tortillas directly over a flame. Fill each with pork, diced pineapple, raw onion, and cilantro. Finish with a squeeze of lime.',
    ],
  },
  {
    title: 'Mole Poblano',
    description: 'Mexico\'s most complex sauce — over 20 ingredients including dried chilies, chocolate, and spices, slow-cooked into a rich, dark blanket for chicken.',
    servings: 6, prep_minutes: 60, cook_minutes: 90, difficulty: 'hard',
    category_slug: 'mexican',
    ingredients: [
      { name: 'chicken pieces, bone-in', amount: 1400, unit: 'g' },
      { name: 'dried ancho chilies', amount: 4, unit: null },
      { name: 'dried mulato chilies', amount: 3, unit: null },
      { name: 'dried pasilla chilies', amount: 2, unit: null },
      { name: 'dark chocolate (70%), chopped', amount: 60, unit: 'g' },
      { name: 'tomatoes', amount: 3, unit: null },
      { name: 'tomatillos', amount: 3, unit: null },
      { name: 'sesame seeds, toasted', amount: 3, unit: 'tbsp' },
      { name: 'pumpkin seeds, toasted', amount: 3, unit: 'tbsp' },
      { name: 'raisins', amount: 2, unit: 'tbsp' },
      { name: 'garlic', amount: 4, unit: 'cloves' },
      { name: 'chicken stock', amount: 500, unit: 'ml' },
    ],
    instructions: [
      'Toast dried chilies briefly in a dry pan, then soak in hot water for 20 minutes. Discard stems and most seeds.',
      'Char tomatoes, tomatillos, and garlic directly over a flame or under a grill.',
      'Blend chilies, charred vegetables, sesame seeds, pumpkin seeds, and raisins with some stock until very smooth.',
      'Fry the mole paste in 2 tbsp oil in a deep pot, stirring constantly for 10 minutes as it darkens.',
      'Add remaining stock and chocolate. Simmer 30 minutes, stirring, until the sauce is thick, dark, and complex. Season, add browned chicken, and braise 30 more minutes. Serve with rice and warm tortillas.',
    ],
  },
  {
    title: 'Chiles Rellenos',
    description: 'Poblano peppers stuffed with cheese, battered in egg whites, and fried until golden and puffed. Served in a light tomato broth.',
    servings: 4, prep_minutes: 30, cook_minutes: 30, difficulty: 'hard',
    category_slug: 'mexican',
    ingredients: [
      { name: 'large poblano peppers', amount: 4, unit: null },
      { name: 'Oaxacan or mozzarella cheese, shredded', amount: 200, unit: 'g' },
      { name: 'eggs, separated', amount: 4, unit: null },
      { name: 'plain flour', amount: 60, unit: 'g' },
      { name: 'tomatoes, blended', amount: 4, unit: null },
      { name: 'garlic', amount: 2, unit: 'cloves' },
      { name: 'onion', amount: 0.5, unit: null },
      { name: 'chicken stock', amount: 300, unit: 'ml' },
      { name: 'oil for frying', amount: 400, unit: 'ml' },
    ],
    instructions: [
      'Char poblanos directly over a flame, turning until blistered all over. Place in a bag for 10 minutes, then peel off skin. Carefully cut a slit and remove seeds.',
      'Stuff each pepper with cheese. Seal the slit with a toothpick.',
      'Whip egg whites to stiff peaks. Fold in beaten yolks gently. Dust stuffed peppers with flour, then dip in egg batter.',
      'Fry in 180°C oil for 3–4 minutes until golden and puffed. Drain on paper towels.',
      'For the sauce: fry blended tomatoes, garlic, and onion in oil for 5 minutes. Add stock and simmer 10 minutes. Season. Serve peppers in the warm tomato broth.',
    ],
  },
  {
    title: 'Pozole Rojo',
    description: 'A pre-Columbian hominy soup with pork and a deep red chili broth. A celebration dish served with a table of garnishes.',
    servings: 6, prep_minutes: 30, cook_minutes: 120, difficulty: 'medium',
    category_slug: 'mexican',
    ingredients: [
      { name: 'pork shoulder, cubed', amount: 900, unit: 'g' },
      { name: 'canned hominy, drained', amount: 800, unit: 'g' },
      { name: 'dried ancho chilies', amount: 4, unit: null },
      { name: 'dried guajillo chilies', amount: 4, unit: null },
      { name: 'garlic', amount: 6, unit: 'cloves' },
      { name: 'onion', amount: 1, unit: null },
      { name: 'chicken or pork stock', amount: 1.5, unit: 'L' },
      { name: 'dried oregano', amount: 1, unit: 'tsp' },
      { name: 'shredded cabbage, radishes, lime, dried oregano', amount: 1, unit: 'serving' },
    ],
    instructions: [
      'Simmer pork in stock with garlic and onion for 1 hour until tender. Remove pork and shred. Reserve the broth.',
      'Toast dried chilies, then soak in hot water for 20 minutes. Blend with a cup of the pork broth until smooth. Strain.',
      'Fry the chili paste in oil for 5 minutes until darkened. Add to the pork broth.',
      'Add hominy and shredded pork. Simmer 30 minutes. Season with salt and oregano.',
      'Serve in large bowls with a spread of garnishes: shredded cabbage, sliced radishes, dried oregano, lime wedges, and tostadas.',
    ],
  },
  {
    title: 'Enchiladas Rojas',
    description: 'Corn tortillas filled with chicken, rolled and smothered in a smoky guajillo sauce, then baked with cheese. A weeknight Mexican staple.',
    servings: 4, prep_minutes: 25, cook_minutes: 35, difficulty: 'medium',
    category_slug: 'mexican',
    ingredients: [
      { name: 'corn tortillas', amount: 12, unit: null },
      { name: 'cooked chicken, shredded', amount: 400, unit: 'g' },
      { name: 'dried guajillo chilies', amount: 5, unit: null },
      { name: 'tomatoes', amount: 3, unit: null },
      { name: 'garlic', amount: 3, unit: 'cloves' },
      { name: 'chicken stock', amount: 300, unit: 'ml' },
      { name: 'crumbled cotija or feta cheese', amount: 100, unit: 'g' },
      { name: 'sour cream', amount: 120, unit: 'ml' },
      { name: 'white onion, sliced into rings', amount: 0.5, unit: null },
      { name: 'vegetable oil', amount: 3, unit: 'tbsp' },
    ],
    instructions: [
      'Toast guajillo chilies in a dry pan then soak in hot water 15 minutes. Blend with tomatoes, garlic, and stock into a smooth sauce. Strain.',
      'Fry the sauce in 2 tbsp oil for 5 minutes until it deepens in colour. Season with salt.',
      'Briefly fry each tortilla in hot oil (5 seconds per side) to soften and prevent cracking. Drain.',
      'Dip each tortilla in the warm sauce, fill with shredded chicken, roll, and place seam-side down in a baking dish.',
      'Pour remaining sauce over the top. Bake at 180°C for 15 minutes. Top with cotija, sour cream, and onion rings.',
    ],
  },
  {
    title: 'Guacamole',
    description: 'The real thing — ripe avocados mashed with lime, cilantro, jalapeño, and onion. No fillers, no cream cheese, just avocado.',
    servings: 4, prep_minutes: 10, cook_minutes: 0, difficulty: 'easy',
    category_slug: 'mexican',
    ingredients: [
      { name: 'ripe Hass avocados', amount: 3, unit: null },
      { name: 'lime juice', amount: 2, unit: 'tbsp' },
      { name: 'white onion, finely minced', amount: 0.25, unit: null },
      { name: 'jalapeño, seeded and minced', amount: 1, unit: null },
      { name: 'fresh cilantro, chopped', amount: 15, unit: 'g' },
      { name: 'salt', amount: 0.5, unit: 'tsp' },
      { name: 'tomato, seeded and diced', amount: 1, unit: null },
    ],
    instructions: [
      'Halve avocados and remove stones. Score the flesh in the skin, then scoop into a molcajete or bowl.',
      'Add salt and lime juice. Mash to your preferred texture — some like it chunky, some smooth.',
      'Fold in onion, jalapeño, cilantro, and tomato.',
      'Taste and adjust lime and salt. The balance between fat, acid, and heat is everything.',
      'Cover with cling film pressed directly onto the surface and serve immediately. Best eaten within an hour of making.',
    ],
  },
]

// ── Main ─────────────────────────────────────────────────────────────────────

async function seedDefaultNavItems(client: any) {
  const { rows } = await client.query('SELECT COUNT(*) FROM nav_items')
  if (parseInt(rows[0].count, 10) > 0) {
    console.log('\nNav items already exist — skipping default nav seed.')
    return
  }
  await client.query(`
    INSERT INTO nav_items (label, type, url, position, is_active) VALUES
      ('Home',    'custom', '/',        0, true),
      ('Recipes', 'custom', '/recipes', 1, true)
  `)
  console.log('\nSeeded default nav items: Home, Recipes.')
}

async function main() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await seedCategories(client)

    const userId = await getOrCreateAdminUser(client)
    console.log(`\nUsing user id: ${userId}`)

    const cuisines = [
      { name: 'Filipino', recipes: FILIPINO },
      { name: 'Chinese', recipes: CHINESE },
      { name: 'Japanese', recipes: JAPANESE },
      { name: 'Thai', recipes: THAI },
      { name: 'Indian', recipes: INDIAN },
      { name: 'Kenyan', recipes: KENYAN },
      { name: 'West African', recipes: WEST_AFRICAN },
      { name: 'Ethiopian', recipes: ETHIOPIAN },
      { name: 'French', recipes: FRENCH },
      { name: 'Italian', recipes: ITALIAN },
      { name: 'Jamaican', recipes: JAMAICAN },
      { name: 'Mexican', recipes: MEXICAN },
    ]

    for (const cuisine of cuisines) {
      if (cuisine.recipes.length === 0) continue
      console.log(`\nSeeding ${cuisine.name} recipes (${cuisine.recipes.length})...`)
      for (const recipe of cuisine.recipes) {
        await insertRecipe(client, userId, recipe)
      }
    }

    await seedDefaultNavItems(client)

    await client.query('COMMIT')
    console.log('\nSeed complete.')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Seed failed:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
