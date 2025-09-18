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
            const { desde, hasta } = req.query;
            const stats = await this.getStatistics(desde, hasta);

            this.render(res, 'dashboard/index', {
                title: 'Dashboard - Panel de Control',
                stats,
                filtros: { desde: desde || '', hasta: hasta || '' }
            });
        } catch (error) {
            this.handleError(res, error, 'Error al cargar el dashboard');
        }
    }

    async getStatistics(desde, hasta) {
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
                ventasPendientes: 0,
                resumen: {},
                serieDiaria: [],
                serieMensual: [],
                porCategoria: []
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

            // Ventas del mes (independiente a filtros)
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

            // Agregados con filtros
            try {
                const [resumen, serieDiaria, serieMensual, porCategoria, topProductos] = await Promise.all([
                    this.ventaModel.resumen(desde, hasta),
                    this.ventaModel.ventasDiarias(desde, hasta),
                    this.ventaModel.ventasPorMes(new Date().getFullYear()),
                    this.ventaModel.ventasPorCategoria(desde, hasta),
                    this.ventaModel.topProductos(desde, hasta, 5)
                ]);
                stats.resumen = resumen;
                stats.serieDiaria = serieDiaria;
                stats.serieMensual = serieMensual;
                stats.porCategoria = porCategoria;
                stats.productosTopVenta = topProductos;
            } catch (e) {
                console.warn('Error en agregados con filtros:', e.message);
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
                ventasPendientes: 0,
                resumen: {},
                serieDiaria: [],
                serieMensual: [],
                porCategoria: []
            };
        }
    }

    // Endpoints JSON para gráficos y consumo dinámico
    async apiDatos(req, res) {
        try {
            const { desde, hasta } = req.query;
            const datos = await this.getStatistics(desde, hasta);
            res.json({ exito: true, datos });
        } catch (error) {
            this.handleError(res, error, 'Error al obtener datos del dashboard');
        }
    }

    // Exportar CSV simple de ventas diarias
    async exportarCSV(req, res) {
        try {
            const { desde, hasta } = req.query;
            const filas = await this.ventaModel.ventasDiarias(desde, hasta);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="ventas_diarias.csv"');
            res.write('dia,ventas,ingresos\n');
            for (const f of filas) {
                const dia = new Date(f.dia).toISOString().slice(0,10);
                res.write(`${dia},${f.ventas},${f.ingresos}\n`);
            }
            res.end();
        } catch (error) {
            this.handleError(res, error, 'Error al exportar CSV');
        }
    }

    // Exportar PDF básico con PDFKit (resumen)
    async exportarPDF(req, res) {
        try {
            const PDFDocument = require('pdfkit');
            const { desde, hasta } = req.query;
            const stats = await this.getStatistics(desde, hasta);
            const doc = new PDFDocument({ margin: 50 });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="reporte_dashboard.pdf"');
            doc.pipe(res);
            doc.fontSize(18).text('Reporte de Ventas - Dashboard', { align: 'center' });
            doc.moveDown();
            if (desde || hasta) {
                doc.fontSize(10).text(`Rango: ${desde || 'inicio'} a ${hasta || 'hoy'}`, { align: 'center' });
                doc.moveDown();
            }
            const kpis = stats.resumen || {};
            doc.fontSize(12).text(`Total ventas: ${kpis.total_ventas || 0}`);
            doc.text(`Ingresos: $${(kpis.total_ingresos || 0).toFixed(2)}`);
            doc.text(`Promedio venta: $${(kpis.promedio_venta || 0).toFixed(2)}`);
            doc.moveDown();
            doc.fontSize(14).text('Ventas por categoría');
            doc.moveDown(0.5);
            (stats.porCategoria || []).forEach(c => {
                doc.fontSize(10).text(`- ${c.categoria}: ${c.unidades} uds, $${(c.ingresos || 0).toFixed(2)}`);
            });
            doc.end();
        } catch (error) {
            this.handleError(res, error, 'Error al exportar PDF');
        }
    }
}

module.exports = DashboardController;