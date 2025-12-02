// /models/notification.model.js
module.exports = (sequelize, Sequelize) => {
    const Notification = sequelize.define('notifications', {
        userId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        message: {
            type: Sequelize.TEXT
        },
        meta: {
            type: Sequelize.JSON // (VD: { "taskId": 12 })
        },
        isRead: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        }
    }, {
        // --- THÊM PHẦN NÀY ĐỂ ÁNH XẠ TIMESTAMPS ---
        timestamps: true,      // Báo cho Sequelize biết bảng này CÓ timestamp
        updatedAt: false     // Báo rằng chúng ta KHÔNG dùng cột 'updatedAt'
        // --- KẾT THÚC PHẦN THÊM ---
    });

    return Notification;
};