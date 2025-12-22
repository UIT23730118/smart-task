import React from "react";
import { Chart } from "react-google-charts";

const GanttChart = ({ tasks }) => {
  // 1. Kiểm tra an toàn dữ liệu
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "#999" }}>
        Chưa có dữ liệu task để hiển thị.
      </div>
    );
  }

  // 2. Định nghĩa Cột (Header)
  const columns = [
    { type: "string", label: "Task ID" },
    { type: "string", label: "Task Name" },
    { type: "string", label: "Resource" },
    { type: "date", label: "Start Date" },
    { type: "date", label: "End Date" },
    { type: "number", label: "Duration" },
    { type: "number", label: "Percent Complete" },
    { type: "string", label: "Dependencies" },
  ];

  // 3. Chuyển đổi dữ liệu (Rows)
  const rows = tasks
    .map((t) => {
      // --- XỬ LÝ NGÀY THÁNG (FIX LỖI MẤT TASK 5) ---
      // Nếu thiếu ngày, fallback về ngày hiện tại để task luôn hiển thị
      let start = t.startDate ? new Date(t.startDate) : new Date();
      let end = t.dueDate ? new Date(t.dueDate) : new Date();

      // Kiểm tra Invalid Date
      if (isNaN(start.getTime())) start = new Date();
      if (isNaN(end.getTime())) end = new Date();

      // Fix lỗi Google Charts: Ngày End không được trùng hoặc nhỏ hơn Start
      // Nếu trùng (Task 1 ngày), tự cộng thêm 1 ngày để tạo độ rộng
      if (start.getTime() >= end.getTime()) {
        end = new Date(start);
        end.setDate(start.getDate() + 1);
      }

      // --- LOGIC MÀU SẮC (FIX LỖI TASK 2 BỊ ĐỎ OAN) ---

      // Chỉ coi là Critical khi có slack thực sự và slack <= 0
      // KHÔNG mặc định slack = 0 nữa (để tránh false positive)
      const hasSlack = t.slack !== undefined && t.slack !== null;
      const isCritical = t.isCritical === true || (hasSlack && t.slack <= 0);

      let resource = "normal"; // Mặc định: Màu xanh dương (An toàn)

      if (isCritical) {
          resource = "critical"; // Màu đỏ (Chỉ khi thực sự trễ)
      } else if (Number(t.progress) === 100) {
          resource = "completed"; // Màu xanh lá
      }

      // --- XỬ LÝ DEPENDENCIES ---
      let dependencyString = null;
      if (t.Predecessors && Array.isArray(t.Predecessors) && t.Predecessors.length > 0) {
         // Lọc lấy ID hợp lệ (chỉ lấy những ID có trong danh sách tasks hiện tại)
         const currentTaskIds = new Set(tasks.map(task => String(task.id)));

         const validPreds = t.Predecessors
             .map(p => {
                const rawId = (p && typeof p === 'object' && p.id) ? p.id : p;
                return String(rawId);
             })
             .filter(id => id && currentTaskIds.has(id));

         if (validPreds.length > 0) {
            dependencyString = validPreds.join(",");
         }
      }

      return [
        String(t.id),
        String(t.title || "No Title"),
        resource,
        start,
        end,
        null,
        Number(t.progress || 0),
        dependencyString
      ];
    });
    // Không dùng .filter() để loại bỏ, vì ta đã xử lý fallback ngày tháng ở trên

  if (rows.length === 0) {
     return <div style={{ padding: 20, textAlign: 'center', color: '#faad14' }}>Không có dữ liệu hiển thị.</div>;
  }

  // 4. Gộp Header và Rows
  const data = [columns, ...rows];

  // 5. Cấu hình biểu đồ
  const options = {
    height: rows.length * 42 + 50,
    gantt: {
      trackHeight: 40,
      criticalPathEnabled: false, // Tắt auto-critical của Google
      palette: [
        {
          "resource": "critical",
          "color": "#ff4d4f",
          "dark": "#cf1322"
        },
        {
          "resource": "completed",
          "color": "#52c41a",
          "dark": "#389e0d"
        },
        {
          "resource": "normal",
          "color": "#1890ff",
          "dark": "#096dd9"
        }
      ],
      arrow: {
        angle: 45,
        radius: 0,
      }
    },
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden', minHeight: '200px' }}>
        <Chart
          chartType="Gantt"
          width="100%"
          height={`${rows.length * 42 + 50}px`}
          data={data}
          options={options}
        />
    </div>
  );
};

export default GanttChart;