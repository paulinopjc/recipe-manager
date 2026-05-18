// Correlated-subquery SELECT used wherever a full Recipe object is needed.
// Avoids cartesian product from dual JOIN and ensures sections/ingredients/instructions
// are always populated as arrays (never undefined).
export const RECIPE_SELECT = `
  SELECT r.*,
    (
      SELECT COALESCE(json_agg(i ORDER BY i.position), '[]')
      FROM ingredients i WHERE i.recipe_id = r.id AND i.section_id IS NULL
    ) AS ingredients,
    (
      SELECT COALESCE(json_agg(inst ORDER BY inst.position), '[]')
      FROM instructions inst WHERE inst.recipe_id = r.id AND inst.section_id IS NULL
    ) AS instructions,
    (
      SELECT COALESCE(
        json_agg(
          json_build_object(
            'id', s.id,
            'name', s.name,
            'position', s.position,
            'ingredients', (
              SELECT COALESCE(json_agg(si ORDER BY si.position), '[]')
              FROM ingredients si WHERE si.section_id = s.id
            ),
            'instructions', (
              SELECT COALESCE(json_agg(sinst ORDER BY sinst.position), '[]')
              FROM instructions sinst WHERE sinst.section_id = s.id
            )
          ) ORDER BY s.position
        ), '[]'
      )
      FROM recipe_sections s WHERE s.recipe_id = r.id
    ) AS sections,
    (
      SELECT COALESCE(json_agg(json_build_object('id',c.id,'name',c.name,'slug',c.slug)), '[]')
      FROM recipe_categories rc JOIN categories c ON c.id = rc.category_id
      WHERE rc.recipe_id = r.id
    ) AS categories
  FROM recipes r`
