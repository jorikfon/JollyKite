import pg from 'pg';

const { Pool } = pg;

/**
 * PostgresPool - shared PostgreSQL connection pool
 * Config from env: DATABASE_URL or PG_HOST/PG_PORT/PG_DATABASE/PG_USER/PG_PASSWORD
 */
class PostgresPool {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    const config = process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.PG_HOST || 'localhost',
          port: parseInt(process.env.PG_PORT) || 5432,
          database: process.env.PG_DATABASE || 'jollykite',
          user: process.env.PG_USER || 'jollykite',
          password: process.env.PG_PASSWORD || 'jollykite',
        };

    this.pool = new Pool({
      ...config,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Verify connection
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('✓ PostgreSQL connection established');
    } finally {
      client.release();
    }
  }

  async query(text, params) {
    return this.pool.query(text, params);
  }

  async getClient() {
    return this.pool.connect();
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('✓ PostgreSQL pool closed');
    }
  }
}

// Singleton
const pgPool = new PostgresPool();
export default pgPool;
