module.exports = (sequelize, Sequelize) => {
	const Backup = sequelize.define('backups', {
		backupType: { type: Sequelize.ENUM('database', 'files', 'full'), defaultValue: 'full' },
		backupPath: { type: Sequelize.STRING(255) },
		projectId: { type: Sequelize.INTEGER },
		createdBy: { type: Sequelize.INTEGER },
	});
	return Backup;
};
