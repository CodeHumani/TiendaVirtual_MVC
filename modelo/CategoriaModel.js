const Model = require('../core/Model');

class CategoriaModel extends Model {
    constructor() {
        super('categoria');
    }

    validate(data) {
        const errors = [];
        if (!data.nombre || data.nombre.trim() === '') {
            errors.push('El nombre de la categoría es requerido');
        }
        if (data.nombre && data.nombre.trim().length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        }
        if (data.nombre && data.nombre.trim().length > 255) {
            errors.push('El nombre no puede tener más de 255 caracteres');
        }
        return errors;
    }

    async existsByName(nombre, excludeId = null) {
        try {
            let sql = 'SELECT id FROM categoria WHERE nombre = $1';
            let params = [nombre.trim()];

            if (excludeId) {
                sql += ' AND id != $2';
                params.push(excludeId);
            }

            const result = await this.query(sql, params);
            return result.length > 0;
        } catch (error) {
            console.error('Error verificando existencia de categoría:', error);
            throw error;
        }
    }

    async getAllWithProductCount() {
        try {
            const sql = `
                SELECT 
                    c.id,
                    c.nombre,
                    COUNT(p.id) as total_productos
                FROM categoria c
                LEFT JOIN producto p ON p.categoria_id = c.id
                GROUP BY c.id, c.nombre
                ORDER BY c.nombre ASC
            `;
            return await this.query(sql);
        } catch (error) {
            console.error('Error obteniendo categorías con conteo:', error);
            throw error;
        }
    }

    async canDelete(id) {
        try {
            const sql = 'SELECT COUNT(*) as count FROM producto WHERE categoria_id = $1';
            const result = await this.query(sql, [id]);
            return parseInt(result[0].count) === 0;
        } catch (error) {
            console.error('Error verificando si se puede eliminar categoría:', error);
            throw error;
        }
    }

    async deleteWithAssociations(id) {
        try {
            // Con FK RESTRICT en producto, si hay productos asociados, canDelete() lo impedirá
            await this.delete(id);
            console.log('✅ Categoría eliminada');
            return true;
        } catch (error) {
            console.error('❌ Error eliminando categoría con asociaciones:', error);
            throw error;
        }
    }

    async search(searchTerm) {
        try {
            const sql = `
                SELECT id, nombre 
                FROM categoria 
                WHERE nombre ILIKE $1 
                ORDER BY nombre ASC
            `;
            return await this.query(sql, [`%${searchTerm}%`]);
        } catch (error) {
            console.error('Error buscando categorías:', error);
            throw error;
        }
    }
}

module.exports = CategoriaModel;