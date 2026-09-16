// Apply every migration in supabase/migrations to the STAGING database.
//
// `npm run db:push` targets production (the linked project). This targets the
// staging project through its connection string, so the link never changes and
// nobody pushes to the wrong database by forgetting to switch back.
//
// Reads the password and ref from .env.staging.local, which is gitignored.

import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.staging.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.includes('=') && !line.startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()])
)

const ref = env.STAGING_PROJECT_REF
const password = env.STAGING_DB_PASSWORD
if (!ref || !password) {
  console.error('Missing STAGING_PROJECT_REF or STAGING_DB_PASSWORD in .env.staging.local')
  process.exit(1)
}

const host = env.STAGING_POOLER_HOST || 'aws-0-eu-north-1.pooler.supabase.com'
const dbUrl = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${host}:5432/postgres`

// Output is captured and the password masked before printing: the CLI echoes
// the connection string in some errors, and it must never land in a terminal log.
const result = spawnSync('npx', ['supabase', 'db', 'push', '--db-url', `"${dbUrl}"`, ...process.argv.slice(2)], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
})
const mask = (text) => (text ?? '').split(password).join('***').split(encodeURIComponent(password)).join('***')
process.stdout.write(mask(result.stdout))
process.stderr.write(mask(result.stderr))
process.exit(result.status ?? 1)
