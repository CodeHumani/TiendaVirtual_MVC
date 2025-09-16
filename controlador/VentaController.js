const Controller = require('../core/Controller');
const VentaModel = require('../modelo/VentaModel');
const ClienteModel = require('../modelo/ClienteModel');
const ProductoModel = require('../modelo/ProductoModel');

class VentaController extends Controller {
    constructor() {
        super();
        this.ventaModel = new VentaModel();
        this.clienteModel = new ClienteModel();
        this.productoModel = new ProductoModel();
    }

    getViewPath() {
        return 'ventas';
    }

    async index(req, res) {
        try {
            const { estado, buscar } = req.query;
            let ventas = [];
            if (buscar && buscar.trim() !== '') {
                ventas = await this.ventaModel.buscar(buscar.trim());
            } else {
                ventas = await this.ventaModel.obtenerTodosConDetalles();
                if (estado && estado !== 'todos') {
                    ventas = ventas.filter(venta => venta.estado_pago === estado);
                }
            }
            const estadisticas = await this.ventaModel.obtenerEstadisticas();
            this.render(res, 'ventas/index', {
                title: 'Gestión de Ventas',
                ventas,
                estadisticas,
                filtros: {
                    estado: estado || 'todos',
                    buscar: buscar || ''
                },
                mensaje: req.session.mensaje
            });
            delete req.session.mensaje;
        } catch (error) {
            this.handleError(res, error, 'Error al cargar la lista de ventas');
        }
    }

    async crear(req, res) {
        try {
            const [clientes, productos] = await Promise.all([
                this.clienteModel.getAll(),
                this.productoModel.obtenerTodosConCategoria()
            ]);
            this.render(res, 'ventas/crear', {
                title: 'Nueva Venta',
                clientes,
                productos,
                venta: {}
            });
        } catch (error) {
            this.handleError(res, error, 'Error al cargar el formulario de nueva venta');
        }
    }

    async guardar(req, res) {
        try {
            const datosVenta = {
                cliente_id: req.body.cliente_id,
                fecha: req.body.fecha || new Date().toISOString().split('T')[0],
                total_a_pagar: parseFloat(req.body.total_a_pagar),
                total_pagado: parseFloat(req.body.total_pagado),
                cantidad: req.body.detalles ? req.body.detalles.length : 0
            };
            const detalles = [];
            if (req.body.productos && Array.isArray(req.body.productos)) {
                for (let i = 0; i < req.body.productos.length; i++) {
                    if (req.body.productos[i] && req.body.cantidades[i] && req.body.subtotales[i]) {
                        detalles.push({
                            producto_id: parseInt(req.body.productos[i]),
                            cantidad: parseInt(req.body.cantidades[i]),
                            subtotal: parseFloat(req.body.subtotales[i])
                        });
                    }
                }
            }
            const nuevaVentaId = await this.ventaModel.crearConDetalles(datosVenta, detalles);
            req.session.mensaje = {
                tipo: 'success',
                texto: `Venta #${nuevaVentaId} creada exitosamente`
            };
            this.redirect(res, '/ventas');
        } catch (error) {
            console.error('Error en VentaController.store:', error);
            try {
                const [clientes, productos] = await Promise.all([
                    this.clienteModel.getAll(),
                    this.productoModel.obtenerTodosConCategoria()
                ]);
                this.render(res, 'ventas/crear', {
                    title: 'Nueva Venta',
                    clientes,
                    productos,
                    venta: req.body,
                    error: error.message
                });
            } catch (err) {
                this.handleError(res, error, 'Error al crear la venta');
            }
        }
    }

    async ver(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (!id || id <= 0) {
                return res.status(400).render('errors/404', {
                    title: 'Venta No Encontrada',
                    mensaje: 'ID de venta inválido'
                });
            }
            const venta = await this.ventaModel.obtenerPorIdConDetalles(id);
            if (!venta) {
                return res.status(404).render('errors/404', {
                    title: 'Venta No Encontrada',
                    mensaje: 'La venta solicitada no existe'
                });
            }
            this.render(res, 'ventas/ver', {
                title: `Venta #${venta.id}`,
                venta: venta || {}
            });
        } catch (error) {
            this.handleError(res, error, 'Error al cargar la venta');
        }
    }

    async editar(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (!id || id <= 0) {
                return res.status(400).render('errors/404', {
                    title: 'Venta No Encontrada',
                    mensaje: 'ID de venta inválido'
                });
            }
            const [venta, clientes, productos] = await Promise.all([
                this.ventaModel.obtenerPorIdConDetalles(id),
                this.clienteModel.getAll(),
                this.productoModel.obtenerTodosConCategoria()
            ]);
            if (!venta) {
                return res.status(404).render('errors/404', {
                    title: 'Venta No Encontrada',
                    mensaje: 'La venta solicitada no existe'
                });
            }
            this.render(res, 'ventas/editar', {
                title: `Editar Venta #${venta.id}`,
                venta: venta || {},
                clientes: clientes || [],
                productos: productos || []
            });
        } catch (error) {
            this.handleError(res, error, 'Error al cargar el formulario de edición');
        }
    }

    async actualizar(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (!id || id <= 0) {
                throw new Error('ID de venta inválido');
            }
            const datosVenta = {
                cliente_id: req.body.cliente_id,
                fecha: req.body.fecha,
                total_a_pagar: parseFloat(req.body.total_a_pagar),
                total_pagado: parseFloat(req.body.total_pagado),
                cantidad: req.body.detalles ? req.body.detalles.length : 0
            };
            const detalles = [];
            if (req.body.productos && Array.isArray(req.body.productos)) {
                for (let i = 0; i < req.body.productos.length; i++) {
                    if (req.body.productos[i] && req.body.cantidades[i] && req.body.subtotales[i]) {
                        detalles.push({
                            producto_id: parseInt(req.body.productos[i]),
                            cantidad: parseInt(req.body.cantidades[i]),
                            subtotal: parseFloat(req.body.subtotales[i])
                        });
                    }
                }
            }
            await this.ventaModel.actualizarConDetalles(id, datosVenta, detalles);
            req.session.mensaje = {
                tipo: 'success',
                texto: `Venta #${id} actualizada exitosamente`
            };
            this.redirect(res, '/ventas');
        } catch (error) {
            console.error('Error en VentaController.update:', error);
            try {
                const [venta, clientes, productos] = await Promise.all([
                    this.ventaModel.obtenerPorIdConDetalles(req.params.id),
                    this.clienteModel.getAll(),
                    this.productoModel.obtenerTodosConCategoria()
                ]);
                const ventaConDatos = {
                    ...(venta || {}),
                    ...req.body
                };
                this.render(res, 'ventas/editar', {
                    title: `Editar Venta #${req.params.id}`,
                    venta: ventaConDatos,
                    clientes: clientes || [],
                    productos: productos || [],
                    error: error.message
                });
            } catch (err) {
                this.handleError(res, error, 'Error al actualizar la venta');
            }
        }
    }

    async eliminar(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (!id || id <= 0) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'ID de venta inválido'
                });
            }
            const venta = await this.ventaModel.getById(id);
            if (!venta) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'La venta no existe'
                });
            }
            await this.ventaModel.eliminarConDetalles(id);
            res.json({
                success: true,
                mensaje: `Venta #${id} eliminada exitosamente`
            });
        } catch (error) {
            console.error('Error en VentaController.eliminar:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error al eliminar la venta',
                error: error.message
            });
        }
    }

    async apiProductos(req, res) {
        try {
            const productos = await this.productoModel.obtenerTodosConCategoria();
            const productosDisponibles = productos.filter(p => p.cantidad > 0);
            res.json({
                success: true,
                productos: productosDisponibles
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                mensaje: 'Error al obtener productos',
                error: error.message
            });
        }
    }

    async apiClientes(req, res) {
        try {
            const clientes = await this.clienteModel.getAll();
            res.json({
                success: true,
                clientes
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                mensaje: 'Error al obtener clientes',
                error: error.message
            });
        }
    }

    async apiEstadisticas(req, res) {
        try {
            const estadisticas = await this.ventaModel.obtenerEstadisticas();
            res.json({
                success: true,
                estadisticas
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                mensaje: 'Error al obtener estadísticas',
                error: error.message
            });
        }
    }
}

module.exports = VentaController;