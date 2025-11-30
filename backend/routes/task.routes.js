// /routes/task.routes.js
const taskController = require('../controllers/task.controller');
const commentController = require('../controllers/comment.controller');
// Import Multer và Attachment Controller
// --- IMPORT MỚI ---
const attachmentController = require('../controllers/attachment.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authJwt = require('../middleware/authJwt');

// Cấu hình Multer Storage (Đảm bảo thư mục 'uploads/attachments' đã tồn tại!)
const UPLOAD_DIR = path.join(__dirname, '../public/uploads/attachments/');
if (!fs.existsSync(UPLOAD_DIR)) {
    // fs.mkdirSync(path, options)
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`[Multer] Created directory: ${UPLOAD_DIR}`);
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Lưu trữ trong thư mục public/uploads
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Đặt tên file: taskID-timestamp-originalName
        const taskId = req.params.taskId || 'general'; // Nếu không có taskId, đặt là 'general'
        cb(null, `${taskId}-${Date.now()}-${file.originalname.replace(/\s/g, '_')}`);
    }
});
const upload = multer({ storage: storage });

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

    // --- Attachment Routes (MỚI) ---

    // Tải lên tệp đính kèm cho một Task
    // Lưu ý: Đổi tên tham số ID thành taskId để phù hợp với Multer
    app.post(
        '/api/tasks/:taskId/attachments',
        [authJwt.verifyToken, upload.single('attachment')], // 'attachment' là key dùng để gửi file từ Frontend
        attachmentController.uploadAttachment
    );

    // Lấy danh sách tệp đính kèm cho một Task
    app.get(
        '/api/tasks/:taskId/attachments',
        [authJwt.verifyToken],
        attachmentController.getTaskAttachments
    );

    // --- 3. UPLOAD cho PROJECT (MỚI) ---
    app.post(
        '/api/projects/:projectId/attachments',
        [authJwt.verifyToken, upload.single('attachment')],
        attachmentController.uploadAttachment
    );

    // --- 4. LẤY danh sách cho PROJECT (MỚI) ---
    app.get(
        '/api/projects/:projectId/attachments',
        [authJwt.verifyToken],
        attachmentController.getProjectAttachments
    );

    app.delete(
        '/api/attachments/:id', // Dùng ID của attachment
        [authJwt.verifyToken],
        attachmentController.deleteAttachment
    );

    app.post(
        "/api/tasks/:taskId/suggest-assignee",
        [authJwt.verifyToken, /* thêm middlewares nếu cần */],
        taskController.suggestTaskAssignment // Đảm bảo hàm này đã được export trong Controller
    );

    //xóa task
    app.delete(
        '/api/tasks/:id',
        [authJwt.verifyToken],
        taskController.deleteTask
    );

    // --- Comment Routes ---

    // Thêm comment vào task
    app.post(
        '/api/tasks/:id/comments',
        [authJwt.verifyToken],
        commentController.addComment
    );
};