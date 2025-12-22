const db = require("../models");
const { Op } = require("sequelize");

const Task = db.tasks;
const Notification = db.notifications;
const OverdueAlert = db.overdueAlerts;

exports.checkOverdueTasks = async () => {
  console.log("⏰ Running overdue task check...");

  const now = new Date();

  const overdueTasks = await Task.findAll({
    where: {
      dueDate: { [Op.lt]: now },
      statusId: { [Op.ne]: 1 } // ❗ FIX HERE: Ensure status is not 'Completed' or 'Inactive'
    }
  });

  for (const task of overdueTasks) {
    const existed = await OverdueAlert.findOne({
      where: {
        taskId: task.id,
        userId: task.assigneeId,
        isResolved: false
      }
    });

    if (existed) continue;

    const message = `Task "${task.title}" is overdue`;

    await OverdueAlert.create({
      taskId: task.id,
      userId: task.assigneeId,
      alertMessage: message
    });

    await Notification.create({
      userId: task.assigneeId,
      taskId: task.id,
      message: message
    });

    console.log(`🔔 Overdue notification created for task ${task.id}`);
  }
};