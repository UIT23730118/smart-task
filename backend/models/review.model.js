// /models/review.model.js
module.exports = (sequelize, Sequelize) => {
    const Review = sequelize.define('reviews', {
        comments: {
            type: Sequelize.TEXT
        },
        rating: {
            type: Sequelize.FLOAT // VD: 1-5 sao
        },
        status: {
            type: Sequelize.ENUM('Pending', 'Completed'),
            defaultValue: 'Pending'
        },
        taskId: {
            type: Sequelize.INTEGER
        },
        reviewerId: {
            type: Sequelize.INTEGER
        }
    });

    return Review;
};