import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('node_modules/.catalog-sync', { recursive: true });
await build({
  stdin: { contents: "import { handleCatalogSync } from './server/_lib/standard-catalog-sync.ts'; Deno.serve(request => handleCatalogSync(request, {supabaseUrl:Deno.env.get('SUPABASE_URL') || '',serviceRoleKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''}));", resolveDir: process.cwd(), sourcefile: 'catalog-sync-entry.ts', loader: 'ts' },
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true,
  outfile: 'node_modules/.catalog-sync/index.js',
});
console.log('Built standalone Supabase catalogue sync function.');
