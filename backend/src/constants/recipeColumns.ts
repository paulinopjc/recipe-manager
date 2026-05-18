export const RECIPE_SORTABLE_COLUMNS = {
  title:       'recipes.title',
  created_at:  'recipes.created_at',
  view_count:  'recipes.view_count',
  ingredients: '(SELECT COUNT(*) FROM ingredients WHERE recipe_id = recipes.id)',
} as const
