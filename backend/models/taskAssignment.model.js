module.exports = (sequelize, Sequelize) => {
	const TaskAssignment = sequelize.define('task_assignments', {
		decisionReason: { type: Sequelize.TEXT },
		taskId: { type: Sequelize.INTEGER },
		assignedBy: { type: Sequelize.INTEGER },
		assignedTo: { type: Sequelize.INTEGER },
	});
	return TaskAssignment;
};
