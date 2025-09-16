const express = require('express');

class Router {
    constructor() {
        this.router = express.Router();
    }

    resource(path, controller) {
        this.router.get(`/${path}`, (req, res) => controller.index(req, res));
        
        this.router.get(`/${path}/crear`, (req, res) => controller.create(req, res));
        
        this.router.post(`/${path}`, (req, res) => controller.store(req, res));
        
        this.router.get(`/${path}/:id`, (req, res) => controller.show(req, res));
        
        this.router.get(`/${path}/:id/editar`, (req, res) => controller.edit(req, res));
        
        this.router.put(`/${path}/:id`, (req, res) => controller.update(req, res));
        
        this.router.delete(`/${path}/:id`, (req, res) => controller.destroy(req, res));

        return this;
    }

    get(path, handler) {
        this.router.get(path, handler);
        return this;
    }

    post(path, handler) {
        this.router.post(path, handler);
        return this;
    }

    put(path, handler) {
        this.router.put(path, handler);
        return this;
    }

    delete(path, handler) {
        this.router.delete(path, handler);
        return this;
    }

    getRouter() {
        return this.router;
    }
}

module.exports = Router;