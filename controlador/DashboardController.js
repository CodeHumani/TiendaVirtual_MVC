const Controller = require('../core/Controller');
const CategoriaModel = require('../modelo/CategoriaModel');
const ClienteModel = require('../modelo/ClienteModel');
const ProductoModel = require('../modelo/ProductoModel');
const VentaModel = require('../modelo/VentaModel');
const database = require('../config/database');

class DashboardController extends Controller {
    constructor() {
        super();
        this.categoriaModel = new CategoriaModel();
        this.clienteModel = new ClienteModel();
        this.productoModel = new ProductoModel();
        this.ventaModel = new VentaModel();
    }

    async index(req, res) {
        try {
            const stats = await this.getStatistics();
            
            this.render(res, 'dashboard/index', {
                title: 'Dashboard - Panel de Control',
                stats
            });
        } catch (error) {
            this.handleError(res, error, 'Error al cargar el dashboard');
        }
    }

    async getStatistics() {
        try {
            let stats = {
                totalCategorias: 0,
                totalProductos: 0,
                totalClientes: 0,
                totalVentas: 0,
                ventasHoy: { count: 0, total: 0 },
                productosPocoStock: 0,
                ultimasVentas: [],
                ingresosMes: 0,
                ventasMes: 0,
                productosTopVenta: [],
                ventasPendientes: 0
            };

            // Obtener estadísticas básicas
            try {
                const totalCategorias = await database.query('SELECT COUNT(*) as count FROM categoria');
                stats.totalCategorias = parseInt(totalCategorias[0].count);
            } catch (e) { 
                console.warn('Error en categorías:', e.message); 
            }

            try {
                const totalProductos = await database.query('SELECT COUNT(*) as count FROM producto');
                stats.totalProductos = parseInt(totalProductos[0].count);
            } catch (e) { 
                console.warn('Error en productos:', e.message); 
            }

            try {
                const totalClientes = await database.query('SELECT COUNT(*) as count FROM cliente');
                stats.totalClientes = parseInt(totalClientes[0].count);
            } catch (e) { 
                console.warn('Error en clientes:', e.message); 
            }

            try {
                const totalVentas = await database.query('SELECT COUNT(*) as count FROM venta');
                stats.totalVentas = parseInt(totalVentas[0].count);
            } catch (e) { 
                console.warn('Error en ventas:', e.message); 
            }

            // Ventas de hoy
            try {
                const ventasHoy = await database.query(`
                    SELECT 
                        COUNT(*) as count, 
                        COALESCE(SUM(total_a_pagar), 0) as total 
                    FROM venta 
                    WHERE DATE(fecha) = CURRENT_DATE
                `);
                stats.ventasHoy = {
                    count: parseInt(ventasHoy[0].count),
                    total: parseFloat(ventasHoy[0].total)
                };
            } catch (e) { 
                console.warn('Error en ventas de hoy:', e.message); 
            }

            // Ventas del mes
            try {
                const ventasMes = await database.query(`
                    SELECT 
                        COUNT(*) as count, 
                        COALESCE(SUM(total_a_pagar), 0) as total 
                    FROM venta 
                    WHERE EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
                    AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
                `);
                stats.ventasMes = parseInt(ventasMes[0].count);
                stats.ingresosMes = parseFloat(ventasMes[0].total);
            } catch (e) { 
                console.warn('Error en ventas del mes:', e.message); 
            }

            // Productos con poco stock (≤ 5 unidades)
            try {
                const productosPocoStock = await database.query(`
                    SELECT COUNT(*) as count 
                    FROM producto 
                    WHERE cantidad <= 5
                `);
                stats.productosPocoStock = parseInt(productosPocoStock[0].count);
            } catch (e) { 
                console.warn('Error en productos con poco stock:', e.message); 
            }

            // Ventas pendientes
            try {
                const ventasPendientes = await database.query(`
                    SELECT COUNT(*) as count 
                    FROM venta 
                    WHERE estado_pago = 'pendiente'
                `);
                stats.ventasPendientes = parseInt(ventasPendientes[0].count);
            } catch (e) { 
                console.warn('Error en ventas pendientes:', e.message); 
            }

            // Últimas 5 ventas
            try {
                const ultimasVentas = await database.query(`
                    SELECT 
                        v.id,
                        v.fecha,
                        v.total_a_pagar,
                        v.estado_pago,
                        c.nombre as cliente_nombre,
                        c.celular as cliente_celular
                    FROM venta v
                    LEFT JOIN cliente c ON v.cliente_id = c.id
                    ORDER BY v.fecha DESC, v.id DESC
                    LIMIT 5
                `);
                stats.ultimasVentas = ultimasVentas;
            } catch (e) { 
                console.warn('Error en últimas ventas:', e.message); 
            }

            // Productos más vendidos
            try {
                const productosTopVenta = await database.query(`
                    SELECT 
                        p.nombre,
                        SUM(dv.cantidad) as total_vendido,
                        COUNT(DISTINCT dv.venta_id) as veces_vendido
                    FROM detalle_venta dv
                    INNER JOIN producto p ON dv.producto_id = p.id
                    GROUP BY p.id, p.nombre
                    ORDER BY total_vendido DESC
                    LIMIT 5
                `);
                stats.productosTopVenta = productosTopVenta;
            } catch (e) { 
                console.warn('Error en productos top venta:', e.message); 
            }

            return stats;
        } catch (error) {
            console.error('Error obteniendo estadísticas del dashboard:', error);
            return {
                totalCategorias: 0,
                totalProductos: 0,
                totalClientes: 0,
                totalVentas: 0,
                ventasHoy: { count: 0, total: 0 },
                productosPocoStock: 0,
                ultimasVentas: [],
                ingresosMes: 0,
                ventasMes: 0,
                productosTopVenta: [],
                ventasPendientes: 0
            };
        }
    }
}

module.exports = DashboardController;