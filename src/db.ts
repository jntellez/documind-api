import { sql } from "bun";
// Uses PostgreSQL if DATABASE_URL is not set or is a PostgreSQL URL
await sql`SELECT ...`;

import { SQL } from "bun";
const pg = new SQL("postgres://postgres:1234@localhost:5433/documinddb");
await pg`SELECT ...`;
