import { ALL_HOT_COMPANIES } from '../src/data/hotCompanies';

export const config = { runtime: 'edge' };

export default function handler() {
  const companies = ALL_HOT_COMPANIES;

  return new Response(JSON.stringify({ companies, count: companies.length }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
