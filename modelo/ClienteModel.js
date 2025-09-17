const Model = require('../core/Model');

class ClienteModel extends Model {
    constructor() {
        super('cliente');
    }

    validate(data) {
        const errors = [];
        if (!data.nombre || data.nombre.trim() === '') {
            errors.push('El nombre del cliente es requerido');
        }
        if (data.nombre && data.nombre.trim().length < 2) {
            errors.push('El nombre debe tener al menos 2 caracteres');
        }
        if (data.nombre && data.nombre.trim().length > 255) {
            errors.push('El nombre no puede tener más de 255 caracteres');
        }
        if (!data.celular || data.celular.trim() === '') {
            errors.push('El número de celular es requerido para envío de catálogo por WhatsApp');
        }
        if (data.celular && !this.isValidPhoneNumber(data.celular.trim())) {
            errors.push('El número de celular debe tener entre 10 y 19 caracteres numéricos');
        }
        if (data.correo && data.correo.trim() !== '' && !this.isValidEmail(data.correo.trim())) {
            errors.push('El formato del correo electrónico no es válido');
        }

        return errors;
    }

    isValidPhoneNumber(phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        return cleanPhone.length >= 10 && cleanPhone.length <= 19;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async existsByPhone(celular, excludeId = null) {
        try {
            let sql = 'SELECT id FROM cliente WHERE celular = $1';
            let params = [celular.trim()];
            if (excludeId) {
                sql += ' AND id != $2';
                params.push(excludeId);
            }
            const result = await this.query(sql, params);
            return result.length > 0;
        } catch (error) {
            console.error('Error verificando existencia de cliente por celular:', error);
            throw error;
        }
    }

    async existsByEmail(correo, excludeId = null) {
        try {
            if (!correo || correo.trim() === '') {
                return false;
            }
            let sql = 'SELECT id FROM cliente WHERE correo = $1';
            let params = [correo.trim()];
            if (excludeId) {
                sql += ' AND id != $2';
                params.push(excludeId);
            }
            const result = await this.query(sql, params);
            return result.length > 0;
        } catch (error) {
            console.error('Error verificando existencia de cliente por correo:', error);
            throw error;
        }
    }

    async getAllWithStats() {
        try {
            const sql = `
                SELECT 
                    c.id,
                    c.nombre,
                    c.celular,
                    c.correo,
                    COUNT(v.id) as total_compras,
                    COALESCE(SUM(v.total_a_pagar), 0) as total_gastado,
                    MAX(v.fecha) as ultima_compra
                FROM cliente c
                LEFT JOIN venta v ON c.id = v.cliente_id
                GROUP BY c.id, c.nombre, c.celular, c.correo
                ORDER BY c.nombre ASC
            `;
            return await this.query(sql);
        } catch (error) {
            console.error('Error obteniendo clientes con estadísticas:', error);
            throw error;
        }
    }

    async getComprasById(clienteId) {
        try {
            const sql = `
                SELECT 
                    v.*,
                    COUNT(dv.producto_id) as total_productos
                FROM venta v
                LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
                WHERE v.cliente_id = $1
                GROUP BY v.id
                ORDER BY v.fecha DESC, v.id DESC
            `;
            return await this.query(sql, [clienteId]);
        } catch (error) {
            console.error('Error obteniendo compras del cliente:', error);
            throw error;
        }
    }

    async search(searchTerm) {
        try {
            const sql = `
                SELECT 
                    c.*,
                    COUNT(v.id) as total_compras,
                    COALESCE(SUM(v.total_a_pagar), 0) as total_gastado,
                    MAX(v.fecha) as ultima_compra
                FROM cliente c
                LEFT JOIN venta v ON c.id = v.cliente_id
                WHERE c.nombre ILIKE $1 OR c.celular ILIKE $1 OR c.correo ILIKE $1
                GROUP BY c.id
                ORDER BY c.nombre ASC
            `;
            const searchPattern = `%${searchTerm}%`;
            return await this.query(sql, [searchPattern]);
        } catch (error) {
            console.error('Error buscando clientes:', error);
            throw error;
        }
    }

    async canDelete(id) {
        try {
            const sql = 'SELECT COUNT(*) as count FROM venta WHERE cliente_id = $1';
            const result = await this.query(sql, [id]);
            return parseInt(result[0].count) === 0;
        } catch (error) {
            console.error('Error verificando si se puede eliminar cliente:', error);
            throw error;
        }
    }

    formatPhoneForWhatsApp(celular) {
        if (!celular) {
            console.log('❌ Número de celular vacío');
            return null;
        }

        const cleanPhone = celular.replace(/\D/g, '');
        
        console.log('📞 Formateando número para WhatsApp:', {
            original: celular,
            limpio: cleanPhone,
            longitud: cleanPhone.length
        });
        
        // Validar que el número tenga una longitud razonable
        if (cleanPhone.length < 8 || cleanPhone.length > 15) {
            console.log('❌ Longitud de número inválida:', cleanPhone.length);
            return null;
        }
        
        // Si ya incluye código de país conocido, devolverlo tal como está
        const knownCountryCodes = ['502', '591', '593', '51', '57', '58', '56', '54'];
        for (const code of knownCountryCodes) {
            if (cleanPhone.startsWith(code)) {
                console.log(`✅ Número con código ${code} detectado`);
                return cleanPhone;
            }
        }
        
        // Si es un número guatemalteco de 8 dígitos que empieza con 3, 4, 5, 7 o 9
        if (cleanPhone.length === 8 && /^[34579]/.test(cleanPhone)) {
            console.log('✅ Número guatemalteco detectado, agregando código 502');
            return `502${cleanPhone}`;
        }
        
        // Para números de EE.UU./Canadá (10-11 dígitos empezando con 1)
        if (cleanPhone.length === 10 && /^[2-9]/.test(cleanPhone)) {
            console.log('✅ Número norteamericano de 10 dígitos, agregando código 1');
            return `1${cleanPhone}`;
        }
        
        if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
            console.log('✅ Número norteamericano con código 1 detectado');
            return cleanPhone;
        }
        
        // Para otros formatos internacionales de 10-15 dígitos
        if (cleanPhone.length >= 10 && cleanPhone.length <= 15) {
            console.log('✅ Número internacional válido, usando tal como está');
            return cleanPhone;
        }
        
        console.log('⚠️ Formato de número no reconocido');
        return cleanPhone; // Devolver limpio en caso de duda
    }

    // Método para validar número de WhatsApp
    isValidWhatsAppNumber(celular) {
        const formattedPhone = this.formatPhoneForWhatsApp(celular);
        return formattedPhone !== null && formattedPhone.length >= 10 && formattedPhone.length <= 15;
    }
}

module.exports = ClienteModel;