const controller = require('../controllers/project.controller');
const authJwt = require('../middleware/authJwt');

module.exports = function (app) {
    // Middleware áp dụng cho tất cả routes (CORS headers)
    app.use(function (req, res, next) {
        res.header(
            'Access-Control-Allow-Headers',
            'Authorization, Origin, Content-Type, Accept'
        );
        next();
    });

    // =========================================================
    // CÁC ROUTES CŨ (CRUD & GET PROJECT)
    // =========================================================

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

    // Cập nhật Project
    app.put(
        '/api/projects/:id',
        [authJwt.verifyToken, authJwt.isLeader], // Tốt nhất nên dùng authJwt.isProjectLeader
        controller.updateProject
    );

    app.get(
        "/api/projects/:id/stats",
        [authJwt.verifyToken],
        controller.getProjectStats
    );

    // =========================================================
    // CHỨC NĂNG MỚI
    // =========================================================

    // 1. Tính và Cập nhật ngày kết thúc Project (Dựa trên Due Date)
    // Thường chỉ Leader mới có quyền tính toán lại tiến độ/deadline
    app.post(
        '/api/projects/:projectId/calculate-end-date',
        [authJwt.verifyToken, authJwt.isLeader], // Nên check quyền Leader Project
        controller.updateProjectEndDate
    );

    // 2. Import Project đầy đủ từ JSON (Chỉ cho phép Global Leader)
    app.post(
        '/api/projects/import-full',
        [authJwt.verifyToken, authJwt.isLeader],
        controller.importFullProject
    );

    // 3. Export Workload Report (Nếu bạn đã thêm hàm này vào controller)
    // app.get(
    //     "/api/projects/:id/export/workload", 
    //     [authJwt.verifyToken], 
    //     controller.exportWorkloadReport
    // );
};