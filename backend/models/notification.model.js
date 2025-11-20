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
    });

    return Notification;
};