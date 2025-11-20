// /models/projectMember.model.js
module.exports = (sequelize, Sequelize) => {
    const ProjectMember = sequelize.define('project_members', {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        // projectId và userId sẽ được Sequelize tự động thêm
        // dựa trên định nghĩa quan hệ N-N
        role: {
            type: Sequelize.ENUM('leader', 'member'),
            defaultValue: 'member'
        }
        // joinedAt (createdAt) được tự động thêm
    }, {
        // --- THÊM PHẦN NÀY ĐỂ ÁNH XẠ TIMESTAMPS ---
        timestamps: true,      // Báo cho Sequelize biết bảng này CÓ timestamp
        createdAt: 'joinedAt', // Ánh xạ 'createdAt' của Sequelize vào cột 'joinedAt' của DB
        updatedAt: false     // Báo rằng chúng ta KHÔNG dùng cột 'updatedAt'
        // --- KẾT THÚC PHẦN THÊM ---
    });
    return ProjectMember;
};