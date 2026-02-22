//with URL connection string and SSL configuration for production environment
import pkg from "pg";
const { Pool } = pkg;

const db = new Pool({
  connectionString: process.env.DB_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

export default db;

/*import pkg from 'pg';
const { Pool } = pkg;

const db = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'elite-vault',
    password: 'jayanthK@2006',
    port: 5432,
});
*/
