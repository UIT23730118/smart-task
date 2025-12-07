// backend/controllers/notification.controller.js
const db = require('../models'); // Đảm bảo đường dẫn trỏ đúng về folder models
const Notification = db.notifications;
const Task = db.tasks;

// 1. Lấy danh sách thông báo của User đang login
exports.getMyNotifications = async (req, res) => {
    try {
        const userId = req.userId; // Lấy từ token (do middleware authJwt giải mã)

        const notifications = await Notification.findAll({
            where: { userId: userId },
            // Kèm theo thông tin Task để hiển thị tên Task
            include: [{
                model: Task,
                as: 'task',
                attributes: ['id', 'title']
            }],
            // Sắp xếp: Tin chưa đọc lên trước, tin mới nhất lên trước
            order: [
                ['isRead', 'ASC'],
                ['createdAt', 'DESC']
            ],
            limit: 50
        });

        res.status(200).send(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).send({ message: error.message });
    }
};

// 2. Đánh dấu đã đọc
exports.markAsRead = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.userId;

        // Chỉ update đúng cái thông báo của user đó
        await Notification.update(
            { isRead: true },
            { where: { id: id, userId: userId } }
        );

        res.status(200).send({ message: "Notification marked as read." });
    } catch (error) {
        console.error("Error updating notification:", error);
        res.status(500).send({ message: error.message });
    }
};