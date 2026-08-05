// The single shared database connection. Nothing outside src/db and
// src/repositories may import this — UI/domain go through the repository layer.
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const client = neon(process.env.DATABASE_URL!);

// Drizzle instance with the full schema attached, enabling typed queries.
export const db = drizzle(client, { schema });
export type Db = typeof db;
