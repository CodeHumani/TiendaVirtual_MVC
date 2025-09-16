const Model = require('../core/Model');

class VentaModel extends Model {
    constructor() {
        super('venta');
    }

    validar(datos) {
        const errores = [];
        if (!datos.cliente_id || datos.cliente_id <= 0) {
            errores.push('Debe seleccionar un cliente válido');
        }
        if (!datos.total_a_pagar || parseFloat(datos.total_a_pagar) <= 0) {
            errores.push('El total a pagar debe ser mayor a 0');
        }
        if (!datos.total_pagado || parseFloat(datos.total_pagado) < 0) {
            errores.push('El total pagado no puede ser negativo');
        }
        const totalAPagar = parseFloat(datos.total_a_pagar);
        const totalPagado = parseFloat(datos.total_pagado);
        if (totalPagado < totalAPagar) {
            errores.push('El monto pagado no puede ser menor al total a pagar');
        }
        if (!datos.detalles || !Array.isArray(datos.detalles) || datos.detalles.length === 0) {
            errores.push('Debe agregar al menos un producto a la venta');
        }
        if (datos.detalles && Array.isArray(datos.detalles)) {
            datos.detalles.forEach((detalle, index) => {
                if (!detalle.producto_id || detalle.producto_id <= 0) {
                    errores.push(`Producto ${index + 1}: ID de producto inválido`);
                }
                if (!detalle.cantidad || detalle.cantidad <= 0) {
                    errores.push(`Producto ${index + 1}: La cantidad debe ser mayor a 0`);
                }
                if (!detalle.subtotal || parseFloat(detalle.subtotal) <= 0) {
                    errores.push(`Producto ${index + 1}: El subtotal debe ser mayor a 0`);
                }
            });
        }
        return errores;
    }

    async obtenerTodosConDetalles() {
        try {
            const sql = `
                SELECT 
                    v.*,
                    c.nombre as cliente_nombre,
                    c.celular as cliente_celular,
                    c.correo as cliente_correo,
                    COUNT(dv.producto_id) as total_productos
                FROM venta v
                LEFT JOIN cliente c ON v.cliente_id = c.id
                LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
                GROUP BY v.id, c.nombre, c.celular, c.correo
                ORDER BY v.fecha DESC, v.id DESC
            `;
            return await this.query(sql);
        } catch (error) {
            console.error('Error al obtener ventas con detalles:', error);
            throw error;
        }
    }

    async obtenerPorIdConDetalles(id) {
        try {
            const sqlVenta = `
                SELECT 
                    v.*,
                    c.nombre as cliente_nombre,
                    c.celular as cliente_celular,
                    c.correo as cliente_correo,
                    (v.total_pagado - v.total_a_pagar) as cambio
                FROM venta v
                LEFT JOIN cliente c ON v.cliente_id = c.id
                WHERE v.id = $1
            `;
            const sqlDetalles = `
                SELECT 
                    dv.*,
                    p.nombre as producto_nombre,
                    p.precio as producto_precio,
                    p.descripcion as producto_descripcion,
                    p.imagen as producto_imagen
                FROM detalle_venta dv
                INNER JOIN producto p ON dv.producto_id = p.id
                WHERE dv.venta_id = $1
                ORDER BY p.nombre
            `;
            const [ventaResult, detallesResult] = await Promise.all([
                this.query(sqlVenta, [id]),
                this.query(sqlDetalles, [id])
            ]);
            if (ventaResult.length === 0) {
                return null;
            }
            const venta = ventaResult[0];
            venta.detalles = detallesResult || [];
            // Asegurar que el cambio sea un número válido
            venta.cambio = parseFloat(venta.cambio) || 0;
            return venta;
        } catch (error) {
            console.error('Error al obtener venta por ID con detalles:', error);
            throw error;
        }
    }

    async crearConDetalles(datosVenta, detalles) {
        try {
            const datosCompletos = { ...datosVenta, detalles };
            const errores = this.validar(datosCompletos);
            if (errores.length > 0) {
                throw new Error(errores.join(', '));
            }
            const datosLimpios = {
                cliente_id: parseInt(datosVenta.cliente_id),
                fecha: datosVenta.fecha || new Date().toISOString().split('T')[0],
                cantidad: parseInt(datosVenta.cantidad) || detalles.length,
                total_a_pagar: parseFloat(datosVenta.total_a_pagar),
                total_pagado: parseFloat(datosVenta.total_pagado),
                cambio: parseFloat(datosVenta.total_pagado) - parseFloat(datosVenta.total_a_pagar),
                estado_pago: parseFloat(datosVenta.total_pagado) >= parseFloat(datosVenta.total_a_pagar) ? 'pagado' : 'pendiente'
            };
            const ventaId = await this.create(datosLimpios);
            for (const detalle of detalles) {
                const detalleData = {
                    producto_id: parseInt(detalle.producto_id),
                    venta_id: ventaId,
                    cantidad: parseInt(detalle.cantidad),
                    subtotal: parseFloat(detalle.subtotal)
                };
                await this.db.query(
                    'INSERT INTO detalle_venta (producto_id, venta_id, cantidad, subtotal) VALUES ($1, $2, $3, $4)',
                    [detalleData.producto_id, detalleData.venta_id, detalleData.cantidad, detalleData.subtotal]
                );
                await this.db.query(
                    'UPDATE producto SET cantidad = cantidad - $1 WHERE id = $2',
                    [detalleData.cantidad, detalleData.producto_id]
                );
            }
            return ventaId;
        } catch (error) {
            console.error('Error al crear venta con detalles:', error);
            throw error;
        }
    }

    async actualizarConDetalles(id, datosVenta, detalles) {
        try {
            const datosCompletos = { ...datosVenta, detalles };
            const errores = this.validar(datosCompletos);
            if (errores.length > 0) {
                throw new Error(errores.join(', '));
            }
            const ventaActual = await this.obtenerPorIdConDetalles(id);
            if (!ventaActual) {
                throw new Error('La venta no existe');
            }
            for (const detalleActual of ventaActual.detalles) {
                await this.db.query(
                    'UPDATE producto SET cantidad = cantidad + $1 WHERE id = $2',
                    [detalleActual.cantidad, detalleActual.producto_id]
                );
            }
            const datosLimpios = {
                cliente_id: parseInt(datosVenta.cliente_id),
                fecha: datosVenta.fecha,
                cantidad: parseInt(datosVenta.cantidad) || detalles.length,
                total_a_pagar: parseFloat(datosVenta.total_a_pagar),
                total_pagado: parseFloat(datosVenta.total_pagado),
                cambio: parseFloat(datosVenta.total_pagado) - parseFloat(datosVenta.total_a_pagar),
                estado_pago: parseFloat(datosVenta.total_pagado) >= parseFloat(datosVenta.total_a_pagar) ? 'pagado' : 'pendiente'
            };
            await this.update(id, datosLimpios);
            await this.db.query('DELETE FROM detalle_venta WHERE venta_id = $1', [id]);
            for (const detalle of detalles) {
                const detalleData = {
                    producto_id: parseInt(detalle.producto_id),
                    venta_id: id,
                    cantidad: parseInt(detalle.cantidad),
                    subtotal: parseFloat(detalle.subtotal)
                };
                await this.db.query(
                    'INSERT INTO detalle_venta (producto_id, venta_id, cantidad, subtotal) VALUES ($1, $2, $3, $4)',
                    [detalleData.producto_id, detalleData.venta_id, detalleData.cantidad, detalleData.subtotal]
                );
                await this.db.query(
                    'UPDATE producto SET cantidad = cantidad - $1 WHERE id = $2',
                    [detalleData.cantidad, detalleData.producto_id]
                );
            }
            return true;
        } catch (error) {
            console.error('Error al actualizar venta con detalles:', error);
            throw error;
        }
    }

    async eliminarConDetalles(id) {
        try {
            const venta = await this.obtenerPorIdConDetalles(id);
            if (!venta) {
                throw new Error('La venta no existe');
            }
            for (const detalle of venta.detalles) {
                await this.db.query(
                    'UPDATE producto SET cantidad = cantidad + $1 WHERE id = $2',
                    [detalle.cantidad, detalle.producto_id]
                );
            }
            return await this.delete(id);
        } catch (error) {
            console.error('Error al eliminar venta con detalles:', error);
            throw error;
        }
    }

    async obtenerEstadisticas() {
        try {
            const sql = `
                SELECT 
                    COUNT(*) as total_ventas,
                    SUM(CASE WHEN estado_pago = 'pagado' THEN 1 ELSE 0 END) as ventas_pagadas,
                    SUM(CASE WHEN estado_pago = 'pendiente' THEN 1 ELSE 0 END) as ventas_pendientes,
                    SUM(CASE WHEN estado_pago = 'pagado' THEN total_a_pagar ELSE 0 END) as total_ingresos,
                    AVG(CASE WHEN estado_pago = 'pagado' THEN total_a_pagar ELSE NULL END) as promedio_venta
                FROM venta
            `;
            const result = await this.query(sql);
            return result[0] || {
                total_ventas: 0,
                ventas_pagadas: 0,
                ventas_pendientes: 0,
                total_ingresos: 0,
                promedio_venta: 0
            };
        } catch (error) {
            console.error('Error al obtener estadísticas de ventas:', error);
            throw error;
        }
    }

    async buscar(termino) {
        try {
            const sql = `
                SELECT 
                    v.*,
                    c.nombre as cliente_nombre,
                    c.celular as cliente_celular,
                    COUNT(dv.producto_id) as total_productos
                FROM venta v
                LEFT JOIN cliente c ON v.cliente_id = c.id
                LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
                WHERE 
                    LOWER(c.nombre) LIKE LOWER($1) OR 
                    LOWER(c.celular) LIKE LOWER($1) OR
                    v.id::text = $2
                GROUP BY v.id, c.nombre, c.celular
                ORDER BY v.fecha DESC, v.id DESC
            `;
            return await this.query(sql, [`%${termino}%`, termino]);
        } catch (error) {
            console.error('Error al buscar ventas:', error);
            throw error;
        }
    }
}

module.exports = VentaModel;