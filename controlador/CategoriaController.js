const Controller = require('../core/Controller');
const CategoriaModel = require('../modelo/CategoriaModel');

class CategoriaController extends Controller {
    constructor() {
        super();
        this.model = new CategoriaModel();
    }

    getViewPath() {
        return 'categorias';
    }

    async index(req, res) {
        try {
            const buscar = req.query.buscar || '';
            let categorias;
            if (buscar.trim()) {
                categorias = await this.model.search(buscar.trim());
                console.log('🔍 Búsqueda realizada:', buscar, '- Resultados:', categorias.length);
            } else {
                categorias = await this.model.getAll();
                console.log('📊 Categorías obtenidas:', categorias.length);
            }
            this.render(res, 'categorias/index', { 
                categorias,
                buscar,
                title: 'Gestión de Categorías'
            });            
            console.log('✅ CategoriaController.index - Vista renderizada');
        } catch (error) {
            console.error('❌ Error en CategoriaController.index:', error);
            this.handleError(res, error, 'Error al obtener las categorías');
        }
    }

    async create(req, res) {
        try {
            console.log('🔧 CategoriaController.create - Iniciando...');
            console.log('📊 Datos a pasar a la vista:', {
                title: 'Crear Nueva Categoría',
                categoria: {},
                errors: []
            });
            this.render(res, 'categorias/crear', {
                title: 'Crear Nueva Categoría',
                categoria: {},
                errors: []
            });
            console.log('✅ CategoriaController.create - Vista renderizada');
        } catch (error) {
            console.error('❌ Error en CategoriaController.create:', error);
            this.handleError(res, error);
        }
    }

    async store(req, res) {
        try {
            const { nombre } = req.body;
            const data = { nombre: nombre?.trim() };
            const errors = this.model.validate(data);
            if (errors.length === 0) {
                const exists = await this.model.existsByName(data.nombre);
                if (exists) {
                    errors.push('Ya existe una categoría con ese nombre');
                }
            }
            if (errors.length > 0) {
                return this.render(res, 'categorias/crear', {
                    title: 'Crear Nueva Categoría',
                    categoria: data,
                    errors
                });
            }
            const id = await this.model.create(data);
            req.session?.flash ? 
                req.session.flash = { type: 'success', message: 'Categoría creada exitosamente' } : null;
            this.redirect(res, '/categorias');
        } catch (error) {
            this.handleError(res, error, 'Error al crear la categoría');
        }
    }

    async show(req, res) {
        try {
            const id = req.params.id;
            const categoria = await this.model.getById(id);
            if (!categoria) {
                return res.status(404).render('errors/404', { 
                    title: 'Categoría no encontrada' 
                });
            }
            this.render(res, 'categorias/ver', {
                categoria,
                title: `Categoría: ${categoria.nombre}`
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async edit(req, res) {
        try {
            const id = req.params.id;
            const categoria = await this.model.getById(id);
            if (!categoria) {
                return res.status(404).render('errors/404', { 
                    title: 'Categoría no encontrada' 
                });
            }
            this.render(res, 'categorias/editar', { 
                categoria,
                title: `Editar Categoría: ${categoria.nombre}`,
                errors: []
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async update(req, res) {
        try {
            const id = req.params.id;
            const { nombre } = req.body;
            const data = { nombre: nombre?.trim() };
            const categoria = await this.model.getById(id);
            if (!categoria) {
                return res.status(404).render('errors/404', { 
                    title: 'Categoría no encontrada' 
                });
            }
            const errors = this.model.validate(data);
            if (errors.length === 0) {
                const exists = await this.model.existsByName(data.nombre, id);
                if (exists) {
                    errors.push('Ya existe otra categoría con ese nombre');
                }
            }
            if (errors.length > 0) {
                return this.render(res, 'categorias/editar', {
                    title: `Editar Categoría: ${categoria.nombre}`,
                    categoria: { ...categoria, ...data },
                    errors
                });
            }
            await this.model.update(id, data);
            this.redirect(res, '/categorias');
        } catch (error) {
            this.handleError(res, error, 'Error al actualizar la categoría');
        }
    }

    async destroy(req, res) {
        try {
            console.log('🗑️ CategoriaController.destroy - Iniciando...');
            const id = req.params.id;
            const categoria = await this.model.getById(id);
            if (!categoria) {
                console.log('❌ Categoría no encontrada');
                return res.status(404).json({ 
                    exito: false,
                    error: 'Categoría no encontrada' 
                });
            }
            await this.model.deleteWithAssociations(id);
            console.log('✅ Categoría eliminada exitosamente');
            return res.status(200).json({
                exito: true,
                mensaje: 'Categoría eliminada exitosamente'
            });
        } catch (error) {
            console.error('❌ Error en destroy:', error);
            return res.status(500).json({
                exito: false,
                error: 'Error interno del servidor',
                mensaje: 'Error al eliminar la categoría'
            });
        }
    }
}

module.exports = CategoriaController;