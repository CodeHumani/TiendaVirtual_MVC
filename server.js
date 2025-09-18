const express = require('express');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const config = require('./config/app');

const CategoriaController = require('./controlador/CategoriaController');
const ClienteController = require('./controlador/ClienteController');
const ProductoController = require('./controlador/ProductoController');
const VentaController = require('./controlador/VentaController');
const DashboardController = require('./controlador/DashboardController');
const CatalogoController = require('./controlador/CatalogoController');
const Router = require('./core/Router');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public/uploads/productos'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'producto-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    console.log('Validando archivo:', file.originalname, file.mimetype);
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, GIF, WebP)'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

const app = express();

app.set('view engine', config.views.engine);
app.set('views', path.join(__dirname, config.views.path));

// Configurar sesiones
app.use(session({
    secret: 'tienda-virtual-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Configurar flash messages
app.use(flash());

// Middleware para hacer disponible flash en las vistas
app.use((req, res, next) => {
    res.locals.flash = req.flash;
    next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Servir archivos temporales con headers específicos para PDF
app.use('/temp', express.static(path.join(__dirname, 'public/temp'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment');
        }
    }
}));

app.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        var method = req.body._method;
        delete req.body._method;
        return method;
    }
}));

app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        const method = req.body._method;
        delete req.body._method;
        req.method = method.toUpperCase();
    }
    next();
});

app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.url}`);
    next();
});

const categoriaController = new CategoriaController();
const clienteController = new ClienteController();
const productoController = new ProductoController();
const ventaController = new VentaController();
const dashboardController = new DashboardController();
const catalogoController = new CatalogoController();

app.get('/', (req, res) => dashboardController.index(req, res));
// Dashboard APIs y reportes
app.get('/api/dashboard/datos', (req, res) => dashboardController.apiDatos(req, res));
app.get('/reportes/dashboard.csv', (req, res) => dashboardController.exportarCSV(req, res));
app.get('/reportes/dashboard.pdf', (req, res) => dashboardController.exportarPDF(req, res));

app.get('/categorias', (req, res) => categoriaController.index(req, res));
app.get('/categorias/crear', (req, res) => categoriaController.create(req, res));
app.post('/categorias', (req, res) => categoriaController.store(req, res));
app.get('/categorias/:id', (req, res) => categoriaController.show(req, res));
app.get('/categorias/:id/editar', (req, res) => categoriaController.edit(req, res));
app.put('/categorias/:id', (req, res) => categoriaController.update(req, res));
app.delete('/categorias/:id', (req, res) => {
    try {
        categoriaController.destroy(req, res);
    } catch (error) {
        console.error('🚨 Error en ruta DELETE:', error);
        res.status(500).json({ exito: false, error: 'Error en ruta DELETE' });
    }
});

app.get('/clientes', (req, res) => clienteController.index(req, res));
app.get('/clientes/crear', (req, res) => clienteController.create(req, res));
app.post('/clientes', (req, res) => clienteController.store(req, res));
app.get('/clientes/:id', (req, res) => clienteController.show(req, res));
app.get('/clientes/:id/editar', (req, res) => clienteController.edit(req, res));
app.put('/clientes/:id', (req, res) => clienteController.update(req, res));
app.delete('/clientes/:id', (req, res) => clienteController.destroy(req, res));

app.get('/productos', (req, res) => productoController.index(req, res));
app.get('/productos/crear', (req, res) => productoController.crear(req, res));
app.post('/productos', upload.single('imagen'), (req, res) => productoController.guardar(req, res));
app.get('/productos/:id', (req, res) => productoController.ver(req, res));
app.get('/productos/:id/editar', (req, res) => productoController.editar(req, res));
app.put('/productos/:id', upload.single('imagen'), (req, res) => {
    productoController.actualizar(req, res);
});

app.post('/productos/:id', upload.single('imagen'), (req, res) => {
    if (req.body._method === 'PUT') {
        req.method = 'PUT';
        delete req.body._method;
        return productoController.actualizar(req, res);
    }
    res.status(405).json({ error: 'Method not allowed' });
});
app.delete('/productos/:id', (req, res) => productoController.eliminar(req, res));

// Rutas de Ventas
app.get('/ventas', (req, res) => ventaController.index(req, res));
app.get('/ventas/crear', (req, res) => ventaController.crear(req, res));
app.post('/ventas', (req, res) => ventaController.guardar(req, res));
app.get('/ventas/:id', (req, res) => ventaController.ver(req, res));
app.get('/ventas/:id/editar', (req, res) => ventaController.editar(req, res));
app.put('/ventas/:id', (req, res) => ventaController.actualizar(req, res));
app.delete('/ventas/:id', (req, res) => ventaController.eliminar(req, res));
app.post('/ventas/:id/cancelar', (req, res) => ventaController.cancelar(req, res));

// APIs adicionales para ventas
app.get('/api/ventas/productos', (req, res) => ventaController.apiProductos(req, res));
app.get('/api/ventas/clientes', (req, res) => ventaController.apiClientes(req, res));
app.get('/api/ventas/estadisticas', (req, res) => ventaController.apiEstadisticas(req, res));

// Rutas del Catálogo
app.get('/catalogo', (req, res) => catalogoController.index(req, res));
app.get('/catalogo/productos/:clienteId', (req, res) => catalogoController.productos(req, res));
app.get('/catalogo/instrucciones-pdf', (req, res) => catalogoController.mostrarInstruccionesPDF(req, res));
app.post('/catalogo/enviar-whatsapp', (req, res) => catalogoController.enviarWhatsApp(req, res));
app.post('/catalogo/enviar-whatsapp-pdf', (req, res) => catalogoController.enviarWhatsAppConPDF(req, res));
app.post('/catalogo/generar-pdf', (req, res) => catalogoController.generarPDF(req, res));
app.get('/test-pdf', catalogoController.testPDF.bind(catalogoController));
app.post('/catalogo/generar-pdf-estatico', catalogoController.generarPDFEstatico.bind(catalogoController));

app.get('/api/productos/categoria/:categoriaId', (req, res) => productoController.apiPorCategoria(req, res));
app.put('/api/productos/:id/stock', (req, res) => productoController.apiActualizarStock(req, res));

app.use((req, res) => {
    res.status(404).render('errors/404', { 
        title: 'Página no encontrada',
        url: req.originalUrl 
    });
});

app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).render('errors/500', { 
        title: 'Error interno',
        message: 'Ha ocurrido un error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err : null
    });
});

const port = config.port;

const database = require('./config/database');

app.listen(port, async () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${port}`);
    console.log(`📁 Vistas en: ${config.views.path}`);
    console.log(`📦 Archivos estáticos en: ${config.static.path}`);
    try {
        await database.connect();
        console.log('✅ Base de datos inicializada correctamente');
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error.message);
    }
});

process.on('uncaughtException', (err) => {
    console.error('❌ Error no manejado:', err.message);
    console.error('📝 Stack trace:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rechazada:', reason);
});

module.exports = app;