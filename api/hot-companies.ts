import { HOT_COMPANY_GROUPS } from '../src/data/hotCompanies';

export const config = { runtime: 'edge' };

export default function handler() {
  const companies = HOT_COMPANY_GROUPS.flatMap((group) =>
    group.companies.map((company) => ({
      ...company,
      group: group.name,
    })),
  );

  return new Response(JSON.stringify({ companies, count: companies.length }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
