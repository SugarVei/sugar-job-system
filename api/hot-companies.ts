import { FEATURED_COMPANY_GROUPS, HOT_COMPANY_GROUPS } from '../src/data/hotCompanies';
import { mergeStandardCatalog, type StandardCompanyOverlay } from '../src/lib/standardCompanyCatalog';
import { STANDARD_CATALOG_OVERLAY_LIMIT } from '../src/lib/standardCompanyImport';

export const config = { runtime: 'edge' };

async function loadOverlay(): Promise<StandardCompanyOverlay[]> {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const apiKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !apiKey) return [];

  const response = await fetch(
    `${supabaseUrl}/rest/v1/standard_companies?select=company_key,company_name,industry,city,url,group_name&limit=${STANDARD_CATALOG_OVERLAY_LIMIT}`,
    { headers: { apikey: apiKey, authorization: `Bearer ${apiKey}` } },
  );
  if (!response.ok) return [];
  return await response.json() as StandardCompanyOverlay[];
}

export default async function handler() {
  const overlay = await loadOverlay();
  const { companies } = mergeStandardCatalog([...FEATURED_COMPANY_GROUPS, ...HOT_COMPANY_GROUPS], overlay);

  return new Response(JSON.stringify({ companies, count: companies.length }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=600',
    },
  });
}
