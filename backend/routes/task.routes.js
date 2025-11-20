// /routes/task.routes.js
const taskController = require('../controllers/task.controller');
const commentController = require('../controllers/comment.controller');
const authJwt = require('../middleware/authJwt');

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            'Access-Control-Allow-Headers',
            'Authorization, Origin, Content-Type, Accept'
        );
        next();
    });

    // --- Task Routes ---

    // Tạo task mới (yêu cầu đăng nhập)
    app.post(
        '/api/tasks',
        [authJwt.verifyToken],
        taskController.createTask
    );

    // Lấy chi tiết task (yêu cầu đăng nhập)
    app.get(
        '/api/tasks/:id',
        [authJwt.verifyToken],
        taskController.getTaskDetails
    );

    // Cập nhật task (title, desc, assignee...)
    app.put(
        '/api/tasks/:id',
        [authJwt.verifyToken],
        taskController.updateTask
    );

    // Cập nhật chỉ Status
    app.put(
        '/api/tasks/:id/status',
        [authJwt.verifyToken],
        taskController.updateTaskStatus
    );

    // --- Comment Routes ---

    // Thêm comment vào task
    app.post(
        '/api/tasks/:id/comments',
        [authJwt.verifyToken],
        commentController.addComment
    );
};