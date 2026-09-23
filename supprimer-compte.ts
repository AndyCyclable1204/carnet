// Edge Function « supprimer-compte »
// Supprime l'utilisateur authentifié. Les données liées disparaissent avec lui
// grâce aux contraintes ON DELETE CASCADE du schéma.
//
// Déploiement : supabase functions deploy supprimer-compte

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const jeton = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!jeton) {
    return new Response(JSON.stringify({ erreur: 'Non authentifié.' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // On identifie l'utilisateur à partir de son propre jeton : personne ne peut
  // supprimer le compte d'un autre.
  const { data, error } = await admin.auth.getUser(jeton);
  if (error || !data.user) {
    return new Response(JSON.stringify({ erreur: 'Session invalide.' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const { error: erreurSuppression } = await admin.auth.admin.deleteUser(data.user.id);
  if (erreurSuppression) {
    return new Response(JSON.stringify({ erreur: erreurSuppression.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ supprime: true }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
