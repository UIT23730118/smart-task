module.exports = (sequelize, Sequelize) => {
	const UserPerformance = sequelize.define('user_performance', {
		totalTasks: { type: Sequelize.INTEGER, defaultValue: 0 },
		completedTasks: { type: Sequelize.INTEGER, defaultValue: 0 },
		averageRating: { type: Sequelize.FLOAT, defaultValue: 0 },
		leaderFeedback: { type: Sequelize.TEXT },
		skillScore: { type: Sequelize.FLOAT, defaultValue: 0 },
		userId: { type: Sequelize.INTEGER },
		projectId: { type: Sequelize.INTEGER },
	});
	return UserPerformance;
};
