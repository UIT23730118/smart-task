// /models/task.model.js
module.exports = (sequelize, Sequelize) => {
	const Task = sequelize.define('tasks', {
		title: { type: Sequelize.STRING(200), allowNull: false },
		description: { type: Sequelize.TEXT },
		priority: {
			type: Sequelize.ENUM('Minor', 'Major', 'Critical', 'Blocker'),
			defaultValue: 'Minor',
		},
		rootCause: { type: Sequelize.TEXT },
		requiredSkills: { type: Sequelize.TEXT },
		score: { type: Sequelize.FLOAT },

		startDate: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
		dueDate: { type: Sequelize.DATE },
		progress: { type: Sequelize.FLOAT, defaultValue: 0 },
		isOverdue: { type: Sequelize.BOOLEAN, defaultValue: false },
		resolvedAt: { type: Sequelize.DATE },

		projectId: { type: Sequelize.INTEGER },
		reporterId: { type: Sequelize.INTEGER },
		assigneeId: { type: Sequelize.INTEGER },
		statusId: { type: Sequelize.INTEGER },
		typeId: { type: Sequelize.INTEGER },
		resolutionId: { type: Sequelize.INTEGER },
		suggestedAssigneeId: { // Cột mới
			type: Sequelize.INTEGER,
			allowNull: true,
		},
		subtasksTemplate: { // Cột mới
			type: Sequelize.JSON,
			allowNull: true,
		},
		workloadWeight: {
			type: Sequelize.INTEGER,
			defaultValue: 1, // Mặc định là 1 (min)
			allowNull: false
		},
	});
	return Task;
};
