const { Pool } = require('pg');
require('dotenv').config();

class Database {
    constructor() {
        this.pool = null;
    }

    async connect() {
        try {
            this.pool = new Pool({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                port: process.env.DB_PORT,
                ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
            });
            const client = await this.pool.connect();
            client.release();
            console.log('✅ Conexión a PostgreSQL establecida');
            return this.pool;
        } catch (error) {
            console.error('❌ Error conectando a PostgreSQL:', error.message);
            console.log('⚠️ Continuando sin base de datos para pruebas...');
            // No lanzar error para permitir que el servidor funcione sin BD
            return null;
        }
    }

    async query(sql, params = []) {
        try {
            if (!this.pool) {
                await this.connect();
            }
            const result = await this.pool.query(sql, params);
            return result.rows;
        } catch (error) {
            console.error('❌ Error en query:', error);
            throw error;
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 Conexión a PostgreSQL cerrada');
        }
    }
}

const database = new Database();

module.exports = database;