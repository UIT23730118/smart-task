// /models/project.model.js
module.exports = (sequelize, Sequelize) => {
    const Project = sequelize.define('projects', {
        // id, createdAt, updatedAt được tự động thêm
        name: {
            type: Sequelize.STRING(150),
            allowNull: false
        },
        description: {
            type: Sequelize.TEXT
        },
        leaderId: {
            type: Sequelize.INTEGER
            // (Đã được định nghĩa quan hệ ở index.js)
        },
        startDate: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        },
        endDate: {
            type: Sequelize.DATE
        }
    });

    return Project;
};