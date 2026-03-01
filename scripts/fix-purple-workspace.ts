import { neon } from "@neondatabase/serverless";

const DATABASE_URL =
  "postgresql://neondb_owner:npg_FAWf0XDQ2HIy@ep-raspy-boat-a410uvnx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const sql = neon(DATABASE_URL);

async function main() {
  const result = await sql`
    UPDATE workspaces
    SET primary_color = '#000000', secondary_color = '#374151', accent_color = NULL
    WHERE primary_color = '#7c3aed'
    RETURNING id, name, primary_color
  `;
  console.log(`Updated ${result.length} workspace(s):`);
  for (const row of result) {
    console.log(`  - ${row.name} (${row.id}): primary_color now ${row.primary_color}`);
  }
}

main().catch(console.error);
