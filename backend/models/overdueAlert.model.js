module.exports = (sequelize, Sequelize) => {
	const OverdueAlert = sequelize.define('overdue_alerts', {
		alertMessage: { type: Sequelize.TEXT },
		isResolved: { type: Sequelize.BOOLEAN, defaultValue: false },
		taskId: { type: Sequelize.INTEGER },
		userId: { type: Sequelize.INTEGER },
	});
	return OverdueAlert;
};
