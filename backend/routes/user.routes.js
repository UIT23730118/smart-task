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
        '/api/users/:userId/rules',
        [authJwt.verifyToken, authJwt.isLeader], 
        userController.updateAssignmentRules
    );

    // API Lấy Rules (Có thể dùng cho giao diện xem hồ sơ)
    // API: GET /api/users/:userId/rules
    app.get(
        '/api/users/:userId/rules',
        [authJwt.verifyToken], 
        userController.getAssignmentRules
    );
};