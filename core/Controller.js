class Controller {
    constructor() {
        this.model = null;
    }

    render(res, view, data = {}) {
        const viewData = {
            title: 'Tienda Virtual',
            ...data
        };
        res.render(view, viewData);
    }

    redirect(res, url) {
        res.redirect(url);
    }

    json(res, data) {
        res.json(data);
    }

    handleError(res, error, message = 'Error interno del servidor') {
        console.error('Error en controlador:', error);
        res.status(500).render('errors/500', { 
            title: 'Error',
            message,
            error: process.env.NODE_ENV === 'development' ? error : null
        });
    }

    validateRequired(data, requiredFields) {
        const errors = [];
        
        requiredFields.forEach(field => {
            if (!data[field] || data[field].toString().trim() === '') {
                errors.push(`El campo ${field} es requerido`);
            }
        });

        return errors;
    }

    async index(req, res) {
        try {
            const items = await this.model.getAll();
            this.render(res, `${this.getViewPath()}/index`, { items });
        } catch (error) {
            this.handleError(res, error, 'Error al obtener los registros');
        }
    }

    async create(req, res) {
        try {
            this.render(res, `${this.getViewPath()}/crear`);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async store(req, res) {
        try {
            throw new Error('Método store debe ser implementado en el controlador específico');
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async show(req, res) {
        try {
            const id = req.params.id;
            const item = await this.model.getById(id);
            
            if (!item) {
                return res.status(404).render('errors/404', { title: 'No encontrado' });
            }

            this.render(res, `${this.getViewPath()}/ver`, { item });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async edit(req, res) {
        try {
            const id = req.params.id;
            const item = await this.model.getById(id);
            
            if (!item) {
                return res.status(404).render('errors/404', { title: 'No encontrado' });
            }

            this.render(res, `${this.getViewPath()}/editar`, { item });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async update(req, res) {
        try {
            throw new Error('Método update debe ser implementado en el controlador específico');
        } catch (error) {
            this.handleError(res, error);
        }
    }

    async destroy(req, res) {
        try {
            const id = req.params.id;
            const deleted = await this.model.delete(id);
            if (!deleted) {
                return res.status(404).json({ error: 'Registro no encontrado' });
            }
            this.redirect(res, `/${this.getViewPath()}`);
        } catch (error) {
            this.handleError(res, error);
        }
    }

    getViewPath() {
        throw new Error('Método getViewPath debe ser implementado en el controlador específico');
    }
}

module.exports = Controller;