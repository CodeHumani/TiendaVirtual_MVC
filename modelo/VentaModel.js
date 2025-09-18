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
        if (datos.total_pagado === undefined || parseFloat(datos.total_pagado) < 0) {
            errores.push('El total pagado no puede ser negativo');
        }
        const totalAPagar = parseFloat(datos.total_a_pagar);
        const totalPagado = parseFloat(datos.total_pagado);
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
                estado_pago: (function(tp, ta){
                    if (tp <= 0) return 'pendiente';
                    if (tp < ta) return 'parcial';
                    return 'pagado';
                })(parseFloat(datosVenta.total_pagado), parseFloat(datosVenta.total_a_pagar))
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
            if (!this.db.pool) {
                await this.db.connect();
            }
            const client = await this.db.pool.connect();
            try {
                await client.query('BEGIN');
                const ventaRowRes = await client.query(
                    'SELECT id, estado_pago FROM venta WHERE id = $1 FOR UPDATE',
                    [id]
                );
                if (ventaRowRes.rowCount === 0) {
                    throw new Error('La venta no existe');
                }
                const estadoAnterior = ventaRowRes.rows[0].estado_pago;
                const detallesActualesRes = await client.query(
                    'SELECT producto_id, cantidad FROM detalle_venta WHERE venta_id = $1',
                    [id]
                );
                const mapaAnterior = new Map();
                for (const d of detallesActualesRes.rows) {
                    mapaAnterior.set(parseInt(d.producto_id), parseInt(d.cantidad));
                }
                const nuevosDetalles = (detalles || []).map(d => ({
                    producto_id: parseInt(d.producto_id),
                    cantidad: parseInt(d.cantidad),
                    subtotal: parseFloat(d.subtotal)
                }));
                const mapaNuevo = new Map();
                for (const d of nuevosDetalles) {
                    mapaNuevo.set(d.producto_id, (mapaNuevo.get(d.producto_id) || 0) + d.cantidad);
                }
                const totalPagado = parseFloat(datosVenta.total_pagado);
                const totalAPagar = parseFloat(datosVenta.total_a_pagar);
                const estadoNuevo = (function(tp, ta) {
                    if (tp <= 0) return 'pendiente';
                    if (tp < ta) return 'parcial';
                    return 'pagado';
                })(totalPagado, totalAPagar);
                const reactivando = (estadoAnterior === 'cancelado' && estadoNuevo !== 'cancelado');
                const deducciones = []; // { producto_id, cantidad }
                const productoIds = new Set([...mapaAnterior.keys(), ...mapaNuevo.keys()]);
                for (const pid of productoIds) {
                    const antes = mapaAnterior.get(pid) || 0;
                    const nuevo = mapaNuevo.get(pid) || 0;
                    const aDescontar = reactivando ? nuevo : Math.max(0, nuevo - antes);
                    if (aDescontar > 0) {
                        deducciones.push({ producto_id: pid, cantidad: aDescontar });
                    }
                }
                for (const d of deducciones) {
                    const res = await client.query(
                        'SELECT cantidad FROM producto WHERE id = $1 FOR UPDATE',
                        [d.producto_id]
                    );
                    if (res.rowCount === 0) {
                        throw new Error(`Producto ${d.producto_id} no existe`);
                    }
                    const disponible = parseInt(res.rows[0].cantidad);
                    if (disponible < d.cantidad) {
                        throw new Error(`Stock insuficiente para el producto ${d.producto_id}. Disponible: ${disponible}, requerido: ${d.cantidad}`);
                    }
                }
                const datosLimpios = {
                    cliente_id: parseInt(datosVenta.cliente_id),
                    fecha: datosVenta.fecha,
                    cantidad: parseInt(datosVenta.cantidad) || nuevosDetalles.length,
                    total_a_pagar: totalAPagar,
                    total_pagado: totalPagado,
                    cambio: totalPagado - totalAPagar,
                    estado_pago: estadoNuevo
                };
                const fields = Object.keys(datosLimpios);
                const setSql = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
                const values = [...Object.values(datosLimpios), id];
                await client.query(`UPDATE venta SET ${setSql} WHERE id = $${values.length}`, values);
                await client.query('DELETE FROM detalle_venta WHERE venta_id = $1', [id]);
                for (const d of nuevosDetalles) {
                    await client.query(
                        'INSERT INTO detalle_venta (producto_id, venta_id, cantidad, subtotal) VALUES ($1, $2, $3, $4)',
                        [d.producto_id, id, d.cantidad, d.subtotal]
                    );
                }
                for (const d of deducciones) {
                    const upd = await client.query(
                        'UPDATE producto SET cantidad = cantidad - $1 WHERE id = $2',
                        [d.cantidad, d.producto_id]
                    );
                }
                await client.query('COMMIT');
                return true;
            } catch (txErr) {
                try { await client.query('ROLLBACK'); } catch (_) {}
                throw txErr;
            } finally {
                client.release();
            }
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
                    SUM(CASE WHEN estado_pago = 'parcial' THEN 1 ELSE 0 END) as ventas_parciales,
                    SUM(CASE WHEN estado_pago = 'cancelado' THEN 1 ELSE 0 END) as ventas_canceladas,
                    SUM(CASE WHEN estado_pago = 'pagado' THEN total_a_pagar ELSE 0 END) as total_ingresos,
                    AVG(CASE WHEN estado_pago = 'pagado' THEN total_a_pagar ELSE NULL END) as promedio_venta
                FROM venta
            `;
            const result = await this.query(sql);
            return result[0] || {
                total_ventas: 0,
                ventas_pagadas: 0,
                ventas_pendientes: 0,
                ventas_parciales: 0,
                ventas_canceladas: 0,
                total_ingresos: 0,
                promedio_venta: 0
            };
        } catch (error) {
            console.error('Error al obtener estadísticas de ventas:', error);
            throw error;
        }
    }

    _normalizarRango(fechaInicio, fechaFin) {
        let start = fechaInicio ? new Date(fechaInicio) : null;
        let end = fechaFin ? new Date(fechaFin) : null;
        if (start && isNaN(start)) start = null;
        if (end && isNaN(end)) end = null;
        return { start, end };
    }

    async resumen(fechaInicio, fechaFin) {
        const { start, end } = this._normalizarRango(fechaInicio, fechaFin);
        const filtros = [];
        const params = [];
        if (start) {
            params.push(start);
            filtros.push(`fecha >= $${params.length}`);
        }
        if (end) {
            params.push(end);
            filtros.push(`fecha <= $${params.length}`);
        }
        const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
        const sql = `
            SELECT 
                COUNT(*)::int as total_ventas,
                SUM(CASE WHEN estado_pago = 'pagado' THEN 1 ELSE 0 END)::int as ventas_pagadas,
                SUM(CASE WHEN estado_pago = 'pendiente' THEN 1 ELSE 0 END)::int as ventas_pendientes,
                COALESCE(SUM(total_a_pagar),0)::float as total_ingresos,
                COALESCE(AVG(total_a_pagar),0)::float as promedio_venta
            FROM venta
            ${where}
        `;
        const [row] = await this.query(sql, params);
        return row || { total_ventas: 0, ventas_pagadas: 0, ventas_pendientes: 0, total_ingresos: 0, promedio_venta: 0 };
    }

    async ventasDiarias(fechaInicio, fechaFin) {
        const { start, end } = this._normalizarRango(fechaInicio, fechaFin);
        const filtros = [];
        const params = [];
        if (start) { params.push(start); filtros.push(`DATE(fecha) >= DATE($${params.length})`); }
        if (end) { params.push(end); filtros.push(`DATE(fecha) <= DATE($${params.length})`); }
        const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
        const sql = `
            SELECT DATE(fecha) as dia,
                   COUNT(*)::int as ventas,
                   COALESCE(SUM(total_a_pagar),0)::float as ingresos
            FROM venta
            ${where}
            GROUP BY DATE(fecha)
            ORDER BY DATE(fecha)
        `;
        return await this.query(sql, params);
    }

    async ventasPorMes(anio) {
        const year = parseInt(anio) || new Date().getFullYear();
        const sql = `
            SELECT 
                EXTRACT(MONTH FROM fecha)::int as mes,
                COUNT(*)::int as ventas,
                COALESCE(SUM(total_a_pagar),0)::float as ingresos
            FROM venta
            WHERE EXTRACT(YEAR FROM fecha) = $1
            GROUP BY EXTRACT(MONTH FROM fecha)
            ORDER BY mes
        `;
        return await this.query(sql, [year]);
    }

    async ventasPorCategoria(fechaInicio, fechaFin) {
        const { start, end } = this._normalizarRango(fechaInicio, fechaFin);
        const filtros = [];
        const params = [];
        if (start) { params.push(start); filtros.push(`v.fecha >= $${params.length}`); }
        if (end) { params.push(end); filtros.push(`v.fecha <= $${params.length}`); }
        const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
        const sql = `
            SELECT 
                COALESCE(c.nombre,'Sin categoría') as categoria,
                SUM(dv.cantidad)::int as unidades,
                COALESCE(SUM(dv.subtotal),0)::float as ingresos
            FROM detalle_venta dv
            INNER JOIN venta v ON dv.venta_id = v.id
            LEFT JOIN producto p ON dv.producto_id = p.id
            LEFT JOIN categoria c ON p.categoria_id = c.id
            ${where}
            GROUP BY c.nombre
            ORDER BY ingresos DESC
        `;
        return await this.query(sql, params);
    }

    async topProductos(fechaInicio, fechaFin, limit = 5) {
        const { start, end } = this._normalizarRango(fechaInicio, fechaFin);
        const filtros = [];
        const params = [];
        if (start) { params.push(start); filtros.push(`v.fecha >= $${params.length}`); }
        if (end) { params.push(end); filtros.push(`v.fecha <= $${params.length}`); }
        params.push(parseInt(limit) || 5);
        const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
        const sql = `
            SELECT 
                p.nombre,
                SUM(dv.cantidad)::int as total_vendido,
                COALESCE(SUM(dv.subtotal),0)::float as ingresos
            FROM detalle_venta dv
            INNER JOIN producto p ON dv.producto_id = p.id
            INNER JOIN venta v ON dv.venta_id = v.id
            ${where}
            GROUP BY p.id, p.nombre
            ORDER BY total_vendido DESC
            LIMIT $${params.length}
        `;
        return await this.query(sql, params);
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

VentaModel.prototype.cancelar = async function(id) {
    try {
        const venta = await this.obtenerPorIdConDetalles(id);
        if (!venta) throw new Error('La venta no existe');
        if (venta.estado_pago === 'cancelado') return false;
        for (const detalle of (venta.detalles || [])) {
            await this.db.query('UPDATE producto SET cantidad = cantidad + $1 WHERE id = $2', [detalle.cantidad, detalle.producto_id]);
        }
        await this.update(id, { estado_pago: 'cancelado' });
        return true;
    } catch (error) {
        console.error('Error al cancelar venta:', error);
        throw error;
    }
};