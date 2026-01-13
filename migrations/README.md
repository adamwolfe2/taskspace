# Database Migrations

This directory contains database migrations managed by [node-pg-migrate](https://github.com/salsita/node-pg-migrate).

## Quick Start

### Creating a New Migration

```bash
npm run migrate:create -- my-migration-name
```

This creates a new timestamped migration file in the `migrations/` directory.

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Rollback the last migration
npm run migrate:down
```

### Environment Setup

Migrations use the `DATABASE_URL` environment variable. For local development:

```bash
# .env.local
DATABASE_URL=postgresql://user:password@localhost:5432/aimseod
```

For production (Vercel):
- Migrations should be run manually before deployments
- Use the Vercel CLI or a deployment hook

## Migration File Format

node-pg-migrate supports both SQL and JavaScript migrations. We prefer SQL for clarity:

```sql
-- migrations/1234567890_add-feature.sql

-- Up migration
CREATE TABLE new_feature (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- @down
DROP TABLE new_feature;
```

Or use JavaScript for complex logic:

```javascript
// migrations/1234567890_add-feature.js
exports.up = async (pgm) => {
  pgm.createTable('new_feature', {
    id: { type: 'varchar(255)', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true }
  });
};

exports.down = async (pgm) => {
  pgm.dropTable('new_feature');
};
```

## Best Practices

1. **Never edit existing migrations** - Create a new migration to modify schema
2. **Make migrations idempotent** - Use `IF NOT EXISTS` / `IF EXISTS` where possible
3. **Test migrations locally first** - Run against a local database before production
4. **Keep migrations small** - One logical change per migration
5. **Include both up and down** - Always provide rollback capability
6. **Document complex changes** - Add comments explaining non-obvious changes

## Production Deployment

### Option 1: Manual (Recommended for now)

```bash
# Before deploying new code
DATABASE_URL=<production-url> npm run migrate
```

### Option 2: CI/CD Pipeline

Add to your deployment workflow:

```yaml
# .github/workflows/deploy.yml
- name: Run migrations
  run: npm run migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Option 3: Vercel Build Hook

Migrations can be triggered in `vercel.json`:

```json
{
  "buildCommand": "npm run migrate && next build"
}
```

**Note:** Be cautious with automatic migrations in production. Manual verification is safer.

## Migration History

| Timestamp | Name | Description |
|-----------|------|-------------|
| 1736779200000 | initial-schema | Complete initial database schema |

## Troubleshooting

### "relation does not exist" errors

Run migrations first:
```bash
npm run migrate
```

### Migration stuck or failed

Check the `pgmigrations` table:
```sql
SELECT * FROM pgmigrations ORDER BY run_on DESC;
```

### Rolling back a failed migration

```bash
npm run migrate:down
# Fix the issue
npm run migrate
```

## Security Notes

- Migration scripts are NOT exposed via API endpoints
- Production migrations require direct database access
- The old `/api/db/migrate` endpoint has been deprecated
- All migration activity is logged to the audit_logs table
