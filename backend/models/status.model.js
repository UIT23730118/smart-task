// /models/status.model.js
module.exports = (sequelize, Sequelize) => {
    const Status = sequelize.define('statuses', {
        name: {
            type: Sequelize.STRING(100),
            allowNull: false
        },
        color: {
            type: Sequelize.STRING(20),
            defaultValue: '#888888'
        },
        position: {
            type: Sequelize.INTEGER,
            defaultValue: 0
        },
        projectId: {
            type: Sequelize.INTEGER,
            allowNull: true // NULL = Status toàn cục
        }
    });

    return Status;
};