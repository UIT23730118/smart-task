// /models/transition.model.js
module.exports = (sequelize, Sequelize) => {
    const Transition = sequelize.define('transitions', {
        projectId: {
            type: Sequelize.INTEGER,
            allowNull: true // NULL = global
        },
        fromStatusId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        toStatusId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        name: {
            type: Sequelize.STRING(120)
        },
        condition: {
            type: Sequelize.JSON
        }
    });

    return Transition;
};