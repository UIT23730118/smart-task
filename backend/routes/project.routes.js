// /routes/project.routes.js
const controller = require('../controllers/project.controller');
const authJwt = require('../middleware/authJwt');

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            'Access-Control-Allow-Headers',
            'Authorization, Origin, Content-Type, Accept'
        );
        next();
    });

    // Tạo project mới (chỉ global leader)
    app.post(
        '/api/projects',
        [authJwt.verifyToken, authJwt.isLeader],
        controller.createProject
    );

    // Lấy tất cả project của tôi
    app.get(
        '/api/projects',
        [authJwt.verifyToken],
        controller.getMyProjects
    );

    // Lấy chi tiết 1 project
    app.get(
        '/api/projects/:id',
        [authJwt.verifyToken],
        controller.getProjectDetails
    );

    // --- API Quản lý Thành viên (Chức năng 7) ---

    // Thêm 1 member (dựa trên email)
    app.post(
        '/api/projects/:id/members',
        [authJwt.verifyToken, authJwt.isLeader], // (Nên thêm check isProjectLeader)
        controller.addMember
    );

    // Xóa 1 member
    app.delete(
        '/api/projects/:id/members/:userId',
        [authJwt.verifyToken, authJwt.isLeader], // (Nên thêm check isProjectLeader)
        controller.removeMember
    );

    app.put(
        '/api/projects/:id',
        [authJwt.verifyToken, authJwt.isLeader], // Tốt nhất nên dùng authJwt.isProjectLeader
        controller.updateProject
    );
};