# KeySystem

A small Cloudflare Worker + D1 key-management system.

## Deploy

1. Install Wrangler: `npm install -g wrangler`
2. Create a D1 database: `wrangler d1 create key-system-db`
3. Put the returned database ID in `wrangler.toml`.
4. Run the schema: `wrangler d1 execute key-system-db --remote --file=schema.sql`
5. Set a strong secret: `wrangler secret put ADMIN_TOKEN`
6. Configure static assets according to your Cloudflare Workers/Pages setup.
7. Deploy with `wrangler deploy`.

For production, keep `ADMIN_TOKEN` as a secret rather than committing it to source control.
