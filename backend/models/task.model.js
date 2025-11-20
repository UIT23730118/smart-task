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
		requiredSkills: { type: Sequelize.TEXT }, // Mới
		score: { type: Sequelize.FLOAT },

		// Các trường Tracking mới
		startDate: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
		dueDate: { type: Sequelize.DATE },
		progress: { type: Sequelize.FLOAT, defaultValue: 0 },
		isOverdue: { type: Sequelize.BOOLEAN, defaultValue: false },
		resolvedAt: { type: Sequelize.DATE },

		// FK sẽ được map trong index.js
		projectId: { type: Sequelize.INTEGER },
		reporterId: { type: Sequelize.INTEGER },
		assigneeId: { type: Sequelize.INTEGER },
		statusId: { type: Sequelize.INTEGER },
		typeId: { type: Sequelize.INTEGER },
		resolutionId: { type: Sequelize.INTEGER },
	});
	return Task;
};
