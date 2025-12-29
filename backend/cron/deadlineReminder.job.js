const cron = require("node-cron");
const dayjs = require("dayjs");
const { Op } = require("sequelize");
const db = require("../models");

const Task = db.tasks;
const Notification = db.notifications;

const REMIND_DAYS = [3, 2, 1]; // 🔥 Remind 3 days & 1 day before deadline

cron.schedule("*/1 * * * *", async () => {
  console.log("⏰ Running deadline reminder job...");

  const today = dayjs().startOf("day");

  try {
    const tasks = await Task.findAll({
      where: {
        dueDate: { [Op.ne]: null },
        progress: { [Op.lt]: 100 }
      }
    });

    for (const task of tasks) {
      if (!task.assigneeId) continue;

      const due = dayjs(task.dueDate).startOf("day");
      const daysLeft = due.diff(today, "day");

      if (!REMIND_DAYS.includes(daysLeft)) continue;

      // 🚫 Check if notification has already been sent
      const existed = await Notification.findOne({
        where: {
          userId: task.assigneeId,
          taskId: task.id,
          type: "DEADLINE_REMINDER",
          meta: {
            daysLeft
          }
        }
      });

      if (existed) continue;

      await Notification.create({
        userId: task.assigneeId,
        taskId: task.id,
        type: "DEADLINE_REMINDER",
        message: `⏰ Task "${task.title}" is due in ${daysLeft} day(s)`,
        meta: { daysLeft }
      });

      console.log(`🔔 Reminded task ${task.id} (${daysLeft} days left)`);
    }
  } catch (err) {
    console.error("❌ Deadline reminder error:", err);
  }
});