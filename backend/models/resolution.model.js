// /models/resolution.model.js
module.exports = (sequelize, Sequelize) => {
    const Resolution = sequelize.define('resolutions', {
        name: {
            type: Sequelize.STRING(100)
        },
        description: {
            type: Sequelize.STRING(255)
        }
    }, {
        timestamps: false // Bảng này không cần createdAt/updatedAt
    });

    return Resolution;
};