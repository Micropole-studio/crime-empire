-- Crime Empire : diagnostic des profils joueurs et du statut administrateur.
-- En lecture seule ; ne modifie aucune donnée, aucune politique RLS ni aucun trigger.
-- À exécuter UNIQUEMENT dans le SQL Editor de ton propre projet Supabase.
SELECT
  p.id AS player_id,
  p.username,
  p.email AS player_email,
  p.is_admin,
  p.auth_user_id,
  u.email AS linked_auth_email,
  CASE
    WHEN p.auth_user_id IS NULL THEN 'Aucun compte Auth lié'
    WHEN u.id IS NULL THEN 'Identifiant Auth non trouvé'
    WHEN lower(coalesce(p.email, '')) <> lower(coalesce(u.email, ''))
      THEN 'Attention : e-mails différents'
    ELSE 'Compte Auth lié'
  END AS liaison_auth
FROM public.players p
LEFT JOIN auth.users u ON u.id = p.auth_user_id
ORDER BY p.is_admin DESC, p.username NULLS LAST;
