// /routes/user.routes.js

const userController = require('../controllers/user.controller');
const authJwt = require('../middleware/authJwt');
// Giả định bạn có middleware isLeader để kiểm tra vai trò

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            'Access-Control-Allow-Headers',
            'Authorization, Origin, Content-Type, Accept'
        );
        next();
    });

    // API Cập nhật Rules (Chỉ Leader mới được phép)
    // API: PUT /api/users/:userId/rules
    app.put(
        '/api/users/:id/rules',
        [authJwt.verifyToken, authJwt.isLeader],
        userController.updateAssignmentRules
    );

    // Route để cập nhật chuyên môn (Yêu cầu quyền Leader hoặc Admin)
    app.put(
        "/api/users/:id/expertise",
        [authJwt.verifyToken, authJwt.isLeader], // Sử dụng middleware kiểm tra quyền Leader
        userController.updateUserExpertise
    );

    app.get(
        "/api/users/:id/expertise",
        [authJwt.verifyToken],
        userController.getUserExpertise
    );

    // API Lấy Rules (Có thể dùng cho giao diện xem hồ sơ)
    // API: GET /api/users/:userId/rules
    app.get(
        '/api/users/:id/rules',
        [authJwt.verifyToken],
        userController.getAssignmentRules
    );
};