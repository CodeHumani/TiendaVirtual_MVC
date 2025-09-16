-- Tabla: categoria
CREATE TABLE categoria (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE
);
-- Tabla: producto
CREATE TABLE producto (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    cantidad INTEGER NOT NULL,
    descripcion VARCHAR(255),
    imagen VARCHAR(255)
);
-- Tabla: producto_categoria (tabla intermedia para relación muchos a muchos)
CREATE TABLE producto_categoria (
    producto_id INTEGER NOT NULL,
    categoria_id INTEGER NOT NULL,
    PRIMARY KEY (producto_id, categoria_id),
    FOREIGN KEY (producto_id) REFERENCES producto(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categoria(id) ON DELETE CASCADE
);
-- Tabla: cliente
CREATE TABLE cliente (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    celular VARCHAR(20) UNIQUE,
    correo VARCHAR(255) UNIQUE
);
-- Tabla: venta
CREATE TABLE venta (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    cantidad INTEGER NOT NULL DEFAULT 1,
    total_a_pagar DECIMAL(10,2) NOT NULL,
    cambio DECIMAL(10,2) DEFAULT 0.00,
    total_pagado DECIMAL(10,2) NOT NULL,
    estado_pago VARCHAR(50) DEFAULT 'pendiente',
    FOREIGN KEY (cliente_id) REFERENCES cliente(id)
);
-- Tabla: detalle_venta
CREATE TABLE detalle_venta (
    producto_id INTEGER NOT NULL,
    venta_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    subtotal DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (producto_id, venta_id),
    FOREIGN KEY (producto_id) REFERENCES producto(id) ON DELETE CASCADE,
    FOREIGN KEY (venta_id) REFERENCES venta(id) ON DELETE CASCADE
);

-- ========================================
-- DATOS DE EJEMPLO
-- ========================================

-- INSERT para tabla categoria
INSERT INTO categoria (nombre) VALUES 
('Electrónicos'),
('Ropa'),
('Hogar y Jardín'),
('Deportes'),
('Libros'),
('Juguetes'),
('Alimentación'),
('Belleza y Cuidado Personal');

-- INSERT para tabla producto
INSERT INTO producto (nombre, precio, cantidad, descripcion, imagen) VALUES 
('Smartphone Samsung Galaxy A54', 2500.00, 15, 'Teléfono inteligente con pantalla AMOLED de 6.4 pulgadas', 'samsung_a54.jpg'),
('Laptop HP Pavilion 15', 4200.00, 8, 'Laptop con procesador Intel i5, 8GB RAM, 512GB SSD', 'hp_pavilion.jpg'),
('Camiseta Nike Dri-FIT', 180.00, 25, 'Camiseta deportiva de secado rápido', 'nike_shirt.jpg'),
('Jeans Levis 501', 320.00, 20, 'Jeans clásicos de corte recto', 'levis_jeans.jpg'),
('Cafetera Oster', 450.00, 12, 'Cafetera automática de 12 tazas', 'cafetera_oster.jpg'),
('Set de Cuchillos', 280.00, 18, 'Set de 6 cuchillos de acero inoxidable', 'set_cuchillos.jpg'),
('Pelota de Fútbol Adidas', 150.00, 30, 'Pelota oficial FIFA de cuero sintético', 'pelota_adidas.jpg'),
('Raqueta de Tenis Wilson', 650.00, 10, 'Raqueta profesional de grafito', 'raqueta_wilson.jpg'),
('El Principito', 85.00, 40, 'Novela clásica de Antoine de Saint-Exupéry', 'principito.jpg'),
('Diccionario Español RAE', 120.00, 15, 'Diccionario oficial de la lengua española', 'diccionario_rae.jpg'),
('LEGO City Estación de Policía', 890.00, 6, 'Set de construcción de 743 piezas', 'lego_policia.jpg'),
('Muñeca Barbie Dreamhouse', 420.00, 12, 'Muñeca con casa de ensueño', 'barbie_house.jpg'),
('Aceite de Oliva Extra Virgen 500ml', 45.00, 50, 'Aceite de oliva premium importado', 'aceite_oliva.jpg'),
('Miel de Abeja Natural 250g', 35.00, 30, 'Miel pura de flores silvestres', 'miel_natural.jpg'),
('Crema Facial L Oréal', 185.00, 22, 'Crema hidratante anti-edad', 'crema_loreal.jpg'),
('Champú Pantene Pro-V', 95.00, 35, 'Champú reparación total 400ml', 'champu_pantene.jpg');

-- INSERT para tabla producto_categoria (relaciones muchos a muchos)
INSERT INTO producto_categoria (producto_id, categoria_id) VALUES 
-- Electrónicos
(1, 1), -- Samsung Galaxy A54
(2, 1), -- Laptop HP
-- Ropa
(3, 2), -- Camiseta Nike
(4, 2), -- Jeans Levi's
-- Hogar y Jardín
(5, 3), -- Cafetera
(6, 3), -- Set de Cuchillos
-- Deportes
(7, 4), -- Pelota de Fútbol
(8, 4), -- Raqueta de Tenis
(3, 4), -- Camiseta Nike (también deportes)
-- Libros
(9, 5), -- El Principito
(10, 5), -- Diccionario
-- Juguetes
(11, 6), -- LEGO
(12, 6), -- Barbie
-- Alimentación
(13, 7), -- Aceite de Oliva
(14, 7), -- Miel
-- Belleza y Cuidado Personal
(15, 8), -- Crema L'Oréal
(16, 8); -- Champú Pantene

-- INSERT para tabla cliente
INSERT INTO cliente (nombre, celular, correo) VALUES 
('María González', '75123456', 'maria.gonzalez@email.com'),
('Carlos Rodríguez', '76234567', 'carlos.rodriguez@email.com'),
('Ana López', '77345678', 'ana.lopez@email.com'),
('José Martínez', '78456789', 'jose.martinez@email.com'),
('Laura Sánchez', '79567890', 'laura.sanchez@email.com'),
('Pedro Ramírez', '75678901', 'pedro.ramirez@email.com'),
('Carmen Flores', '76789012', 'carmen.flores@email.com'),
('Miguel Torres', '77890123', 'miguel.torres@email.com'),
('Isabel Vargas', '78901234', 'isabel.vargas@email.com'),
('Roberto Cruz', '79012345', 'roberto.cruz@email.com');

-- INSERT para tabla venta
INSERT INTO venta (cliente_id, fecha, cantidad, total_a_pagar, cambio, total_pagado, estado_pago) VALUES 
(1, '2024-09-10', 2, 2680.00, 20.00, 2700.00, 'pagado'),
(2, '2024-09-11', 1, 450.00, 50.00, 500.00, 'pagado'),
(3, '2024-09-12', 3, 645.00, 5.00, 650.00, 'pagado'),
(4, '2024-09-12', 1, 890.00, 10.00, 900.00, 'pagado'),
(5, '2024-09-13', 2, 275.00, 25.00, 300.00, 'pagado'),
(6, '2024-09-13', 1, 2500.00, 0.00, 2500.00, 'pagado'),
(7, '2024-09-14', 4, 355.00, 45.00, 400.00, 'pagado'),
(8, '2024-09-14', 1, 650.00, 0.00, 600.00, 'pendiente'),
(9, '2024-09-14', 2, 605.00, 95.00, 700.00, 'pagado'),
(10, '2024-09-14', 1, 185.00, 15.00, 200.00, 'pagado');

-- INSERT para tabla detalle_venta
INSERT INTO detalle_venta (producto_id, venta_id, cantidad, subtotal) VALUES 
-- Venta 1: Samsung Galaxy + Camiseta Nike
(1, 1, 1, 2500.00), -- Samsung Galaxy A54
(3, 1, 1, 180.00),  -- Camiseta Nike
-- Venta 2: Cafetera
(5, 2, 1, 450.00),  -- Cafetera Oster
-- Venta 3: Jeans + Pelota + Set Cuchillos
(4, 3, 1, 320.00),  -- Jeans Levi's
(7, 3, 1, 150.00),  -- Pelota de Fútbol
(6, 3, 1, 280.00),  -- Set de Cuchillos (cantidad corregida)
-- Venta 4: LEGO
(11, 4, 1, 890.00), -- LEGO City
-- Venta 5: El Principito + Champú
(9, 5, 2, 170.00),  -- El Principito (2 unidades)
(16, 5, 1, 95.00),  -- Champú Pantene (cantidad corregida)
-- Venta 6: Samsung Galaxy
(1, 6, 1, 2500.00), -- Samsung Galaxy A54
-- Venta 7: Aceite + Miel + Champú + Crema
(13, 7, 2, 90.00),  -- Aceite de Oliva (2 unidades)
(14, 7, 1, 35.00),  -- Miel
(16, 7, 1, 95.00),  -- Champú Pantene
(15, 7, 1, 185.00), -- Crema L'Oréal (cantidad corregida)
-- Venta 8: Raqueta de Tenis
(8, 8, 1, 650.00),  -- Raqueta Wilson
-- Venta 9: Barbie + Crema
(12, 9, 1, 420.00), -- Barbie
(15, 9, 1, 185.00), -- Crema L'Oréal
-- Venta 10: Crema L'Oréal
(15, 10, 1, 185.00); -- Crema L'Oréal
-- INSERT para tabla categoria
INSERT INTO categoria (nombre) VALUES 
('Electrónicos'),
('Ropa'),
('Hogar y Jardín'),
('Deportes'),
('Libros'),
('Juguetes'),
('Alimentación'),
('Belleza y Cuidado Personal');
-- INSERT para tabla producto
INSERT INTO producto (nombre, precio, cantidad, descripción, imagen) VALUES 
('Smartphone Samsung Galaxy A54', 2500.00, 15, 'Teléfono inteligente con pantalla AMOLED de 6.4 pulgadas', 'samsung_a54.jpg'),
('Laptop HP Pavilion 15', 4200.00, 8, 'Laptop con procesador Intel i5, 8GB RAM, 512GB SSD', 'hp_pavilion.jpg'),
('Camiseta Nike Dri-FIT', 180.00, 25, 'Camiseta deportiva de secado rápido', 'nike_shirt.jpg'),
('Jeans Levis 501', 320.00, 20, 'Jeans clásicos de corte recto', 'levis_jeans.jpg'),
('Cafetera Oster', 450.00, 12, 'Cafetera automática de 12 tazas', 'cafetera_oster.jpg'),
('Set de Cuchillos', 280.00, 18, 'Set de 6 cuchillos de acero inoxidable', 'set_cuchillos.jpg'),
('Pelota de Fútbol Adidas', 150.00, 30, 'Pelota oficial FIFA de cuero sintético', 'pelota_adidas.jpg'),
('Raqueta de Tenis Wilson', 650.00, 10, 'Raqueta profesional de grafito', 'raqueta_wilson.jpg'),
('El Principito', 85.00, 40, 'Novela clásica de Antoine de Saint-Exupéry', 'principito.jpg'),
('Diccionario Español RAE', 120.00, 15, 'Diccionario oficial de la lengua española', 'diccionario_rae.jpg'),
('LEGO City Estación de Policía', 890.00, 6, 'Set de construcción de 743 piezas', 'lego_policia.jpg'),
('Muñeca Barbie Dreamhouse', 420.00, 12, 'Muñeca con casa de ensueño', 'barbie_house.jpg'),
('Aceite de Oliva Extra Virgen 500ml', 45.00, 50, 'Aceite de oliva premium importado', 'aceite_oliva.jpg'),
('Miel de Abeja Natural 250g', 35.00, 30, 'Miel pura de flores silvestres', 'miel_natural.jpg'),
('Crema Facial L''Oréal', 185.00, 22, 'Crema hidratante anti-edad', 'crema_loreal.jpg'),
('Champú Pantene Pro-V', 95.00, 35, 'Champú reparación total 400ml', 'champu_pantene.jpg');
-- INSERT para tabla producto_categoria (relaciones muchos a muchos)
INSERT INTO producto_categoria (producto_id, categoria_id) VALUES 
-- Electrónicos
(1, 1), -- Samsung Galaxy A54
(2, 1), -- Laptop HP
-- Ropa
(3, 2), -- Camiseta Nike
(4, 2), -- Jeans Levi's
-- Hogar y Jardín
(5, 3), -- Cafetera
(6, 3), -- Set de Cuchillos
-- Deportes
(7, 4), -- Pelota de Fútbol
(8, 4), -- Raqueta de Tenis
(3, 4), -- Camiseta Nike (también deportes)
-- Libros
(9, 5), -- El Principito
(10, 5), -- Diccionario
-- Juguetes
(11, 6), -- LEGO
(12, 6), -- Barbie
-- Alimentación
(13, 7), -- Aceite de Oliva
(14, 7), -- Miel
-- Belleza y Cuidado Personal
(15, 8), -- Crema L'Oréal
(16, 8); -- Champú Pantene

-- INSERT para tabla cliente
INSERT INTO cliente (nombre, celular, correo) VALUES 
('María González', '75123456', 'maria.gonzalez@email.com'),
('Carlos Rodríguez', '76234567', 'carlos.rodriguez@email.com'),
('Ana López', '77345678', 'ana.lopez@email.com'),
('José Martínez', '78456789', 'jose.martinez@email.com'),
('Laura Sánchez', '79567890', 'laura.sanchez@email.com'),
('Pedro Ramírez', '75678901', 'pedro.ramirez@email.com'),
('Carmen Flores', '76789012', 'carmen.flores@email.com'),
('Miguel Torres', '77890123', 'miguel.torres@email.com'),
('Isabel Vargas', '78901234', 'isabel.vargas@email.com'),
('Roberto Cruz', '79012345', 'roberto.cruz@email.com');

-- INSERT para tabla venta (CORREGIDO - solo columnas que existen en la tabla)
INSERT INTO venta (cliente_id, fecha, cantidad, total_a_pagar, cambio, total_pagado, estado_pago) VALUES 
(1, '2024-09-10', 2, 2680.00, 20.00, 2700.00, 'pagado'),
(2, '2024-09-11', 1, 450.00, 50.00, 500.00, 'pagado'),
(3, '2024-09-12', 3, 645.00, 5.00, 650.00, 'pagado'),
(4, '2024-09-12', 1, 890.00, 10.00, 900.00, 'pagado'),
(5, '2024-09-13', 2, 275.00, 25.00, 300.00, 'pagado'),
(6, '2024-09-13', 1, 2500.00, 0.00, 2500.00, 'pagado'),
(7, '2024-09-14', 4, 355.00, 45.00, 400.00, 'pagado'),
(8, '2024-09-14', 1, 650.00, 0.00, 600.00, 'pendiente'),
(9, '2024-09-14', 2, 605.00, 95.00, 700.00, 'pagado'),
(10, '2024-09-14', 1, 185.00, 15.00, 200.00, 'pagado');

-- INSERT para tabla detalle_venta
INSERT INTO detalle_venta (producto_id, venta_id, cantidad, subtotal) VALUES 
-- Venta 1: Samsung Galaxy + Camiseta Nike
(1, 1, 1, 2500.00), -- Samsung Galaxy A54
(3, 1, 1, 180.00),  -- Camiseta Nike
-- Venta 2: Cafetera
(5, 2, 1, 450.00),  -- Cafetera Oster
-- Venta 3: Jeans + Pelota + Set Cuchillos
(4, 3, 1, 320.00),  -- Jeans Levi's
(7, 3, 1, 150.00),  -- Pelota de Fútbol
(6, 3, 1, 280.00),  -- Set de Cuchillos (cantidad corregida)
-- Venta 4: LEGO
(11, 4, 1, 890.00), -- LEGO City
-- Venta 5: El Principito + Champú
(9, 5, 2, 170.00),  -- El Principito (2 unidades)
(16, 5, 1, 95.00),  -- Champú Pantene (cantidad corregida)
-- Venta 6: Samsung Galaxy
(1, 6, 1, 2500.00), -- Samsung Galaxy A54
-- Venta 7: Aceite + Miel + Champú + Crema
(13, 7, 2, 90.00),  -- Aceite de Oliva (2 unidades)
(14, 7, 1, 35.00),  -- Miel
(16, 7, 1, 95.00),  -- Champú Pantene
(15, 7, 1, 185.00), -- Crema L'Oréal (cantidad corregida)
-- Venta 8: Raqueta de Tenis
(8, 8, 1, 650.00),  -- Raqueta Wilson
-- Venta 9: Barbie + Crema
(12, 9, 1, 420.00), -- Barbie
(15, 9, 1, 185.00), -- Crema L'Oréal
-- Venta 10: Crema L'Oréal
(15, 10, 1, 185.00); -- Crema L'Oréal
