// /src/pages/ProjectDetail.jsx 

import React, { useState, useEffect } from "react";
import authHeader from "../api/auth.header";
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
import GanttChart from "../components/Project/GanttChart";
import TaskCard from "../components/Task/TaskCard";
import TaskModal from "../components/Task/TaskModal";
import TaskListView from "../components/Project/TaskListView";
// Đã thay thế FilterBar bằng TaskFilter
import TaskFilter from "../components/Task/TaskFilter";
import { useAuth } from "../context/AuthContext";
import ProjectSettingsModal from '../components/Project/ProjectSettingsModal';
import { FaUsersCog, FaRegListAlt, FaCog } from "react-icons/fa"; // Added FaCog
import api from "../api/axios";
import autoTable from 'jspdf-autotable';
import jsPDF from "jspdf";
import { Steps, Card } from "antd";

const { Step } = Steps;

const { Dragger } = Upload;
const { Text } = Typography;

// --- COMPONENT HIỂN THỊ CHUỖI ĐƯỜNG GĂNG ---
const CriticalPathVisualizer = ({ tasks }) => {
  // 1. Lọc ra các task Critical
  const criticalTasks = tasks
    .filter(t => t.isCritical || t.slack <= 0) // Check cả slack <= 0 cho chắc
    .sort((a, b) => (a.es || 0) - (b.es || 0));

  if (criticalTasks.length === 0) return null;

  // 2. CHUẨN BỊ DATA CHO ANT DESIGN V5 (Dùng prop `items`)
  const stepItems = criticalTasks.map(task => ({
      key: task.id,
      title: <span style={{ fontWeight: 'bold' }}>{task.title}</span>,
      description: (
        <div style={{ fontSize: '11px' }}>
          <div>Duration: {task.duration}d</div>
          {task.es !== undefined && <div>Day {task.es} ➝ {task.ef}</div>}
        </div>
      ),
      status: 'error', // Màu đỏ báo động
  }));

  return (
    <Card
      title={<span style={{ color: '#cf1322', fontWeight: 'bold' }}>🔥 CRITICAL PATH FLOW</span>}
      size="small"
      style={{ marginBottom: 20, border: '1px solid #ffa39e', backgroundColor: '#fff2f0' }}
    >
      <div style={{ overflowX: 'auto', paddingBottom: 10 }}>
        {/* SỬA LẠI CHỖ NÀY: Dùng prop items thay vì children */}
        <Steps
            progressDot
            current={criticalTasks.length}
            size="small"
            items={stepItems}
        />
      </div>
      <div style={{ marginTop: 10, fontSize: '12px', color: '#666' }}>
        * These job are not allow to be late.
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

  // 💡 FUNCTION TO REFRESH DATA AFTER SETTINGS CHANGE
  const handleProjectDataRefresh = () => {
    fetchProjectData();
  };

  useEffect(() => {
    fetchProjectData();
    fetchProjectAttachments();
  }, [projectId]);

  // --- EXPORT WORKLOAD REPORT ---
  const handleExportReport = async () => {
    try {
      message.loading({ content: "Đang tải dữ liệu...", key: "export" });

      // Gọi API mới (đã sửa ở backend để trả về ngày kết thúc tính toán)
      const res = await api.get(`/projects/${projectId}/stats?_t=${Date.now()}`, {
        headers: authHeader()
      });

      // Lấy dữ liệu: stats, workload VÀ thông tin project (để lấy ngày)
      const { stats, workload, project: projectInfo } = res.data;

      const allTasks = projectData?.tasks || [];
      const projectName = projectInfo?.name || projectData?.name || "Project Report";

      if (!stats || !workload) {
        message.error("Không có dữ liệu!");
        return;
      }

      message.loading({ content: "Đang vẽ PDF...", key: "export" });

      const doc = new jsPDF();

      // --- 1. HEADER & INFO ---
      doc.setFontSize(22);
      doc.setTextColor(44, 62, 80);
      doc.setFont("helvetica", "bold");
      doc.text(String(projectName).toUpperCase(), 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");

      // --- SỬA LẠI LOGIC NGÀY THÁNG (FIX N/A) ---
      const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : 'N/A';

      // Lấy ngày Start/End từ response API mới nhất
      const startDateStr = formatDate(projectInfo?.startDate || projectData.startDate);

      // Quan trọng: projectInfo.endDate là ngày backend đã tự tính (Max Task Date)
      const endDateStr = formatDate(projectInfo?.endDate);

      const factor = projectData.workloadFactor ? projectData.workloadFactor.toFixed(1) : '1.0';

      doc.text(`Exported: ${new Date().toLocaleString()}`, 14, 26);
      doc.setTextColor(0);
      // Hiển thị Timeline chuẩn
      doc.text(`Timeline: ${startDateStr} - ${endDateStr}`, 14, 32);

      doc.text(`Workload Factor:`, 120, 32);
      doc.setTextColor(255, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text(`${factor}x`, 150, 32);

      // --- 2. KPI BOXES ---
      let yPos = 45;
      const kpiWidth = 40;
      const kpiHeight = 25;
      const gap = 6;
      const startX = 14;

      const drawKPI = (x, title, value, color) => {
        doc.setFillColor(...color);
        doc.roundedRect(x, yPos, kpiWidth, kpiHeight, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(title, x + kpiWidth / 2, yPos + 8, { align: 'center' });
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(String(value), x + kpiWidth / 2, yPos + 18, { align: 'center' });
      };

      drawKPI(startX, "TOTAL", stats.total, [52, 73, 94]);
      drawKPI(startX + kpiWidth + gap, "DONE", stats.done, [46, 204, 113]);
      drawKPI(startX + (kpiWidth + gap) * 2, "IN PROGRESS", stats.inProgress, [52, 152, 219]);
      drawKPI(startX + (kpiWidth + gap) * 3, "LATE", stats.late, [231, 76, 60]);

      // --- 3. MEMBER TABLE ---
      yPos += 35;
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text("Member Workload & Tasks", 14, yPos);

      const tableBody = workload.map(u => {
        const targetId = String(u.id || u.userId || "");

        const userTasks = allTasks.filter(t => {
           if (t.assigneeId && String(t.assigneeId) === targetId) return true;
           if (t.assignee && t.assignee.id && String(t.assignee.id) === targetId) return true;
           if (t.assignee && t.assignee.name === u.name) return true;
           return false;
        });

        const taskListString = userTasks.length > 0
            ? userTasks.map(t => {
                const statusShort = Number(t.progress) === 100 ? "[✔]" : `[${t.progress || 0}%]`;
                const cleanTitle = t.title ? t.title.replace(/\n/g, " ") : "Task";
                return `${statusShort} ${cleanTitle}`;
              }).join("\n")
            : "No active tasks";

        return [
          u.name,
          u.role === 'subleader' ? 'Sub-Leader' : 'Member',
          u.totalTasks,
          taskListString,
          u.rate || '0%' // Dùng rate backend trả về hoặc tính tay
        ];
      });

      autoTable(doc, {
        startY: yPos + 5,
        head: [['Name', 'Role', 'Total', 'Assigned Tasks', 'Rate']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80] },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 20 },
            2: { cellWidth: 10, halign: 'center' },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 15, halign: 'center' }
        },
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      });

      // --- 4. GANTT CHART (WITH GRID & DATE LABELS) ---
      let finalY = doc.lastAutoTable.finalY + 15;
      if (finalY > 200) { doc.addPage(); finalY = 20; }

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.setFont("helvetica", "bold");
      doc.text("Project Timeline Snapshot", 14, finalY);

      finalY += 15;

      // A. Tính toán thời gian min/max cho biểu đồ
      let minTime = Infinity;
      let maxTime = -Infinity;
      const validTasks = allTasks.filter(t => {
          const s = new Date(t.startDate).getTime();
          const e = new Date(t.dueDate).getTime();
          if (!isNaN(s) && !isNaN(e)) {
              if (s < minTime) minTime = s;
              if (e > maxTime) maxTime = e;
              return true;
          }
          return false;
      });

      let minDate, maxDate;
      if (validTasks.length === 0) {
         minDate = new Date();
         maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 30);
      } else {
         minDate = new Date(minTime);
         maxDate = new Date(maxTime);
      }

      minDate.setDate(minDate.getDate() - 2);
      maxDate.setDate(maxDate.getDate() + 10);

      const totalDuration = maxDate.getTime() - minDate.getTime();
      const chartWidth = 170;
      const chartStartX = 20;
      const pxPerMs = totalDuration > 0 ? (chartWidth / totalDuration) : 0;
      const chartHeight = Math.min(validTasks.length, 15) * 12 + 20;

      // B. VẼ TRỤC NGÀY & LƯỚI DỌC
      const numTicks = 6;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.setDrawColor(220);

      const xAxisY = finalY + chartHeight;
      doc.line(chartStartX, finalY, chartStartX, xAxisY);

      for (let i = 0; i <= numTicks; i++) {
        const percent = i / numTicks;
        const tickX = chartStartX + (chartWidth * percent);

        doc.setLineDash([1, 1], 0);
        doc.line(tickX, finalY, tickX, xAxisY);
        doc.setLineDash([]);

        const tickDateMs = minDate.getTime() + (totalDuration * percent);
        const d = new Date(tickDateMs);
        const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
        doc.text(dateStr, tickX, xAxisY + 5, { align: 'center' });
      }
      doc.line(chartStartX, xAxisY, chartStartX + chartWidth, xAxisY);

      // C. VẼ TASK BARS
      const tasksToDraw = validTasks.slice(0, 15);

      tasksToDraw.forEach((task, index) => {
        const rowY = finalY + (index * 12) + 5;

        const tStart = new Date(task.startDate);
        let tEnd = new Date(task.dueDate);

        if (tStart.getTime() >= tEnd.getTime()) {
            tEnd = new Date(tStart);
            tEnd.setDate(tEnd.getDate() + 1);
        }

        const barX = chartStartX + ((tStart.getTime() - minDate.getTime()) * pxPerMs);
        let barW = (tEnd.getTime() - tStart.getTime()) * pxPerMs;

        let finalX = Math.max(chartStartX, barX);
        let finalW = barW - (finalX - barX);

        if (finalX + finalW > chartStartX + chartWidth) {
            finalW = (chartStartX + chartWidth) - finalX;
        }

        if (finalW < 2 && finalX < chartStartX + chartWidth) finalW = 2;

        if (finalW > 0 && finalX >= chartStartX) {
            const slacks = allTasks.filter(t => t.slack !== undefined).map(t => t.slack);
            const minSlack = slacks.length > 0 ? Math.min(...slacks) : 0;
            const currentSlack = (task.slack !== undefined) ? task.slack : 0;
            const isCritical = task.isCritical === true || currentSlack <= 0 || currentSlack === minSlack;

            if (isCritical) doc.setFillColor(255, 77, 79);
            else if (Number(task.progress) === 100) doc.setFillColor(82, 196, 26);
            else doc.setFillColor(24, 144, 255);

            doc.roundedRect(finalX, rowY, finalW, 7, 1, 1, 'F');

            doc.setTextColor(80);
            doc.setFontSize(7);
            const originEnd = new Date(task.dueDate);
            const dateRangeText = `${tStart.getDate()}/${tStart.getMonth()+1} - ${originEnd.getDate()}/${originEnd.getMonth()+1}`;
            doc.text(dateRangeText, finalX + finalW + 2, rowY + 5);
        }

        doc.setTextColor(0);
        doc.setFontSize(8);
        const tName = task.title.length > 18 ? task.title.substring(0, 18) + ".." : task.title;
        doc.text(String(tName), chartStartX - 2, rowY + 5, { align: 'right' });
      });

      doc.save(`${String(projectName).replace(/\s+/g, '_')}_Report.pdf`);
      message.success({ content: "Xuất báo cáo thành công!", key: "export" });

    } catch (error) {
      console.error("PDF ERROR:", error);
      message.error({ content: "Lỗi xuất báo cáo", key: "export" });
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

  // 💡 CHECK PROJECT LEADER PERMISSION
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

  // Apply new filtering logic from the filters state
  const filteredTasks = projectData.tasks.filter((task) => {
    let matches = true;

    // Filter by Key/Summary (key)
    if (filters.key) {
      const key = filters.key.toLowerCase();
      // Assume key filter searches in title and description
      matches = matches && (task.title.toLowerCase().includes(key) || (task.description && task.description.toLowerCase().includes(key)));
    }

    // Filter by Priority
    if (filters.priority && filters.priority !== 'All') { // 💡 Added check for 'All'
      matches = matches && (task.priority === filters.priority);
    }

    // Filter by Assignee ID
    if (filters.assigneeId) {
      // filters.assigneeId is a number or undefined.
      // Note: task.assigneeId can be null, safe check is needed.
      matches = matches && (task.assigneeId === Number(filters.assigneeId));
    }

    // Filter by Due Date (filters.dueDate is YYYY-MM-DD)
    if (filters.dueDate) {
      // Get the date part (YYYY-MM-DD) from task.dueDate (ISO string)
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


      {/* 2. Control Bar (View Switcher & Create Button) - Place right under the Filter Form */}
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
            { label: "Gantt", value: "gantt", icon: <BarChartOutlined /> },
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
      {/* End of combined bar */}


      <div style={{ marginTop: 20 }}>

        {/* 1. VIEW LIST */}
        {viewMode === "list" && (
          <TaskListView tasks={filteredTasks} onTaskClick={openEditTaskModal} />
        )}

        {/* 2. VIEW BOARD (KANBAN) - Code cũ của bạn nằm ở đây */}
        {viewMode === "board" && (
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

        {/* 3. VIEW GANTT CHART - Mới thêm vào */}
        {viewMode === "gantt" && (
           <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              {/* Truyền filteredTasks vào để Gantt cũng ăn theo bộ lọc tìm kiếm/priority */}
              <GanttChart tasks={filteredTasks} />
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
              justifyContent: 'space-between', // Push to both sides
              alignItems: 'center',
              marginBottom: 4,
              width: '100%' // ✅ Must span full width
            }}>
              <Text strong style={{ fontSize: 13 }}>Project Progress</Text>

              {/* ✅ Add paddingLeft for safe spacing */}
              <Text type="secondary" style={{ fontSize: 13, paddingLeft: '12px', fontWeight: 'bold' }}>
                {projectData.progress ? projectData.progress.toFixed(2) : '0.00'}%
              </Text>
            </div>
            <Progress
              percent={projectData.progress || 0}
              strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
              strokeWidth={10} // Increase thickness a bit for aesthetics
              showInfo={false}
              status="active"
            />
          </div>

          {/* 💡 ADDITION: DISPLAY WORKLOAD FACTOR */}
          <p style={{ color: "#000", fontWeight: 'bold', marginTop: '5px' }}>
            Workload Factor: <span style={{ color: '#1890ff' }}>{projectData.workloadFactor ? projectData.workloadFactor.toFixed(1) : '1.0'}x</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>

          {/* 💡 ADDITION: PROJECT SETTINGS BUTTON (FOR LEADER) */}
          {isProjectLeader && (
            <Button
              icon={<FaCog />}
              type="default"
              onClick={() => setIsSettingsModalVisible(true)} // Open modal
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
          tasks={projectData?.tasks || []}
          onClose={closeTaskModal}
          onTaskChanged={handleTaskSaved}
          onTaskRefreshed={handleTaskDataRefresh}
        />
      )}

      {/* 💡 ADDITION: RENDER PROJECT SETTINGS MODAL */}
      {isSettingsModalVisible && (
        <ProjectSettingsModal
          visible={isSettingsModalVisible}
          onCancel={() => setIsSettingsModalVisible(false)}
          project={projectData}
          onUpdated={handleProjectDataRefresh} // Call fetchProjectData again to get the new workloadFactor
        />
      )}
    </div>
  );
};

export default ProjectDetail;