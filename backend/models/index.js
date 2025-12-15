// /models/index.js
const { Sequelize } = require('sequelize');
const dbConfig = require('../config/db.config.js');

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
	host: dbConfig.HOST,
	dialect: dbConfig.dialect,
	logging: false,
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// --- IMPORT MODELS ---
db.users = require('./user.model.js')(sequelize, Sequelize);
db.projects = require('./project.model.js')(sequelize, Sequelize);
db.statuses = require('./status.model.js')(sequelize, Sequelize);
db.tasks = require('./task.model.js')(sequelize, Sequelize);
db.teams = require('./team.model.js')(sequelize, Sequelize);
db.teamMembers = require('./teamMember.model.js')(sequelize, Sequelize);
db.attachments = require('./attachment.model.js')(sequelize, Sequelize);
db.issueTypes = require('./issue_type.model.js')(sequelize, Sequelize);
db.resolutions = require('./resolution.model.js')(sequelize, Sequelize);
db.comments = require('./comment.model.js')(sequelize, Sequelize);
db.reviews = require('./review.model.js')(sequelize, Sequelize);
db.transitions = require('./transition.model.js')(sequelize, Sequelize);
db.notifications = require('./notification.model.js')(sequelize, Sequelize);
db.backups = require('./backup.model.js')(sequelize, Sequelize);
db.overdueAlerts = require('./overdueAlert.model.js')(sequelize, Sequelize);
db.userPerformance = require('./userPerformance.model.js')(sequelize, Sequelize);
db.taskAssignments = require('./taskAssignment.model.js')(sequelize, Sequelize);
db.taskDependencies = require('./taskDependency.model.js')(sequelize, Sequelize);

// --- ASSOCIATIONS (QUAN HỆ) ---

// 1. User - Project (Leader trực tiếp)
db.users.hasMany(db.projects, { foreignKey: 'leaderId', as: 'ledProjects' });
db.projects.belongsTo(db.users, { foreignKey: 'leaderId', as: 'leader' });

db.tasks.belongsTo(db.projects, {
    foreignKey: 'projectId',
    as: 'project' // 💡 Đảm bảo tên alias là 'project' để logic Workload ở dưới hoạt động
});
db.projects.hasMany(db.tasks, {
    foreignKey: 'projectId',
    as: 'tasks'
});

// 2. User - Team - Project (Thành viên tham gia qua Team)
db.projects.hasMany(db.teams, { foreignKey: 'projectId', onDelete: 'CASCADE' });
db.teams.belongsTo(db.projects, { foreignKey: 'projectId' });

db.users.belongsToMany(db.teams, { through: db.teamMembers, foreignKey: 'userId', as: 'teams' });
db.teams.belongsToMany(db.users, { through: db.teamMembers, foreignKey: 'teamId', as: 'members' });

// 3. Tasks Core
db.projects.hasMany(db.tasks, { foreignKey: 'projectId', onDelete: 'SET NULL' });
db.tasks.belongsTo(db.projects, { foreignKey: 'projectId' });

db.users.hasMany(db.tasks, { foreignKey: 'reporterId', as: 'reportedTasks' });
db.tasks.belongsTo(db.users, { foreignKey: 'reporterId', as: 'reporter' });

db.users.hasMany(db.tasks, { foreignKey: 'assigneeId', as: 'assignedTasks' });
db.tasks.belongsTo(db.users, { foreignKey: 'assigneeId', as: 'assignee' });

db.users.hasMany(db.tasks, { foreignKey: 'suggestedAssigneeId', as: 'suggestedTasks' });
db.tasks.belongsTo(db.users, { foreignKey: 'suggestedAssigneeId', as: 'suggestedAssignee' });
// ------------------------------------

// 4. Task Metadata (Status, Types, etc.)
db.statuses.hasMany(db.tasks, { foreignKey: 'statusId' });
db.tasks.belongsTo(db.statuses, { foreignKey: 'statusId' });
db.projects.hasMany(db.statuses, { foreignKey: 'projectId', onDelete: 'CASCADE' });
db.statuses.belongsTo(db.projects, { foreignKey: 'projectId' });

db.issueTypes.hasMany(db.tasks, { foreignKey: 'typeId' });
db.tasks.belongsTo(db.issueTypes, { foreignKey: 'typeId', as: 'type' });

db.resolutions.hasMany(db.tasks, { foreignKey: 'resolutionId' });
db.tasks.belongsTo(db.resolutions, { foreignKey: 'resolutionId' });

// 5. Attachments (Mới)
db.tasks.hasMany(db.attachments, { foreignKey: 'taskId', onDelete: 'CASCADE' });
db.attachments.belongsTo(db.tasks, { foreignKey: 'taskId' });
db.users.hasMany(db.attachments, { foreignKey: 'userId' });
db.attachments.belongsTo(db.users, { foreignKey: 'userId' });

// 6. Alerts & Performance (Mới)
db.tasks.hasMany(db.overdueAlerts, { foreignKey: 'taskId', onDelete: 'CASCADE' });
db.overdueAlerts.belongsTo(db.tasks, { foreignKey: 'taskId' });

db.users.hasMany(db.userPerformance, { foreignKey: 'userId' });
db.userPerformance.belongsTo(db.users, { foreignKey: 'userId' });

// 7. Comments
db.tasks.hasMany(db.comments, {
  foreignKey: 'taskId',
  as: 'comments',
  onDelete: 'CASCADE'
});

db.comments.belongsTo(db.tasks, {
  foreignKey: 'taskId',
  as: 'task'
});

// để load user comment
db.users.hasMany(db.comments, { foreignKey: 'userId', as: 'userComments' });
db.comments.belongsTo(db.users, { foreignKey: 'userId', as: 'author' });

db.tasks.hasMany(db.notifications, { foreignKey: 'taskId', onDelete: 'CASCADE' });
db.notifications.belongsTo(db.tasks, {
  foreignKey: 'taskId',
  as: 'task'
});

// 1. Quan hệ Team - User (Leader)
// Quan trọng: Phải có dòng này thì mới dùng được "as: 'leader'" trong controller
db.teams.belongsTo(db.users, { foreignKey: "leaderId", as: "leader" });

// 2. Quan hệ Team - TeamMember - User
db.teams.hasMany(db.teamMembers, { foreignKey: "teamId" });
db.teamMembers.belongsTo(db.teams, { foreignKey: "teamId" });

db.users.hasMany(db.teamMembers, { foreignKey: "userId" });
db.teamMembers.belongsTo(db.users, { foreignKey: "userId" });

// 11. Task có nhiều cha (Predecessors)
db.tasks.belongsToMany(db.tasks, {
  through: db.taskDependencies,
  as: "Predecessors",
  foreignKey: "successorId",
  otherKey: "predecessorId"
});

// 12. Task có nhiều con (Successors)
db.tasks.belongsToMany(db.tasks, {
  through: db.taskDependencies,
  as: "Successors",
  foreignKey: "predecessorId",
  otherKey: "successorId"
});

module.exports = db;
