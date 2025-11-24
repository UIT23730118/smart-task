// /models/comment.model.js
module.exports = (sequelize, Sequelize) => {
    const Comment = sequelize.define('comments', {
        message: {
            type: Sequelize.TEXT
        },
        taskId: {
            type: Sequelize.INTEGER
        },
        userId: {
            type: Sequelize.INTEGER
        }
    }, {
        timestamps: true,
        updatedAt: false     // Báo rằng chúng ta KHÔNG dùng cột 'updatedAt'
        // --- KẾT THÚC PHẦN THÊM ---
    });

    return Comment;
};