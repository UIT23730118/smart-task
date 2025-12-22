const cron = require("node-cron");
const { checkOverdueTasks } = require("../services/overdueCheck.service");

exports.startOverdueCron = () => {
  // Chạy mỗi 10 phút
  cron.schedule("*/1 * * * *", async () => {
    try {
      await checkOverdueTasks();
    } catch (error) {
      console.error("❌ Overdue cron error:", error);
    }
  });

  console.log("✅ Overdue task cron started (every 10 minutes)");
};
