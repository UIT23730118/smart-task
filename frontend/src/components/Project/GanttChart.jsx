import React from "react";
import { Chart } from "react-google-charts";

const GanttChart = ({ tasks }) => {
  // Map dữ liệu Task của ông sang format của Google Charts
  const data = [
    [
      { type: "string", label: "Task ID" },
      { type: "string", label: "Task Name" },
      { type: "string", label: "Resource" }, // Dùng để tô màu (Critical / Normal)
      { type: "date", label: "Start Date" },
      { type: "date", label: "End Date" },
      { type: "number", label: "Duration" },
      { type: "number", label: "Percent Complete" },
      { type: "string", label: "Dependencies" },
    ],
    ...tasks.map(t => [
      String(t.id),
      t.title,
      t.isCritical ? "critical" : "normal", // Resource
      new Date(t.startDate), // Ngày bắt đầu
      new Date(t.dueDate),   // Ngày kết thúc
      null, // Duration (tự tính từ ngày)
      t.progress || 0,
      t.Predecessors ? t.Predecessors.map(p => String(p.id)).join(",") : null // Link task
    ])
  ];

  const options = {
    height: 400,
    gantt: {
      criticalPathEnabled: true, // Google tự tính critical path luôn (hoặc dùng logic màu của mình)
      palette: [
        {
          "resource": "critical",
          "color": "#e74c3c", // Màu đỏ cho Critical
          "dark": "#c0392b"
        },
        {
          "resource": "normal",
          "color": "#3498db", // Màu xanh cho thường
          "dark": "#2980b9"
        }
      ]
    },
  };

  return (
    <Chart
      chartType="Gantt"
      width="100%"
      height="400px"
      data={data}
      options={options}
    />
  );
};

export default GanttChart;