// /models/notification.model.js
module.exports = (sequelize, Sequelize) => {
    const Notification = sequelize.define('notifications', {
        userId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        taskId: {
            type: Sequelize.INTEGER,
            allowNull: true // Thông báo hệ thống có thể không cần taskId
        },
        // --- BỔ SUNG TRƯỜNG TYPE ---
        type: {
            type: Sequelize.STRING, // Lưu các giá trị như: 'CREATE_TASK', 'ASSIGNMENT', v.v.
            allowNull: true
        },
        // ---------------------------
        message: {
            type: Sequelize.TEXT
        },
        meta: {
            type: Sequelize.JSON
        },
        isRead: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        }
    }, {
        timestamps: true,
        updatedAt: false
    });

    return Notification;
};