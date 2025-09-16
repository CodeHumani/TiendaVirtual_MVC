require('dotenv').config();

const config = {
    port: process.env.PORT || 3000,
    
    database: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'tienda_virtual',
        port: process.env.DB_PORT || 3306
    },
    whatsapp: {
        sessionPath: process.env.WHATSAPP_SESSION_PATH || './whatsapp_session',
        businessPhone: process.env.WHATSAPP_BUSINESS_PHONE || '50278901234'
    },
    views: {
        engine: 'ejs',
        path: './vista'
    },
    static: {
        path: './public'
    }
};

module.exports = config;