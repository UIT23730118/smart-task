// /routes/report.routes.js

const reportController = require('../controllers/report.controller');
const authJwt = require('../middleware/authJwt'); // Middleware xác thực

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            'Access-Control-Allow-Headers',
            'Authorization, Origin, Content-Type, Accept'
        );
        next();
    });

    // Định nghĩa API Xuất Report
    // API: GET /api/projects/:projectId/reports/workload
    app.get(
        '/api/projects/:projectId/reports/workload',
        // Chỉ cho phép người dùng đã đăng nhập (và nên là Leader)
        [authJwt.verifyToken /*, authJwt.isProjectLeader */], 
        reportController.exportWorkloadReport
    );
};