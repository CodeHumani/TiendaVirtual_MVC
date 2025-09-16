const database = require('../config/database');

class Model {
    constructor(tableName) {
        this.tableName = tableName;
        this.db = database;
    }

    async getAll() {
        try {
            const sql = `SELECT * FROM ${this.tableName}`;
            return await this.db.query(sql);
        } catch (error) {
            console.error(`Error en getAll de ${this.tableName}:`, error);
            throw error;
        }
    }

    async getById(id) {
        try {
            const sql = `SELECT * FROM ${this.tableName} WHERE id = $1`;
            const result = await this.db.query(sql, [id]);
            return result[0] || null;
        } catch (error) {
            console.error(`Error en getById de ${this.tableName}:`, error);
            throw error;
        }
    }

    async create(data) {
        try {
            const fields = Object.keys(data).join(', ');
            const placeholders = Object.keys(data).map((_, index) => `$${index + 1}`).join(', ');
            const values = Object.values(data);
            const sql = `INSERT INTO ${this.tableName} (${fields}) VALUES (${placeholders}) RETURNING id`;
            const result = await this.db.query(sql, values);
            return result[0].id;
        } catch (error) {
            console.error(`Error en create de ${this.tableName}:`, error);
            throw error;
        }
    }

    async update(id, data) {
        try {
            const fields = Object.keys(data).map((field, index) => `${field} = $${index + 1}`).join(', ');
            const values = [...Object.values(data), id];

            const sql = `UPDATE ${this.tableName} SET ${fields} WHERE id = $${values.length}`;
            const result = await this.db.query(sql, values);
            return result.length > 0;
        } catch (error) {
            console.error(`Error en update de ${this.tableName}:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            const sql = `DELETE FROM ${this.tableName} WHERE id = $1`;
            const result = await this.db.query(sql, [id]);
            return result.length >= 0;
        } catch (error) {
            console.error(`Error en delete de ${this.tableName}:`, error);
            throw error;
        }
    }

    async query(sql, params = []) {
        try {
            return await this.db.query(sql, params);
        } catch (error) {
            console.error(`Error en query personalizada de ${this.tableName}:`, error);
            throw error;
        }
    }
}

module.exports = Model;