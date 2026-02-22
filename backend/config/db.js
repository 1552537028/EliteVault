import pkg from 'pg';
const { Pool } = pkg;

const db = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'elite-vault',
    password: 'jayanthK@2006',
    port: 5432,
});

export default db;