// /controllers/workload.controller.js (UPDATED - CLEANER)

const workloadService = require('../services/workload.service');

exports.getGlobalWorkloadSummary = async (req, res) => {
    try {
        // 💡 FIX: Chỉ gọi hàm service đã bao gồm TÍNH TOÁN và KPI
        const summary = await workloadService.getGlobalWorkloadSummary();
        
        // Thêm kiểm tra nếu không có dữ liệu để tránh trả về mảng rỗng
        if (summary.length === 0) {
            return res.status(200).send([]);
        }

        res.status(200).send(summary);
    } catch (error) {
        console.error("Error fetching global workload summary:", error);
        res.status(500).send({ message: "Internal Server Error during workload calculation." });
    }
};