-- CRIME EMPIRE : vérification en LECTURE SEULE des fonctions de synchronisation.
-- Cette requête ne modifie aucune donnée, aucun compte, aucune politique RLS.

SELECT
  to_regprocedure('public.get_city_building_placements(text)') IS NOT NULL AS rpc_lecture_existe,
  to_regprocedure('public.save_city_building_placements(text,jsonb)') IS NOT NULL AS rpc_ecriture_existe,
  to_regprocedure('jsonb_object_length(jsonb)') IS NOT NULL AS jsonb_object_length_existe;

SELECT
  p.proname AS fonction,
  pg_get_functiondef(p.oid) ILIKE '%jsonb_object_length%' AS utilise_jsonb_object_length,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_city_building_placements','save_city_building_placements')
ORDER BY p.proname;
