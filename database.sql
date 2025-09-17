-- Tabla: categoria
CREATE TABLE categoria (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE
);
-- Tabla: producto (relación uno-a-muchos con categoria)
CREATE TABLE producto (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    cantidad INTEGER NOT NULL,
    descripcion VARCHAR(255),
    imagen VARCHAR(255),
    categoria_id INTEGER NOT NULL REFERENCES categoria(id) ON DELETE RESTRICT
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
