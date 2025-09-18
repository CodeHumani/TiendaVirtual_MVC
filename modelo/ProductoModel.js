const Model = require('../core/Model');

class ProductoModel extends Model {
    constructor() {
        super('producto');
    }

    validar(datos) {
        const errores = [];
        if (!datos.nombre || datos.nombre.trim() === '') {
            errores.push('El nombre del producto es obligatorio');
        } else if (datos.nombre.trim().length < 2) {
            errores.push('El nombre debe tener al menos 2 caracteres');
        } else if (datos.nombre.trim().length > 100) {
            errores.push('El nombre no puede exceder 100 caracteres');
        }
        if (!datos.descripcion || datos.descripcion.trim() === '') {
            errores.push('La descripción del producto es obligatoria');
        } else if (datos.descripcion.trim().length < 5) {
            errores.push('La descripción debe tener al menos 5 caracteres');
        } else if (datos.descripcion.trim().length > 500) {
            errores.push('La descripción no puede exceder 500 caracteres');
        }
        if (!datos.precio) {
            errores.push('El precio es obligatorio');
        } else {
            const precio = parseFloat(datos.precio);
            if (isNaN(precio) || precio <= 0) {
                errores.push('El precio debe ser un número mayor a 0');
            } else if (precio > 999999.99) {
                errores.push('El precio no puede exceder 999,999.99');
            }
        }
        if (datos.cantidad === null || datos.cantidad === undefined || datos.cantidad === '') {
            errores.push('El stock es obligatorio');
        } else {
            const stock = parseInt(datos.cantidad);
            if (isNaN(stock) || stock < 0) {
                errores.push('El stock debe ser un número mayor o igual a 0');
            } else if (stock > 999999) {
                errores.push('El stock no puede exceder 999,999 unidades');
            }
        }
        return errores;
    }

    async obtenerPorIdConCategoria(id) {
        try {
            const sql = `
                SELECT 
                    p.*,
                    c.id as categoria_id,
                    c.nombre as categoria_nombre
                FROM producto p
                LEFT JOIN categoria c ON p.categoria_id = c.id
                WHERE p.id = $1
            `;
            const result = await this.query(sql, [id]);
            return result[0] || null;
        } catch (error) {
            console.error('Error al obtener producto por ID con categoría:', error);
            throw error;
        }
    }

    async obtenerTodosConCategoria() {
        try {
            const query = `
                SELECT 
                    p.*,
                    c.nombre as categoria_nombre,
                    c.id as categoria_id
                FROM producto p
                LEFT JOIN categoria c ON p.categoria_id = c.id
                ORDER BY p.id DESC
            `;
            const result = await this.db.query(query);
            return result;
        } catch (error) {
            console.error('Error al obtener productos con categoría:', error);
            throw new Error('Error al obtener los productos');
        }
    }

    async buscar(termino) {
        try {
            const query = `
                SELECT DISTINCT
                    p.*,
                    c.nombre as categoria_nombre,
                    c.id as categoria_id
                FROM producto p
                LEFT JOIN categoria c ON p.categoria_id = c.id
                WHERE 
                    LOWER(p.nombre) LIKE LOWER($1) OR 
                    LOWER(p.descripcion) LIKE LOWER($1) OR
                    LOWER(c.nombre) LIKE LOWER($1)
                ORDER BY p.nombre ASC
            `;
            const result = await this.db.query(query, [`%${termino}%`]);
            return result;
        } catch (error) {
            console.error('Error al buscar productos:', error);
            throw new Error('Error al buscar productos');
        }
    }

    async obtenerPorCategoria(categoriaId) {
        try {
            const query = `
                SELECT 
                    p.*,
                    c.nombre as categoria_nombre,
                    c.id as categoria_id
                FROM producto p
                INNER JOIN categoria c ON p.categoria_id = c.id
                WHERE p.categoria_id = $1
                ORDER BY p.nombre ASC
            `;
            const result = await this.db.query(query, [categoriaId]);
            return result;
        } catch (error) {
            console.error('Error al obtener productos por categoría:', error);
            throw new Error('Error al obtener productos de la categoría');
        }
    }

    async crearConCategoria(datosProducto, categoriaId) {
        try {
            const datosValidacion = {
                ...datosProducto,
                cantidad: datosProducto.stock || datosProducto.cantidad
            };
            const errores = this.validar(datosValidacion);
            if (errores.length > 0) {
                throw new Error(errores.join(', '));
            }
            const datosLimpios = {
                nombre: datosProducto.nombre.trim(),
                descripcion: datosProducto.descripcion.trim(),
                precio: parseFloat(datosProducto.precio),
                cantidad: parseInt(datosProducto.stock || datosProducto.cantidad),
                imagen: datosProducto.imagen || null,
                categoria_id: parseInt(categoriaId)
            };
            const productoId = await this.create(datosLimpios);
            return productoId;
        } catch (error) {
            console.error('Error al crear producto con categoría:', error);
            throw error;
        }
    }

    async actualizarConCategoria(id, datosProducto, categoriaId) {
        try {
            const datosValidacion = {
                ...datosProducto,
                cantidad: datosProducto.stock || datosProducto.cantidad
            };
            const errores = this.validar(datosValidacion);
            if (errores.length > 0) {
                console.error('❌ Errores de validación:', errores);
                throw new Error(errores.join(', '));
            }
            const datosLimpios = {
                nombre: datosProducto.nombre.trim(),
                descripcion: datosProducto.descripcion.trim(),
                precio: parseFloat(datosProducto.precio),
                cantidad: parseInt(datosProducto.stock || datosProducto.cantidad),
                categoria_id: parseInt(categoriaId)
            };
            if (datosProducto.imagen !== undefined) {
                datosLimpios.imagen = datosProducto.imagen;
            }
            const actualizado = await this.update(id, datosLimpios);
            return actualizado;
        } catch (error) {
            console.error('❌ Error en ProductoModel.actualizarConCategoria:', error);
            console.error('❌ Stack:', error.stack);
            throw error;
        }
    }

    async eliminarConCategorias(id) {
        try {
            return await this.delete(id);
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            throw error;
        }
    }

    async obtenerConFiltros(filtros = {}, ordenar = 'nombre_asc') {
        try {
            let whereClauses = [];
            let params = [];
            let paramIndex = 1;
            if (filtros.categoria_id) {
                whereClauses.push(`p.categoria_id = $${paramIndex}`);
                params.push(parseInt(filtros.categoria_id));
                paramIndex++;
            }
            if (filtros.buscar) {
                whereClauses.push(`(
                    LOWER(p.nombre) LIKE LOWER($${paramIndex}) OR 
                    LOWER(p.descripcion) LIKE LOWER($${paramIndex}) OR
                    LOWER(c.nombre) LIKE LOWER($${paramIndex})
                )`);
                params.push(`%${filtros.buscar}%`);
                paramIndex++;
            }
            const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
            let orderBy;
            switch (ordenar) {
                case 'precio_asc':
                    orderBy = 'p.precio ASC';
                    break;
                case 'precio_desc':
                    orderBy = 'p.precio DESC';
                    break;
                case 'stock_asc':
                    orderBy = 'p.cantidad ASC';
                    break;
                case 'stock_desc':
                    orderBy = 'p.cantidad DESC';
                    break;
                case 'nombre_desc':
                    orderBy = 'p.nombre DESC';
                    break;
                default:
                    orderBy = 'p.nombre ASC';
            }
            const query = `
                SELECT DISTINCT
                    p.*,
                    p.cantidad as stock,
                    c.nombre as categoria_nombre,
                    c.id as categoria_id
                FROM producto p
                LEFT JOIN categoria c ON p.categoria_id = c.id
                ${whereClause}
                ORDER BY ${orderBy}
            `;
            const result = await this.db.query(query, params);
            return result;
        } catch (error) {
            console.error('Error al obtener productos con filtros:', error);
            throw new Error('Error al obtener productos filtrados');
        }
    }
}

module.exports = ProductoModel;