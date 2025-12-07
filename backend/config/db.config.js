// /config/db.config.js
module.exports = {
    HOST: 'localhost',
    USER: 'root', // User MySQL của bạn
    PASSWORD: '12345678', // Password MySQL của bạn
    DB: 'smart_task_db', // Tên database từ file SQL
    dialect: 'mysql',
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
};