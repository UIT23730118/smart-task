// /models/attachment.model.js
module.exports = (sequelize, Sequelize) => {
    const Attachment = sequelize.define('attachments', {
        fileName: { type: Sequelize.STRING(255), allowNull: false },
        filePath: { type: Sequelize.STRING(255), allowNull: false },
        fileType: { type: Sequelize.STRING(50) },
        fileSize: { type: Sequelize.INTEGER },
        uploadedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
        taskId: { type: Sequelize.INTEGER },
        userId: { type: Sequelize.INTEGER }
    }, { timestamps: false });
    return Attachment;
};