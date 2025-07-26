import { drizzle } from "drizzle-orm/libsql";
import { config } from 'dotenv';
config();  // Cargar variables de entorno

import * as schema from "./schema";
import { createClient } from "@libsql/client";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(turso, { schema });
export type DBType = typeof db;
export { schema };
