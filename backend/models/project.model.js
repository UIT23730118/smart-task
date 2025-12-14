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
        workloadFactor: {
            type: Sequelize.FLOAT,
            defaultValue: 1.0,
            allowNull: false
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