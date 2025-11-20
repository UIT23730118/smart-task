module.exports = (sequelize, Sequelize) => {
    const Team = sequelize.define(
		'teams',
		{
			name: { type: Sequelize.STRING(150), allowNull: false },
			projectId: { type: Sequelize.INTEGER },
			leaderId: { type: Sequelize.INTEGER },
		},
		{
			// --- THÊM PHẦN NÀY ĐỂ ÁNH XẠ TIMESTAMPS ---
			timestamps: true, // Báo cho Sequelize biết bảng này CÓ timestamp
			updatedAt: false, // Báo rằng chúng ta KHÔNG dùng cột 'updatedAt'
			// --- KẾT THÚC PHẦN THÊM ---
		}
	);
    return Team;
};