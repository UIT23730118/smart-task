// /models/issue_type.model.js
module.exports = (sequelize, Sequelize) => {
    const IssueType = sequelize.define('issue_types', {
        name: {
            type: Sequelize.STRING(80),
            allowNull: false
        },
        icon: {
            type: Sequelize.STRING(50)
        }
    }, {
        timestamps: false // Bảng này không cần createdAt/updatedAt
    });

    return IssueType;
};