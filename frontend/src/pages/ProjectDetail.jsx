// /src/pages/ProjectDetail.jsx 

import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button, Segmented, Progress, Tabs, Upload, List, message, Popconfirm, Typography } from "antd";
import {
  PlusOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  InboxOutlined,
  FileTextOutlined,
  DeleteOutlined,
  DownloadOutlined,
  BarChartOutlined
} from "@ant-design/icons";
import ProjectService from "../api/project.service";
import TaskService from "../api/task.service";

import TaskCard from "../components/Task/TaskCard";
import TaskModal from "../components/Task/TaskModal";
import TaskListView from "../components/Project/TaskListView";
// Đã thay thế FilterBar bằng TaskFilter
import TaskFilter from "../components/Task/TaskFilter";
import { useAuth } from "../context/AuthContext";
import ProjectSettingsModal from '../components/Project/ProjectSettingsModal';
import { FaUsersCog, FaRegListAlt, FaCog } from "react-icons/fa"; // Thêm FaCog
import authHeader from "../api/auth.header";
import api from "../api/axios";
import autoTable from 'jspdf-autotable';
import jsPDF from "jspdf";
import { Steps, Card, Alert } from "antd";

const { Step } = Steps;

const { Dragger } = Upload;
const { Text } = Typography;

// --- COMPONENT HIỂN THỊ CHUỖI ĐƯỜNG GĂNG ---
const CriticalPathVisualizer = ({ tasks }) => {
  // 1. Lọc ra các task Critical (Slack = 0 hoặc isCritical = true)
  // Lưu ý: Đảm bảo backend đã trả về isCritical hoặc tính slack = 0
  const criticalTasks = tasks
    .filter(t => t.isCritical || t.slack === 0)
    .sort((a, b) => (a.es || 0) - (b.es || 0));

  if (criticalTasks.length === 0) return null;

  return (
    <Card
      title={<span style={{ color: '#cf1322', fontWeight: 'bold' }}>🔥 CRITICAL PATH FLOW (Đường Găng)</span>}
      size="small"
      style={{ marginBottom: 20, border: '1px solid #ffa39e', backgroundColor: '#fff2f0' }}
    >
      <div style={{ overflowX: 'auto', paddingBottom: 10 }}>
        <Steps progressDot current={criticalTasks.length} size="small">
          {criticalTasks.map(task => (
            <Step
              key={task.id}
              title={<span style={{ fontWeight: 'bold' }}>{task.title}</span>}
              description={
                <div style={{ fontSize: '11px' }}>
                  <div>Duration: {task.duration}d</div>
                  {/* Check kỹ nếu có es/ef thì mới hiện */}
                  {task.es !== undefined && <div>Day {task.es} ➝ {task.ef}</div>}
                </div>
              }
              status="error"
            />
          ))}
        </Steps>
      </div>
      <div style={{ marginTop: 10, fontSize: '12px', color: '#666' }}>
        * Các công việc này không được phép trễ. Tổng thời gian dự án phụ thuộc vào chuỗi này.
      </div>
    </Card>
  );
};

const ProjectDetail = () => {
  const { id: projectId } = useParams();
  const { user } = useAuth();

  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter & View state
  // Đã thay thế searchTerm và filterAssignee bằng một object filters
  const [filters, setFilters] = useState({});
  const [viewMode, setViewMode] = useState("list");

  // Task modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskToEdit, setSelectedTaskToEdit] = useState(null);

  // Project attachment state
  const [fileList, setFileList] = useState([]);
  // 💡 Project Settings Modal state
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

  // --- FILTER HANDLER ---
  const handleFilterChange = (newFilters) => {
    // Cập nhật state filters khi TaskFilter trả về giá trị
    setFilters(newFilters);
  };

  const fetchProjectAttachments = async () => {
    if (!projectId) return;
    try {
      const res = await TaskService.getProjectAttachments(projectId);
      const formattedFiles = res.data.map(f => ({
        ...f,
        uid: f.id,
        name: f.fileName,
        status: 'done',
        url: `/public/uploads/attachments/${f.filePath.split('/').pop()}`,
      }));
      setFileList(formattedFiles);
    } catch (err) {
      console.error("Error loading project attachments:", err);
    }
  };

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      const response = await ProjectService.getProjectDetails(projectId);
      setProjectData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load project.");
    } finally {
      setLoading(false);
    }
  };

  // 💡 HÀM REFRESH DỮ LIỆU SAU KHI SETTINGS THAY ĐỔI
  const handleProjectDataRefresh = () => {
    fetchProjectData();
  };

  useEffect(() => {
    fetchProjectData();
    fetchProjectAttachments();
  }, [projectId]);

  // --- EXPORT WORKLOAD REPORT ---
  // const handleExportReport = async () => {
  //   try {
  //     message.loading('Preparing report...', 0);

  //     const response = await ProjectService.exportWorkloadReport(projectId);

  //     const url = window.URL.createObjectURL(new Blob([response.data]));
  //     const link = document.createElement('a');
  //     link.href = url;

  //     const filenameHeader = response.headers['content-disposition'];
  //     let filename = `workload_report_${projectId}.csv`;
  //     if (filenameHeader) {
  //       const matches = filenameHeader.match(/filename="(.+?)"/);
  //       if (matches && matches[1]) filename = matches[1];
  //     }

  //     link.setAttribute('download', filename);
  //     document.body.appendChild(link);
  //     link.click();
  //     link.remove();

  //     message.destroy();
  //     message.success('Report downloaded successfully!');
  //   } catch (error) {
  //     message.destroy();

  //     let errorMessage = 'Failed to export report.';
  //     if (error.response && error.response.data instanceof Blob) {
  //       const errorText = await error.response.data.text();
  //       try {
  //         const errorJson = JSON.parse(errorText);
  //         errorMessage = errorJson.message || errorMessage;
  //       } catch (e) { }
  //     } else if (error.response?.data?.message) {
  //       errorMessage = error.response.data.message;
  //     }

  //     message.error(errorMessage);
  //   }
  // };

  const handleExportReport = async () => {
    try {
      message.loading({ content: "Đang lấy dữ liệu...", key: "export" });

      // 1. GỌI API (Thêm _t để tránh cache)
      const res = await api.get(`/projects/${projectId}/stats?_t=${Date.now()}`, {
        headers: authHeader()
      });

      const { project, stats, workload } = res.data;

      // Lấy danh sách task để vẽ Gantt (Cần API trả về tasks, nếu API stats chưa có thì phải gọi thêm)
      // Giả sử res.data.stats chưa đủ thông tin ngày tháng để vẽ Gantt, ta lấy từ projectData state có sẵn
      // Lưu ý: Biến projectData phải đang có dữ liệu (đã load từ useEffect)
      const tasksForGantt = projectData?.tasks || [];

      if (!stats || !workload) {
        message.error("Dữ liệu trống!");
        return;
      }

      message.loading({ content: "Đang vẽ biểu đồ...", key: "export" });

      // 2. KHỞI TẠO PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // --- HEADER ---
      const pName = project ? String(project).toUpperCase() : "PROJECT REPORT";
      doc.setFontSize(22);
      doc.setTextColor(44, 62, 80); // Màu xanh đậm
      doc.text(pName, 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated by SmartTask • Date: ${new Date().toLocaleString()}`, 14, 26);

      // ==============================================
      // PHẦN A: DASHBOARD KPI (TOTAL TASK & STATUS)
      // ==============================================
      let yPos = 35;

      // Cấu hình 4 ô KPI
      const kpiWidth = 40;
      const kpiHeight = 25;
      const gap = 6;
      const startX = 14;

      // Helper vẽ ô KPI
      const drawKPI = (x, title, value, color) => {
        doc.setFillColor(...color); // Màu nền
        doc.roundedRect(x, yPos, kpiWidth, kpiHeight, 3, 3, 'F');

        doc.setTextColor(255, 255, 255); // Chữ trắng
        doc.setFontSize(10);
        doc.text(title, x + kpiWidth / 2, yPos + 8, { align: 'center' });

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(String(value), x + kpiWidth / 2, yPos + 18, { align: 'center' });
      };

      drawKPI(startX, "TOTAL TASKS", stats.total, [52, 73, 94]);       // Xám xanh
      drawKPI(startX + kpiWidth + gap, "COMPLETED", stats.done, [46, 204, 113]); // Xanh lá
      drawKPI(startX + (kpiWidth + gap) * 2, "IN PROGRESS", stats.inProgress, [52, 152, 219]); // Xanh dương
      drawKPI(startX + (kpiWidth + gap) * 3, "OVERDUE", stats.late, [231, 76, 60]);   // Đỏ

      // ==============================================
      // PHẦN B: BIỂU ĐỒ TRÒN (SIMULATED BY STACKED BAR)
      // ==============================================
      // Thay vì vẽ hình tròn phức tạp, ta vẽ thanh tỉ lệ (Progress Bar) - Dễ nhìn hơn trong PDF
      yPos += 35;
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text("1. Status Distribution", 14, yPos);

      yPos += 8;
      const barWidth = 180;
      const barHeight = 10;
      const total = stats.total || 1; // Tránh chia 0

      // Tính độ dài từng đoạn
      const doneW = (stats.done / total) * barWidth;
      const progW = (stats.inProgress / total) * barWidth;
      const todoW = (stats.todo / total) * barWidth;
      const lateW = (stats.late / total) * barWidth; // Lưu ý: Late thường nằm trong todo/progress nên cẩn thận cộng dồn

      // Vẽ thanh Done (Xanh lá)
      if (stats.done > 0) {
        doc.setFillColor(46, 204, 113);
        doc.rect(14, yPos, doneW, barHeight, 'F');
      }
      // Vẽ thanh In Progress (Xanh dương)
      if (stats.inProgress > 0) {
        doc.setFillColor(52, 152, 219);
        doc.rect(14 + doneW, yPos, progW, barHeight, 'F');
      }
      // Vẽ thanh Todo (Xám)
      const restW = barWidth - doneW - progW;
      if (restW > 0) {
        doc.setFillColor(189, 195, 199);
        doc.rect(14 + doneW + progW, yPos, restW, barHeight, 'F');
      }

      // Chú thích (Legend)
      yPos += 16;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(`Completed: ${((stats.done / total) * 100).toFixed(0)}%`, 14, yPos);
      doc.text(`In Progress: ${((stats.inProgress / total) * 100).toFixed(0)}%`, 60, yPos);
      doc.text(`To Do: ${((stats.todo / total) * 100).toFixed(0)}%`, 110, yPos);

      // ==============================================
      // PHẦN C: GANTT CHART MINI (TIMELINE)
      // ==============================================
      yPos += 15;
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text("2. Project Timeline (Gantt)", 14, yPos);

      yPos += 10;

      // 1. Tìm ngày Start/End dự án để chia tỉ lệ
      // Lấy min StartDate và max DueDate của các task
      const dates = tasksForGantt.flatMap(t => [new Date(t.startDate), new Date(t.dueDate)]);
      const validDates = dates.filter(d => !isNaN(d));

      let minDate = new Date(); // Mặc định hôm nay
      let maxDate = new Date();
      maxDate.setDate(minDate.getDate() + 30); // Mặc định +30 ngày

      if (validDates.length > 0) {
        minDate = new Date(Math.min(...validDates));
        maxDate = new Date(Math.max(...validDates));
      }

      // Padding thêm 2 ngày cho thoáng
      maxDate.setDate(maxDate.getDate() + 2);

      const totalDuration = (maxDate - minDate);
      const chartWidth = 170; // Độ rộng biểu đồ
      const pxPerMs = chartWidth / totalDuration; // Tỉ lệ px trên mili-giây

      // Vẽ khung thời gian
      doc.setDrawColor(200);
      doc.line(20, yPos, 20, yPos + (Math.min(tasksForGantt.length, 10) * 8) + 5); // Trục dọc
      doc.line(20, yPos + (Math.min(tasksForGantt.length, 10) * 8) + 5, 190, yPos + (Math.min(tasksForGantt.length, 10) * 8) + 5); // Trục ngang

      // Vẽ từng Task (Max 10 task để không tràn trang)
      const topTasks = tasksForGantt.slice(0, 10);

      topTasks.forEach((task, index) => {
        const rowY = yPos + (index * 8) + 2;

        const tStart = task.startDate ? new Date(task.startDate) : new Date();
        const tEnd = task.dueDate ? new Date(task.dueDate) : new Date();

        // Tính vị trí X và chiều dài W
        const offsetMs = tStart - minDate;
        const durationMs = tEnd - tStart;

        let barX = 20 + (offsetMs * pxPerMs);
        let barW = durationMs * pxPerMs;

        // Giới hạn không vẽ lố
        if (barX < 20) barX = 20;
        if (barW < 2) barW = 2; // Tối thiểu 2px

        // Màu sắc dựa trên status
        if (task.progress === 100) doc.setFillColor(46, 204, 113); // Xanh lá
        else if (task.progress > 0) doc.setFillColor(52, 152, 219); // Xanh dương
        else doc.setFillColor(189, 195, 199); // Xám

        // Vẽ thanh Gantt
        doc.roundedRect(barX, rowY, barW, 5, 1, 1, 'F');

        // Tên task bên trái
        doc.setFontSize(8);
        doc.setTextColor(80);
        // Cắt tên task nếu dài quá
        const taskName = task.title.length > 15 ? task.title.substring(0, 15) + "..." : task.title;
        doc.text(taskName, 18, rowY + 3.5, { align: 'right' });
      });

      // Nếu còn task chưa vẽ hết
      if (tasksForGantt.length > 10) {
        doc.setFontSize(8);
        doc.text(`...and ${tasksForGantt.length - 10} more tasks`, 100, yPos + (10 * 8) + 10, { align: 'center' });
      }

      // ==============================================
      // PHẦN D: BẢNG SỐ LIỆU CHI TIẾT (AUTO TABLE)
      // ==============================================
      // Cập nhật lại Y sau khi vẽ Gantt
      let finalY = yPos + (Math.min(tasksForGantt.length, 10) * 8) + 25;

      // Nếu sắp hết trang thì qua trang mới
      if (finalY > 250) {
        doc.addPage();
        finalY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text("3. Member Workload Details", 14, finalY);

      const memberData = workload.map(u => [
        u.name,
        u.role === 'subleader' ? 'Sub-Leader' : 'Member',
        u.totalTasks,
        u.completedTasks,
        `${u.totalTasks > 0 ? ((u.completedTasks / u.totalTasks) * 100).toFixed(0) : 0}%`
      ]);

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Member Name', 'Role', 'Assigned', 'Done', 'Rate']],
        body: memberData,
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] }, // Màu tối sang trọng
        styles: { fontSize: 10, cellPadding: 3 }
      });

      // 3. LƯU FILE
      doc.save(`${pName}_Analytical_Report.pdf`);
      message.success({ content: "Đã xuất báo cáo chi tiết!", key: "export" });

    } catch (error) {
      console.error("PDF ERROR:", error);
      message.error({ content: "Lỗi tạo báo cáo", key: "export" });
    }
  };

  // Task modal handlers
  const openCreateTaskModal = () => {
    setSelectedTaskToEdit(null);
    setIsTaskModalOpen(true);
  };
  const openEditTaskModal = (task) => {
    setSelectedTaskToEdit(task);
    setIsTaskModalOpen(true);
  };
  const closeTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTaskToEdit(null);
  };
  const handleTaskDataRefresh = () => {
    fetchProjectData();
  };
  const handleTaskSaved = () => {
    handleTaskDataRefresh();
    closeTaskModal();
  };

  // Upload handler
  const handleUploadChange = async ({ file: fileInfo }) => {
    const file = fileInfo.originFileObj;
    if (fileInfo.status === 'uploading') return;

    if (fileInfo.status === 'done' || file) {
      try {
        const res = await TaskService.uploadProjectAttachment(projectId, file);
        const newAttachment = res.data.attachment;

        message.success(`${newAttachment.fileName} uploaded successfully.`);

        const uploadedFile = {
          ...newAttachment,
          uid: newAttachment.id,
          name: newAttachment.fileName,
          status: 'done',
          url: `/public/uploads/attachments/${newAttachment.filePath.split('/').pop()}`,
        };

        setFileList(prev => [uploadedFile, ...prev]);

      } catch (err) {
        message.error(err.response?.data?.message || `Failed to upload ${fileInfo.name}.`);
      }
    }
  };

  const handleDeleteFile = async (id, fileName) => {
    try {
      message.loading(`Deleting ${fileName}...`, 0.5);
      await TaskService.deleteAttachment(id);
      setFileList(fileList.filter(item => item.id !== id));
      message.success("File deleted successfully.");
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to delete file.");
    }
  };

  const uploadProps = {
    name: 'attachment',
    multiple: true,
    showUploadList: false,
    onChange: handleUploadChange,
    customRequest: async (options) => {
      const { file } = options;
      try {
        await handleUploadChange({ file: { originFileObj: file, status: 'done', name: file.name } });
      } catch (e) {
        options.onError(e);
      }
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="alert alert-danger m-4">{error}</div>;
  if (!projectData) return <div className="p-4">Project not found.</div>;

  // 💡 KIỂM TRA QUYỀN LEADER CỦA DỰ ÁN
  const isProjectLeader = user.role === "leader" && user.id === projectData.leaderId;

  // Progress calculation
  const totalTasks = projectData.tasks.length;
  const maxPosition = Math.max(...projectData.statuses.map((s) => s.position));
  const completedTasks = projectData.tasks.filter(
    (t) => t.status && t.status.position === maxPosition
  ).length;

  const TaskProgress = ({ completedTasks, totalTasks }) => {
    const percent = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
    return (
      <Progress
        percent={percent}
        format={(percent) => `${Math.round(percent)}%`}
        strokeWidth={10}
        status={percent === 100 ? 'success' : 'active'}
      />
    );
  };

  // Áp dụng logic lọc mới từ state filters
  const filteredTasks = projectData.tasks.filter((task) => {
    let matches = true;

    // Lọc theo Key/Summary (key)
    if (filters.key) {
      const key = filters.key.toLowerCase();
      // Giả sử key filter tìm kiếm trong title và description
      matches = matches && (task.title.toLowerCase().includes(key) || (task.description && task.description.toLowerCase().includes(key)));
    }

    // Lọc theo Priority
    if (filters.priority && filters.priority !== 'All') { // 💡 Bổ sung check 'All'
      matches = matches && (task.priority === filters.priority);
    }

    // Lọc theo Assignee ID
    if (filters.assigneeId) {
      // filters.assigneeId là số (number) hoặc undefined.
      // Chú ý: task.assigneeId có thể là null, cần kiểm tra an toàn.
      matches = matches && (task.assigneeId === Number(filters.assigneeId));
    }

    // Lọc theo Due Date (filters.dueDate là YYYY-MM-DD)
    if (filters.dueDate) {
      // Lấy phần ngày tháng (YYYY-MM-DD) từ task.dueDate (ISO string)
      const taskDueDate = task.dueDate ? task.dueDate.split('T')[0] : null;
      matches = matches && (taskDueDate === filters.dueDate);
    }

    return matches;
  });

  // Tab 1: Tasks
  const TasksTabContent = () => (
    <>
      <div style={{ marginBottom: 15 }}>
        <TaskFilter
          onSearch={handleFilterChange}
          projectData={projectData}
        />
      </div>


      {/* 2. Control Bar (View Switcher & Create Button) - Đặt ngay dưới Form Filter */}
      <div
        className="flex justify-end items-center mb-4"
        style={{ display: 'flex', flexDirection: "row-reverse", justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}
      >
        <Segmented
          value={viewMode}
          onChange={setViewMode}
          options={[
            { label: "List", value: "list", icon: <UnorderedListOutlined /> },
            { label: "Board", value: "board", icon: <AppstoreOutlined /> },
          ]}
          className="view-switcher"
        />

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateTaskModal}
        >
          Create Task
        </Button>
      </div>
      {/* Kết thúc thanh hợp nhất */}


      <div style={{ marginTop: 20 }}>
        {viewMode === "list" ? (
          <TaskListView tasks={filteredTasks} onTaskClick={openEditTaskModal} />
        ) : (
          <div className="kanban-board-container">
            {projectData.statuses.map((status) => {
              const columnTasks = filteredTasks.filter((t) => t.statusId === status.id);
              return (
                <div key={status.id} className="kanban-column">
                  <div className="kanban-column-header">
                    <span>{status.name}</span>
                    <span>{columnTasks.length}</span>
                  </div>

                  <div className="kanban-task-list">
                    {columnTasks.length > 0 ? (
                      columnTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onCardClick={() => openEditTaskModal(task)}
                        />
                      ))
                    ) : (
                      <div className="text-center mt-4" style={{ color: "#999", fontSize: "13px" }}>
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  // Tab 2: Documents
  const DocumentsTabContent = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '20px' }}>
      <Dragger {...uploadProps} style={{ marginBottom: 30, background: '#fafafa' }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined style={{ color: '#1890ff' }} />
        </p>
        <p className="ant-upload-text">Click or drag files here to upload</p>
        <p className="ant-upload-hint">
          Upload documents related to the entire project.
        </p>
      </Dragger>

      <h4 style={{ marginBottom: 15 }}>Project Documents ({fileList.length})</h4>
      <List
        itemLayout="horizontal"
        dataSource={fileList}
        renderItem={(item) => (
          <List.Item
            style={{ padding: '15px', background: '#fff', marginBottom: '10px', borderRadius: '8px', border: '1px solid #eee' }}
            actions={[
              <Button type="text" icon={<DownloadOutlined />} href={item.url} target="_blank">Download</Button>,
              <Popconfirm title="Are you sure you want to delete this file?" onConfirm={() => handleDeleteFile(item.id, item.name)}>
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ]}
          >
            <List.Item.Meta
              avatar={<FileTextOutlined style={{ fontSize: '28px', color: '#52c41a' }} />}
              title={<a href={item.url} target="_blank">{item.name}</a>}
              description={`Size: ${(item.fileSize / 1024).toFixed(0)} KB • Uploaded: ${new Date(item.uploadedAt).toLocaleDateString()}`}
            />
          </List.Item>
        )}
      />
    </div>
  );

  const items = [
    {
      key: '1',
      label: 'Tasks',
      children: <TasksTabContent />,
    },
    {
      key: '2',
      label: 'Documents & Attachments',
      children: <DocumentsTabContent />,
    },
  ];

  return (
    <div style={{ padding: "20px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: "28px", marginBottom: "5px" }}>{projectData.name}</h1>
          <p style={{ color: "#666", margin: 0 }}>{projectData.description || "No description"}</p>

          <div style={{ maxWidth: 400, marginTop: 10 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between', // Đẩy 2 bên
              alignItems: 'center',
              marginBottom: 4,
              width: '100%' // ✅ Bắt buộc giãn hết chiều rộng
            }}>
              <Text strong style={{ fontSize: 13 }}>Project Progress</Text>

              {/* ✅ Thêm paddingLeft để tạo khoảng cách an toàn */}
              <Text type="secondary" style={{ fontSize: 13, paddingLeft: '12px', fontWeight: 'bold' }}>
                {projectData.progress ? projectData.progress.toFixed(2) : '0.00'}%
              </Text>
            </div>
            <Progress
              percent={projectData.progress || 0}
              strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
              strokeWidth={10} // Tăng độ dày một chút cho đẹp
              showInfo={false}
              status="active"
            />
          </div>

          {/* 💡 BỔ SUNG: HIỂN THỊ WORKLOAD FACTOR */}
          <p style={{ color: "#000", fontWeight: 'bold', marginTop: '5px' }}>
            Workload Factor: <span style={{ color: '#1890ff' }}>{projectData.workloadFactor ? projectData.workloadFactor.toFixed(1) : '1.0'}x</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>

          {/* 💡 BỔ SUNG: NÚT PROJECT SETTINGS (CHO LEADER) */}
          {isProjectLeader && (
            <Button
              icon={<FaCog />}
              type="default"
              onClick={() => setIsSettingsModalVisible(true)} // Mở modal
            >
              Project Settings
            </Button>
          )}

          {isProjectLeader && (
            <Button
              icon={<BarChartOutlined />}
              type="default"
              onClick={handleExportReport}
            >
              Export Workload Report
            </Button>
          )}

          {isProjectLeader && (
            <Link to={`/team-management/${projectId}`} style={{ textDecoration: 'none' }}>
              <Button icon={<FaUsersCog />}> Team Management </Button>
            </Link>
          )}

          {isProjectLeader && (
            <Link to={`/project-rules/${projectId}`} style={{ textDecoration: 'none' }}>
              <Button icon={<FaRegListAlt />} type="primary"> Assignment Rules </Button>
            </Link>
          )}
        </div>
      </div>

      {projectData && projectData.tasks && (
        <CriticalPathVisualizer tasks={projectData.tasks} />
      )}

      <Tabs defaultActiveKey="1" items={items} style={{ marginTop: '10px' }} />

      {isTaskModalOpen && (
        <TaskModal
          taskId={selectedTaskToEdit ? selectedTaskToEdit.id : null}
          projectId={projectData.id}
          members={projectData.members}
          statuses={projectData.statuses}
          onClose={closeTaskModal}
          onTaskChanged={handleTaskSaved}
          onTaskRefreshed={handleTaskDataRefresh}
        />
      )}

      {/* 💡 BỔ SUNG: RENDER PROJECT SETTINGS MODAL */}
      {isSettingsModalVisible && (
        <ProjectSettingsModal
          visible={isSettingsModalVisible}
          onCancel={() => setIsSettingsModalVisible(false)}
          project={projectData}
          onUpdated={handleProjectDataRefresh} // Gọi lại hàm fetchProjectData để lấy workloadFactor mới
        />
      )}
    </div>
  );
};

export default ProjectDetail;