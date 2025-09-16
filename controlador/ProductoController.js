const Controller = require('../core/Controller');
const ProductoModel = require('../modelo/ProductoModel');
const CategoriaModel = require('../modelo/CategoriaModel');

class ProductoController extends Controller {
    constructor() {
        super();
        this.productoModel = new ProductoModel();
        this.categoriaModel = new CategoriaModel();
    }

    async index(req, res) {
        try {
            const { categoria, buscar } = req.query;
            let productos = [];
            const categorias = await this.categoriaModel.getAll();
            if (buscar && buscar.trim() !== '') {
                productos = await this.productoModel.buscar(buscar.trim());
            } else if (categoria && categoria !== 'todas') {
                productos = await this.productoModel.obtenerPorCategoria(parseInt(categoria));
            } else {
                productos = await this.productoModel.obtenerTodosConCategoria();
            }
            const todosLosProductos = await this.productoModel.obtenerTodosConCategoria();
            const totalProductos = todosLosProductos.length;
            const productosActivos = todosLosProductos.length;
            const productosInactivos = 0;
            const productosStockBajo = todosLosProductos.filter(p => p.cantidad < 10).length;
            const estadisticas = {
                total: totalProductos,
                activos: productosActivos,
                inactivos: productosInactivos,
                stockBajo: productosStockBajo
            };
            res.render('productos/index', {
                title: 'Gestión de Productos',
                productos,
                categorias,
                estadisticas,
                filtros: {
                    categoria: categoria || 'todas',
                    buscar: buscar || ''
                }
            });
        } catch (error) {
            console.error('Error en ProductoController.index:', error);
            res.status(500).render('errors/500', {
                title: 'Error del Servidor',
                mensaje: 'Error al cargar la lista de productos',
                error: error.message
            });
        }
    }

    async crear(req, res) {
        try {
            const categorias = await this.categoriaModel.getAll();
            res.render('productos/crear', {
                title: 'Crear Producto',
                categorias,
                producto: {}
            });
        } catch (error) {
            console.error('Error en ProductoController.crear:', error);
            res.status(500).render('errors/500', {
                title: 'Error del Servidor',
                mensaje: 'Error al cargar el formulario de creación',
                error: error.message
            });
        }
    }

    async guardar(req, res) {
        try {
            const datosProducto = {
                nombre: req.body.nombre,
                descripcion: req.body.descripcion,
                precio: parseFloat(req.body.precio),
                stock: parseInt(req.body.stock),
                categoria_id: parseInt(req.body.categoria_id)
            };
            if (req.file) {
                datosProducto.imagen = req.file.filename;
            }
            const nuevoProductoId = await this.productoModel.crearConCategoria(datosProducto, datosProducto.categoria_id);
            req.session.mensaje = {
                tipo: 'success',
                texto: `Producto "${req.body.nombre}" creado exitosamente`
            };
            res.redirect('/productos');
        } catch (error) {
            console.error('Error en ProductoController.guardar:', error);
            const categorias = await this.categoriaModel.getAll();
            res.status(400).render('productos/crear', {
                title: 'Crear Producto',
                categorias,
                producto: req.body,
                error: error.message
            });
        }
    }

    async ver(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (!id || id <= 0) {
                return res.status(400).render('errors/404', {
                    title: 'Producto No Encontrado',
                    mensaje: 'ID de producto inválido'
                });
            }
            const producto = await this.productoModel.obtenerPorIdConCategoria(id);
            if (!producto) {
                console.log('Producto no encontrado');
                return res.status(404).render('errors/404', {
                    title: 'Producto No Encontrado',
                    mensaje: 'El producto solicitado no existe'
                });
            }
            res.render('productos/ver', {
                title: `Producto: ${producto.nombre}`,
                producto
            });
        } catch (error) {
            console.error('Error en ProductoController.ver:', error);
            res.status(500).render('errors/500', {
                title: 'Error del Servidor',
                mensaje: 'Error al cargar el producto',
                error: error.message
            });
        }
    }

    async editar(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (!id || id <= 0) {
                return res.status(400).render('errors/404', {
                    title: 'Producto No Encontrado',
                    mensaje: 'ID de producto inválido'
                });
            }
            const producto = await this.productoModel.obtenerPorIdConCategoria(id);
            if (!producto) {
                return res.status(404).render('errors/404', {
                    title: 'Producto No Encontrado',
                    mensaje: 'El producto solicitado no existe'
                });
            }
            const categorias = await this.categoriaModel.getAll();
            console.log('Producto a editar:', producto.nombre);
            console.log('Categorías disponibles:', categorias.length);
            res.render('productos/editar', {
                title: `Editar: ${producto.nombre}`,
                producto,
                categorias
            });
        } catch (error) {
            console.error('Error en ProductoController.editar:', error);
            res.status(500).render('errors/500', {
                title: 'Error del Servidor',
                mensaje: 'Error al cargar el formulario de edición',
                error: error.message
            });
        }
    }

    async actualizar(req, res) {
        try {            
            const id = parseInt(req.params.id);
            if (!id || id <= 0) {
                throw new Error('ID de producto inválido');
            }
            const productoExistente = await this.productoModel.getById(id);
            if (!productoExistente) {
                throw new Error('El producto no existe');
            }
            const datosActualizacion = {
                nombre: req.body.nombre,
                descripcion: req.body.descripcion,
                precio: parseFloat(req.body.precio),
                stock: parseInt(req.body.stock),
                categoria_id: parseInt(req.body.categoria_id)
            };
            const fs = require('fs');
            const path = require('path');
            if (req.file) {
                console.log('📸 CASO 1: Nueva imagen subida');
                if (productoExistente.imagen) {
                    const rutaImagenAnterior = path.join(__dirname, '..', 'public', 'uploads', 'productos', productoExistente.imagen);
                    try {
                        if (fs.existsSync(rutaImagenAnterior)) {
                            fs.unlinkSync(rutaImagenAnterior);
                        }
                    } catch (errorImagen) {
                        console.error('❌ Error al eliminar imagen anterior:', errorImagen);
                    }
                }
                datosActualizacion.imagen = req.file.filename;                
            } else if (req.body.eliminar_imagen === '1') {
                console.log('🗑️ CASO 2: Eliminando imagen actual por solicitud del usuario');
                if (productoExistente.imagen) {
                    const rutaImagenActual = path.join(__dirname, '..', 'public', 'uploads', 'productos', productoExistente.imagen);
                    try {
                        if (fs.existsSync(rutaImagenActual)) {
                            fs.unlinkSync(rutaImagenActual);
                        } else {
                            console.log('⚠️ Imagen no encontrada en disco');
                        }
                    } catch (errorImagen) {
                        console.error('❌ Error al eliminar imagen:', errorImagen);
                    }
                }
                datosActualizacion.imagen = null;
            }
            const actualizado = await this.productoModel.actualizarConCategoria(id, datosActualizacion, datosActualizacion.categoria_id);
            req.session.mensaje = {
                tipo: 'success',
                texto: `Producto "${req.body.nombre}" actualizado exitosamente`
            };
            console.log('🔄 Redirigiendo a /productos');
            res.redirect('/productos');
        } catch (error) {
            try {
                const producto = await this.productoModel.obtenerPorIdConCategoria(req.params.id);
                const categorias = await this.categoriaModel.getAll();
                const productoConDatos = {
                    ...producto,
                    ...req.body
                };
                res.status(400).render('productos/editar', {
                    title: `Editar: ${producto.nombre}`,
                    producto: productoConDatos,
                    categorias,
                    error: error.message
                });
            } catch (err) {
                res.status(500).render('errors/500', {
                    title: 'Error del Servidor',
                    mensaje: 'Error al actualizar el producto',
                    error: error.message
                });
            }
        }
    }

    async eliminar(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (!id || id <= 0) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'ID de producto inválido'
                });
            }
            const producto = await this.productoModel.getById(id);
            if (!producto) {
                return res.status(404).json({
                    success: false,
                    mensaje: 'El producto no existe'
                });
            }
            await this.productoModel.eliminarConCategorias(id);
            if (producto.imagen) {
                const fs = require('fs');
                const path = require('path');
                const rutaImagen = path.join(__dirname, '..', 'public', 'uploads', 'productos', producto.imagen);
                try {
                    if (fs.existsSync(rutaImagen)) {
                        fs.unlinkSync(rutaImagen);
                    }
                } catch (errorImagen) {
                    console.error('❌ Error al eliminar imagen:', errorImagen);
                }
            }
            res.json({
                success: true,
                mensaje: `Producto "${producto.nombre}" eliminado exitosamente`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                mensaje: 'Error al eliminar el producto',
                error: error.message
            });
        }
    }

    async apiPorCategoria(req, res) {
        try {
            const categoriaId = parseInt(req.params.categoriaId);
            if (!categoriaId || categoriaId <= 0) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'ID de categoría inválido'
                });
            }
            const productosCategoria = await this.productoModel.obtenerPorCategoria(categoriaId);
            res.json({
                success: true,
                productos: productosCategoria
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                mensaje: 'Error al obtener productos',
                error: error.message
            });
        }
    }

    async apiActualizarStock(req, res) {
        try {
            const id = parseInt(req.params.id);
            const { stock } = req.body;
            if (!id || id <= 0) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'ID de producto inválido'
                });
            }
            const nuevoStock = parseInt(stock);
            if (isNaN(nuevoStock) || nuevoStock < 0) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'Stock inválido'
                });
            }
            await this.productoModel.update(id, { cantidad: nuevoStock });
            const producto = await this.productoModel.getById(id);
            res.json({
                success: true,
                mensaje: 'Stock actualizado exitosamente',
                producto
            });
        } catch (error) {
            console.error('Error en ProductoController.apiActualizarStock:', error);
            res.status(500).json({
                success: false,
                mensaje: 'Error al actualizar stock',
                error: error.message
            });
        }
    }
}

module.exports = ProductoController;