export const RECIPE_SORTABLE_COLUMNS = {
  title:       'recipes.title',
  created_at:  'recipes.created_at',
  ingredients: '(SELECT COUNT(*) FROM ingredients WHERE recipe_id = recipes.id)',
} as const
