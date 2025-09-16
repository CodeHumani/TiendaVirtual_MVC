const Controller = require('../core/Controller');
const ProductoModel = require('../modelo/ProductoModel');
const CategoriaModel = require('../modelo/CategoriaModel');
const ClienteModel = require('../modelo/ClienteModel');
const config = require('../config/app');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class CatalogoController extends Controller {
    constructor() {
        super();
        this.productoModel = new ProductoModel();
        this.categoriaModel = new CategoriaModel();
        this.clienteModel = new ClienteModel();
    }

    async index(req, res) {
        try {
            const search = req.query.search || '';
            let clientes;
            if (search) {
                clientes = await this.clienteModel.search(search);
            } else {
                clientes = await this.clienteModel.getAll();
            }
            res.render('catalogo/index', {
                title: 'Catálogo - Seleccionar Cliente',
                clientes,
                search
            });
        } catch (error) {
            console.error('Error al mostrar lista de clientes para catálogo:', error);
            req.flash('error', 'Error al cargar la lista de clientes');
            res.redirect('/dashboard');
        }
    }

    async productos(req, res) {
        try {
            const clienteId = req.params.clienteId;
            const cliente = await this.clienteModel.getById(clienteId);
            if (!cliente) {
                req.flash('error', 'Cliente no encontrado');
                return res.redirect('/catalogo');
            }

            // Parámetros de filtro/orden/paginación
            const buscar = (req.query.buscar || '').toString();
            const categoriaParam = (req.query.categoria || req.query.categoria_id || '').toString();
            const sortBy = (req.query.sort || 'nombre_asc').toString();
            const page = Math.max(parseInt(req.query.page) || 1, 1);
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 60);

            // Mapear filtros hacia el modelo
            const filtros = {};
            if (buscar) filtros.buscar = buscar;
            if (categoriaParam) filtros.categoria_id = parseInt(categoriaParam);
            const categorias = await this.categoriaModel.getAll();
            const productosFiltrados = await this.productoModel.obtenerConFiltros(filtros, sortBy);
            const totalProductos = productosFiltrados.length;
            const totalPages = Math.max(Math.ceil(totalProductos / limit), 1);
            const currentPage = Math.min(page, totalPages);
            const offset = (currentPage - 1) * limit;
            const productos = productosFiltrados.slice(offset, offset + limit);
            res.render('catalogo/productos', {
                title: `Catálogo para ${cliente.nombre}`,
                cliente,
                productos,
                categorias,
                filtros: { buscar },
                search: buscar,
                categoriaId: filtros.categoria_id || '',
                sortBy,
                currentPage,
                totalPages,
                totalProductos,
                limit
            });
        } catch (error) {
            console.error('Error al mostrar productos del catálogo:', error);
            req.flash('error', 'Error al cargar los productos del catálogo');
            res.redirect('/catalogo');
        }
    }

    async enviarWhatsApp(req, res) {
        try {
            const { clienteId, productos: productosSeleccionados } = req.body;
            const cliente = await this.clienteModel.getById(clienteId);
            if (!cliente) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente no encontrado'
                });
            }
            if (!this.clienteModel.isValidWhatsAppNumber(cliente.celular)) {
                return res.status(400).json({
                    success: false,
                    message: `El número de celular del cliente (${cliente.celular}) no es válido para WhatsApp`
                });
            }
            if (!productosSeleccionados || productosSeleccionados.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe seleccionar al menos un producto'
                });
            }
            const productos = [];
            for (const productoId of productosSeleccionados) {
                const producto = await this.productoModel.getById(productoId);
                if (producto) {
                    productos.push(producto);
                }
            }
            if (productos.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No se encontraron productos válidos'
                });
            }
            const mensaje = this.crearMensajeCatalogoWhatsApp(cliente, productos);
            const numeroDestino = this.clienteModel.formatPhoneForWhatsApp(cliente.celular);
            if (!numeroDestino) {
                return res.status(400).json({
                    success: false,
                    message: 'No se pudo procesar el número de WhatsApp del cliente'
                });
            }
            const urlWhatsApp = `https://wa.me/${numeroDestino}?text=${encodeURIComponent(mensaje)}`;
            res.json({
                success: true,
                url: urlWhatsApp,
                mensaje: mensaje,
                numeroWhatsApp: numeroDestino
            });
        } catch (error) {
            console.error('💥 Error al enviar catálogo por WhatsApp:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al enviar catálogo por WhatsApp'
            });
        }
    }

    async enviarWhatsAppConPDF(req, res) {
        try {
            const { clienteId, productos: productosSeleccionadosRaw } = req.body;
            let productosSeleccionados;
            if (typeof productosSeleccionadosRaw === 'string') {
                productosSeleccionados = JSON.parse(productosSeleccionadosRaw);
            } else {
                productosSeleccionados = productosSeleccionadosRaw;
            }
            const cliente = await this.clienteModel.getById(clienteId);
            if (!cliente) {
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }
            if (!this.clienteModel.isValidWhatsAppNumber(cliente.celular)) {
                return res.status(400).json({
                    success: false,
                    message: `El número de celular del cliente (${cliente.celular}) no es válido para WhatsApp`
                });
            }
            if (!productosSeleccionados || productosSeleccionados.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Debe seleccionar al menos un producto'
                });
            }
            const productos = [];
            for (const productoId of productosSeleccionados) {
                const id = parseInt(productoId);
                if (!isNaN(id)) {
                    const producto = await this.productoModel.getById(id);
                    if (producto) {
                        if (producto.imagen) {
                            try {
                                const imagePath = path.join(__dirname, '..', 'public', 'uploads', 'productos', producto.imagen);
                                if (fs.existsSync(imagePath)) {
                                    const imageBuffer = fs.readFileSync(imagePath);
                                    const imageExtension = path.extname(producto.imagen).toLowerCase();
                                    let mimeType = 'image/jpeg';

                                    if (imageExtension === '.png') {
                                        mimeType = 'image/png';
                                    } else if (imageExtension === '.gif') {
                                        mimeType = 'image/gif';
                                    } else if (imageExtension === '.webp') {
                                        mimeType = 'image/webp';
                                    }

                                    producto.imagenBase64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
                                }
                            } catch (error) {
                                console.error(`❌ Error al convertir imagen ${producto.imagen}:`, error);
                            }
                        }
                        productos.push(producto);
                    }
                }
            }
            if (productos.length === 0) {
                return res.status(400).json({ success: false, message: 'No se encontraron productos válidos' });
            }
            const htmlContent = await new Promise((resolve, reject) => {
                res.render('pdf/catalogo-basico', {
                    cliente,
                    productos,
                    layout: false
                }, (err, html) => {
                    if (err) reject(err);
                    else resolve(html);
                });
            });
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'networkidle2' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true
            });
            await browser.close();
            const fechaActual = new Date().toISOString().slice(0, 10);
            const nombreArchivo = `Catalogo_${cliente.nombre.replace(/\s+/g, '_')}_${fechaActual}_${Date.now()}.pdf`;
            const rutaArchivo = path.join(__dirname, '..', 'public', 'temp', nombreArchivo);
            fs.writeFileSync(rutaArchivo, pdfBuffer);
            const urlPDF = `${req.protocol}://${req.get('host')}/temp/${nombreArchivo}`;
            const mensaje = this.crearMensajeWhatsAppConPDF(cliente, productos, urlPDF);
            const numeroDestino = this.clienteModel.formatPhoneForWhatsApp(cliente.celular);
            if (!numeroDestino) {
                return res.status(400).json({
                    success: false,
                    message: 'No se pudo procesar el número de WhatsApp del cliente'
                });
            }
            const urlWhatsApp = `https://wa.me/${numeroDestino}?text=${encodeURIComponent(mensaje)}`;
            res.json({
                success: true,
                url: urlWhatsApp,
                mensaje: mensaje,
                numeroWhatsApp: numeroDestino,
                pdfUrl: urlPDF,
                pdfFilename: nombreArchivo,
                pdfLocalPath: rutaArchivo
            });
        } catch (error) {
            console.error('❌ Error al enviar catálogo con PDF por WhatsApp:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Método auxiliar para crear mensaje de catálogo para WhatsApp
    crearMensajeCatalogoWhatsApp(cliente, productos) {
        const fecha = new Date().toLocaleDateString('es-GT');
        let mensaje = `🛍️ *CATÁLOGO PERSONALIZADO*\n\n`;
        mensaje += `Hola *${cliente.nombre}*! 👋\n\n`;
        mensaje += `Te enviamos nuestro catálogo con ${productos.length} productos seleccionados especialmente para ti:\n\n`;
        productos.forEach((producto, index) => {
            mensaje += `${index + 1}. *${producto.nombre}*\n`;
            mensaje += `   💰 $${parseFloat(producto.precio || 0).toLocaleString()}\n`;
            if (producto.descripcion && producto.descripcion.trim() !== '') {
                const descripcionCorta = producto.descripcion.length > 50
                    ? producto.descripcion.substring(0, 50) + '...'
                    : producto.descripcion;
                mensaje += `   📝 ${descripcionCorta}\n`;
            }
            const stock = producto.stock || producto.cantidad || 0;
            if (stock > 0) {
                mensaje += `   ✅ Disponible (${stock} unidades)\n`;
            } else {
                mensaje += `   ⚠️ Consultar disponibilidad\n`;
            }
            mensaje += `\n`;
        });
        const total = productos.reduce((sum, p) => sum + parseFloat(p.precio || 0), 0);
        mensaje += `💵 *Valor total:* $${total.toLocaleString()}\n\n`;
        mensaje += `✨ *Productos de Calidad y Seguros* ✨\n\n`;
        mensaje += `📱 Responde a este mensaje para hacer tu pedido\n`;
        mensaje += `📅 Catálogo generado: ${fecha}`;
        return mensaje;
    }

    crearMensajeWhatsAppConPDF(cliente, productos, urlPDF) {
        const fecha = new Date().toLocaleDateString('es-GT');
        let mensaje = `🛍️ *CATÁLOGO PERSONALIZADO*\n\n`;
        mensaje += `Hola *${cliente.nombre}*! 👋\n\n`;
        mensaje += `Te enviamos nuestro catálogo con ${productos.length} productos seleccionados especialmente para ti:\n\n`;
        productos.forEach((producto, index) => {
            mensaje += `${index + 1}. *${producto.nombre}*\n`;
            mensaje += `   💰 $${parseFloat(producto.precio || 0).toLocaleString()}\n`;
            if (producto.descripcion && producto.descripcion.trim() !== '') {
                const descripcionCorta = producto.descripcion.length > 50
                    ? producto.descripcion.substring(0, 50) + '...'
                    : producto.descripcion;
                mensaje += `   📝 ${descripcionCorta}\n`;
            }
            const stock = producto.stock || producto.cantidad || 0;
            if (stock > 0) {
                mensaje += `   ✅ Disponible (${stock} unidades)\n`;
            } else {
                mensaje += `   ⚠️ Consultar disponibilidad\n`;
            }
            mensaje += `\n`;
        });
        const total = productos.reduce((sum, p) => sum + parseFloat(p.precio || 0), 0);
        mensaje += `💵 *Valor total:* $${total.toLocaleString()}\n\n`;
        mensaje += `📄 *CATÁLOGO PDF DISPONIBLE*\n`;
        mensaje += `Puedes ver o descargar el catálogo completo en PDF aquí:\n\n${urlPDF}\n\n`;
        mensaje += `✨ *Productos de Calidad y Seguros* ✨\n\n`;
        mensaje += `📱 Responde a este mensaje para:\n`;
        mensaje += `• Hacer tu pedido\n`;
        mensaje += `• Solicitar el catálogo PDF con imágenes\n`;
        mensaje += `• Consultar disponibilidad\n\n`;
        mensaje += `📅 Catálogo generado: ${fecha}`;
        return mensaje;
    }

    async generarPDF(req, res) {
        try {
            const { clienteId, productos: productosSeleccionadosRaw } = req.body;
            let productosSeleccionados;
            if (typeof productosSeleccionadosRaw === 'string') {
                productosSeleccionados = JSON.parse(productosSeleccionadosRaw);
            } else {
                productosSeleccionados = productosSeleccionadosRaw;
            }
            const cliente = await this.clienteModel.getById(clienteId);
            if (!cliente) {
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }
            const productos = [];
            for (const productoId of productosSeleccionados) {
                const id = parseInt(productoId);
                if (!isNaN(id)) {
                    const producto = await this.productoModel.getById(id);
                    if (producto) {
                        if (producto.imagen) {
                            try {
                                const imagePath = path.join(__dirname, '..', 'public', 'uploads', 'productos', producto.imagen);
                                if (fs.existsSync(imagePath)) {
                                    const imageBuffer = fs.readFileSync(imagePath);
                                    const imageExtension = path.extname(producto.imagen).toLowerCase();
                                    let mimeType = 'image/jpeg';

                                    if (imageExtension === '.png') {
                                        mimeType = 'image/png';
                                    } else if (imageExtension === '.gif') {
                                        mimeType = 'image/gif';
                                    } else if (imageExtension === '.webp') {
                                        mimeType = 'image/webp';
                                    }

                                    producto.imagenBase64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
                                }
                            } catch (error) {
                                console.error(`❌ Error al convertir imagen ${producto.imagen}:`, error);
                            }
                        }
                        productos.push(producto);
                    }
                }
            }
            if (productos.length === 0) {
                return res.status(400).json({ success: false, message: 'No se encontraron productos válidos' });
            }
            const htmlContent = await new Promise((resolve, reject) => {
                res.render('pdf/catalogo-basico', {
                    cliente,
                    productos,
                    layout: false
                }, (err, html) => {
                    if (err) reject(err);
                    else resolve(html);
                });
            });
            let browser;
            try {
                browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                const page = await browser.newPage();
                await page.setContent(htmlContent, { waitUntil: 'networkidle2' });
                const pdfBuffer = await page.pdf({
                    format: 'A4',
                    printBackground: true,
                    margin: {
                        top: '20px',
                        right: '20px',
                        bottom: '20px',
                        left: '20px'
                    }
                });
                await browser.close();
                if (!pdfBuffer || pdfBuffer.length === 0) {
                    throw new Error('PDF buffer vacío');
                }
                const pdfHeader = pdfBuffer.slice(0, 4).toString();
                if (pdfHeader !== '%PDF') {
                    throw new Error('Buffer generado no es un PDF válido');
                }
                console.log('✅ PDF generado correctamente:', {
                    tamaño: `${Math.round(pdfBuffer.length / 1024)}KB`,
                    productos: productos.length,
                    cliente: cliente.nombre
                });
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="Catalogo_${cliente.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf"`);
                res.setHeader('Content-Length', pdfBuffer.length);
                res.end(pdfBuffer, 'binary');
            } catch (puppeteerError) {
                console.error('❌ Error en Puppeteer:', puppeteerError);
                if (browser) {
                    await browser.close();
                }
                return res.status(500).json({
                    success: false,
                    message: 'Error al generar el PDF con Puppeteer'
                });
            }
        } catch (error) {
            console.error('💥 Error al generar PDF del catálogo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al generar el PDF'
            });
        }
    }

    async generarPDFEstatico(req, res) {
        try {
            const { clienteId, productos: productosSeleccionadosRaw } = req.body;
            let productosSeleccionados;
            if (typeof productosSeleccionadosRaw === 'string') {
                productosSeleccionados = JSON.parse(productosSeleccionadosRaw);
            } else {
                productosSeleccionados = productosSeleccionadosRaw;
            }
            const cliente = await this.clienteModel.getById(clienteId);
            if (!cliente) {
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }
            const productos = [];
            for (const productoId of productosSeleccionados) {
                const id = parseInt(productoId);
                if (!isNaN(id)) {
                    const producto = await this.productoModel.getById(id);
                    if (producto) {
                        if (producto.imagen) {
                            try {
                                const imagePath = path.join(__dirname, '..', 'public', 'uploads', 'productos', producto.imagen);
                                if (fs.existsSync(imagePath)) {
                                    const imageBuffer = fs.readFileSync(imagePath);
                                    const imageExtension = path.extname(producto.imagen).toLowerCase();
                                    let mimeType = 'image/jpeg';

                                    if (imageExtension === '.png') {
                                        mimeType = 'image/png';
                                    } else if (imageExtension === '.gif') {
                                        mimeType = 'image/gif';
                                    } else if (imageExtension === '.webp') {
                                        mimeType = 'image/webp';
                                    }
                                    producto.imagenBase64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
                                }
                            } catch (error) {
                                console.error(`❌ Error al convertir imagen ${producto.imagen}:`, error);
                            }
                        }
                        productos.push(producto);
                    }
                }
            }
            if (productos.length === 0) {
                return res.status(400).json({ success: false, message: 'No se encontraron productos válidos' });
            }
            const htmlContent = await new Promise((resolve, reject) => {
                res.render('pdf/catalogo-basico', {
                    cliente,
                    productos,
                    layout: false
                }, (err, html) => {
                    if (err) reject(err);
                    else resolve(html);
                });
            });
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'networkidle2' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true
            });
            await browser.close();
            const fechaActual = new Date().toISOString().slice(0, 10);
            const nombreArchivo = `Catalogo_${cliente.nombre.replace(/\s+/g, '_')}_${fechaActual}_${Date.now()}.pdf`;
            const rutaArchivo = path.join(__dirname, '..', 'public', 'temp', nombreArchivo);
            fs.writeFileSync(rutaArchivo, pdfBuffer);
            res.json({
                success: true,
                downloadUrl: `/temp/${nombreArchivo}`,
                filename: nombreArchivo
            });
        } catch (error) {
            console.error('❌ Error generando PDF estático:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async testPDF(req, res) {
        try {
            const htmlSimple = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Test PDF</title>
                </head>
                <body>
                    <h1>PDF de Prueba</h1>
                    <p>Fecha: ${new Date().toLocaleString()}</p>
                    <p>Este es un PDF de prueba para verificar la funcionalidad básica.</p>
                </body>
                </html>
            `;
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(htmlSimple);
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true
            });
            await browser.close();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="test.pdf"');
            res.end(pdfBuffer);
        } catch (error) {
            console.error('❌ Error en PDF de prueba:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async mostrarInstruccionesPDF(req, res) {
        try {
            const { pdfPath, clienteNombre, numeroWhatsApp } = req.query;
            res.render('catalogo/instrucciones-pdf', {
                title: 'Instrucciones para enviar PDF',
                pdfPath,
                clienteNombre,
                numeroWhatsApp,
                layout: 'layout'
            });
        } catch (error) {
            console.error('❌ Error al mostrar instrucciones:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = CatalogoController;