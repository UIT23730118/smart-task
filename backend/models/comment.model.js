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
    });

    return Comment;
};