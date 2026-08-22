import { FEATURED_COMPANY_GROUPS, HOT_COMPANY_GROUPS } from '../src/data/hotCompanies';
import { mergeStandardCatalog, type StandardCompanyOverlay } from '../src/lib/standardCompanyCatalog';
import { STANDARD_CATALOG_OVERLAY_LIMIT } from '../src/lib/standardCompanyImport';

export const config = { runtime: 'edge' };

const OVERLAY_PAGE_SIZE = 1000;

async function loadOverlay(): Promise<StandardCompanyOverlay[]> {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const apiKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !apiKey) return [];

  const rows: StandardCompanyOverlay[] = [];
  for (let offset = 0; offset < STANDARD_CATALOG_OVERLAY_LIMIT; offset += OVERLAY_PAGE_SIZE) {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/standard_companies?select=company_key,company_name,source_update_date,company_type,industry,city,deadline_text,notice_url,apply_url,url,group_name&order=company_key&limit=${OVERLAY_PAGE_SIZE}&offset=${offset}`,
      { headers: { apikey: apiKey, authorization: `Bearer ${apiKey}` } },
    );
    if (!response.ok) return [];
    const page = await response.json() as StandardCompanyOverlay[];
    rows.push(...page);
    if (page.length < OVERLAY_PAGE_SIZE) break;
  }
  return rows.slice(0, STANDARD_CATALOG_OVERLAY_LIMIT);
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
