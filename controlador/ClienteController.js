const Controller = require('../core/Controller');
const ClienteModel = require('../modelo/ClienteModel');

class ClienteController extends Controller {
    constructor() {
        super();
        this.model = new ClienteModel();
    }

    getViewPath() {
        return 'clientes';
    }

    async index(req, res) {
        try {
            const { search } = req.query;
            let clientes;
            if (search && search.trim() !== '') {
                clientes = await this.model.search(search.trim());
            } else {
                clientes = await this.model.getAllWithStats();
            }
            this.render(res, 'clientes/index', { 
                clientes,
                search: search || '',
                title: 'Gestión de Clientes'
            });
        } catch (error) {
            this.handleError(res, error, 'Error al obtener los clientes');
        }
    }

    async create(req, res) {
        try {
            this.render(res, 'clientes/crear', {
                title: 'Registrar Nuevo Cliente',
                cliente: {},
                errors: []
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async store(req, res) {
        try {
            const { nombre, celular, correo } = req.body;
            const data = { 
                nombre: nombre?.trim(), 
                celular: celular?.trim(),
                correo: correo?.trim() || null
            };
            const errors = this.model.validate(data);
            if (errors.length === 0) {
                const existsByPhone = await this.model.existsByPhone(data.celular);
                if (existsByPhone) {
                    errors.push('Ya existe un cliente con ese número de celular');
                }
            }
            if (errors.length === 0 && data.correo) {
                const existsByEmail = await this.model.existsByEmail(data.correo);
                if (existsByEmail) {
                    errors.push('Ya existe un cliente con ese correo electrónico');
                }
            }
            if (errors.length > 0) {
                return this.render(res, 'clientes/crear', {
                    title: 'Registrar Nuevo Cliente',
                    cliente: data,
                    errors
                });
            }
            const id = await this.model.create(data);
            this.redirect(res, '/clientes');
        } catch (error) {
            this.handleError(res, error, 'Error al crear el cliente');
        }
    }

    async show(req, res) {
        try {
            const id = req.params.id;
            const cliente = await this.model.getById(id);
            if (!cliente) {
                return res.status(404).render('errors/404', { 
                    title: 'Cliente no encontrado' 
                });
            }
            const compras = await this.model.getComprasById(id);
            const totalCompras = compras.length;
            const totalGastado = compras.reduce((sum, compra) => sum + parseFloat(compra.total_a_pagar), 0);
            const ultimaCompra = compras.length > 0 ? compras[0].fecha : null;
            this.render(res, 'clientes/ver', { 
                cliente,
                compras,
                stats: {
                    totalCompras,
                    totalGastado,
                    ultimaCompra
                },
                title: `Cliente: ${cliente.nombre}`
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async edit(req, res) {
        try {
            const id = req.params.id;
            const cliente = await this.model.getById(id);
            if (!cliente) {
                return res.status(404).render('errors/404', { 
                    title: 'Cliente no encontrado' 
                });
            }
            this.render(res, 'clientes/editar', { 
                cliente,
                title: `Editar Cliente: ${cliente.nombre}`,
                errors: []
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async update(req, res) {
        try {
            const id = req.params.id;
            const { nombre, celular, correo } = req.body;
            const data = { 
                nombre: nombre?.trim(), 
                celular: celular?.trim(),
                correo: correo?.trim() || null
            };
            const cliente = await this.model.getById(id);
            if (!cliente) {
                return res.status(404).render('errors/404', { 
                    title: 'Cliente no encontrado' 
                });
            }
            const errors = this.model.validate(data);
            if (errors.length === 0) {
                const existsByPhone = await this.model.existsByPhone(data.celular, id);
                if (existsByPhone) {
                    errors.push('Ya existe otro cliente con ese número de celular');
                }
            }
            if (errors.length === 0 && data.correo) {
                const existsByEmail = await this.model.existsByEmail(data.correo, id);
                if (existsByEmail) {
                    errors.push('Ya existe otro cliente con ese correo electrónico');
                }
            }
            if (errors.length > 0) {
                return this.render(res, 'clientes/editar', {
                    title: `Editar Cliente: ${cliente.nombre}`,
                    cliente: { ...cliente, ...data },
                    errors
                });
            }
            await this.model.update(id, data);
            this.redirect(res, '/clientes');
        } catch (error) {
            this.handleError(res, error, 'Error al actualizar el cliente');
        }
    }

    async destroy(req, res) {
        try {
            const id = req.params.id;
            const cliente = await this.model.getById(id);
            if (!cliente) {
                return res.status(404).json({ error: 'Cliente no encontrado' });
            }
            const canDelete = await this.model.canDelete(id);
            if (!canDelete) {
                return res.status(400).json({ 
                    error: 'No se puede eliminar el cliente porque tiene compras registradas' 
                });
            }
            await this.model.delete(id);
            this.redirect(res, '/clientes');
        } catch (error) {
            this.handleError(res, error, 'Error al eliminar el cliente');
        }
    }

    async generarCatalogo(req, res) {
        try {
            const id = req.params.id;
            const cliente = await this.model.getById(id);
            if (!cliente) {
                return res.status(404).json({ error: 'Cliente no encontrado' });
            }
            const whatsappPhone = this.model.formatPhoneForWhatsApp(cliente.celular);
            this.json(res, {
                success: true,
                message: 'Catálogo preparado para envío',
                cliente: {
                    ...cliente,
                    whatsappPhone
                }
            });
        } catch (error) {
            this.handleError(res, error, 'Error al generar catálogo para el cliente');
        }
    }
}

module.exports = ClienteController;