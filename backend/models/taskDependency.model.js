// models/taskDependency.model.js
module.exports = (sequelize, Sequelize) => {
  const TaskDependency = sequelize.define("task_dependencies", {
    predecessorId: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    successorId: {
      type: Sequelize.INTEGER,
      primaryKey: true
    },
    type: {
      type: Sequelize.STRING,
      defaultValue: 'FS' // Finish-to-Start
    }
  }, {
    timestamps: true
  });

  return TaskDependency;
};