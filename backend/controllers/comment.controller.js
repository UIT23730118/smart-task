// /controllers/comment.controller.js
const db = require('../models');
const Comment = db.comments;
const Task = db.tasks;

// Thêm một comment mới vào Task
exports.addComment = async (req, res) => {
    try {
        const userId = req.userId; // Lấy từ authJwt
        const taskId = req.params.id; // Lấy taskId từ URL
        const { message } = req.body;

        if (!message) {
            return res.status(400).send({ message: 'Comment message cannot be empty.' });
        }

        // Kiểm tra xem task có tồn tại không
        const task = await Task.findByPk(taskId);
        if (!task) {
            return res.status(404).send({ message: 'Task not found.' });
        }

        // (Nên kiểm tra xem user có quyền comment vào task này không)

        const comment = await Comment.create({
            message: message,
            taskId: taskId,
            userId: userId
        });

        // (Sau này) Gửi notification cho những người liên quan đến task

        res.status(201).send(comment);
    } catch (error) {
        res.status(500).send({ message: `Error adding comment: ${error.message}` });
    }
};

// (Bạn có thể thêm: Sửa comment, Xóa comment ở đây)