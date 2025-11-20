// /routes/dashboard.routes.js
const controller = require('../controllers/dashboard.controller');
const authJwt = require('../middleware/authJwt');

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            'Access-Control-Allow-Headers',
            'Authorization, Origin, Content-Type, Accept'
        );
        next();
    });

    // API lấy thống kê cho Dashboard
    app.get(
        '/api/dashboard/stats',
        [authJwt.verifyToken], // Yêu cầu đăng nhập
        controller.getStats
    );

    app.get('/api/dashboard/gantt', [authJwt.verifyToken], controller.getGanttTasks);
};