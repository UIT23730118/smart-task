// /src/pages/ProjectDetail.jsx 

import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button, Segmented, Progress, Tabs, Upload, List, message, Popconfirm, Typography } from "antd"; // Đã thêm Typography
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
import TaskFilter from "../components/Task/TaskFilter";
import { useAuth } from "../context/AuthContext";
import ProjectSettingsModal from '../components/Project/ProjectSettingsModal';
import { FaUsersCog, FaRegListAlt, FaCog } from "react-icons/fa";

const { Dragger } = Upload;
const { Text } = Typography; // Khai báo Text để dùng cho đẹp

const ProjectDetail = () => {
  const { id: projectId } = useParams();
  const { user } = useAuth();

  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({});
  const [viewMode, setViewMode] = useState("list");

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskToEdit, setSelectedTaskToEdit] = useState(null);

  const [fileList, setFileList] = useState([]);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

  const handleFilterChange = (newFilters) => {
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

  const handleProjectDataRefresh = () => {
    fetchProjectData();
  };

  useEffect(() => {
    fetchProjectData();
    fetchProjectAttachments();
  }, [projectId]);

  const handleExportReport = async () => {
    try {
      message.loading('Preparing report...', 0);
      const response = await ProjectService.exportWorkloadReport(projectId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filenameHeader = response.headers['content-disposition'];
      let filename = `workload_report_${projectId}.csv`;
      if (filenameHeader) {
        const matches = filenameHeader.match(/filename="(.+?)"/);
        if (matches && matches[1]) filename = matches[1];
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.destroy();
      message.success('Report downloaded successfully!');
    } catch (error) {
      message.destroy();
      let errorMessage = 'Failed to export report.';
      if (error.response && error.response.data instanceof Blob) {
        const errorText = await error.response.data.text();
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch (e) { }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      message.error(errorMessage);
    }
  };

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

  const isProjectLeader = user.role === "leader" && user.id === projectData.leaderId;

  // --- LOGIC LỌC TASK ---
  const filteredTasks = projectData.tasks.filter((task) => {
    let matches = true;
    if (filters.key) {
      const key = filters.key.toLowerCase();
      matches = matches && (task.title.toLowerCase().includes(key) || (task.description && task.description.toLowerCase().includes(key)));
    }
    if (filters.priority && filters.priority !== 'All') {
      matches = matches && (task.priority === filters.priority);
    }
    if (filters.assigneeId) {
      matches = matches && (task.assigneeId === Number(filters.assigneeId));
    }
    if (filters.dueDate) {
      const taskDueDate = task.dueDate ? task.dueDate.split('T')[0] : null;
      matches = matches && (taskDueDate === filters.dueDate);
    }
    return matches;
  });

  // Tab 1: Tasks
  const TasksTabContent = () => (
    <>
      <div style={{ marginBottom: 15 }}>
        <TaskFilter onSearch={handleFilterChange} projectData={projectData} />
      </div>

      <div className="flex justify-end items-center mb-4" style={{ display: 'flex', flexDirection: "row-reverse", justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
        <Segmented
          value={viewMode}
          onChange={setViewMode}
          options={[
            { label: "List", value: "list", icon: <UnorderedListOutlined /> },
            { label: "Board", value: "board", icon: <AppstoreOutlined /> },
          ]}
          className="view-switcher"
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTaskModal}>
          Create Task
        </Button>
      </div>

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
                        <TaskCard key={task.id} task={task} onCardClick={() => openEditTaskModal(task)} />
                      ))
                    ) : (
                      <div className="text-center mt-4" style={{ color: "#999", fontSize: "13px" }}>Empty</div>
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
        <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#1890ff' }} /></p>
        <p className="ant-upload-text">Click or drag files here to upload</p>
        <p className="ant-upload-hint">Upload documents related to the entire project.</p>
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
    { key: '1', label: 'Tasks', children: <TasksTabContent /> },
    { key: '2', label: 'Documents & Attachments', children: <DocumentsTabContent /> },
  ];

  return (
    <div style={{ padding: "20px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: "28px", marginBottom: "5px" }}>{projectData.name}</h1>
          <p style={{ color: "#666", margin: 0 }}>{projectData.description || "No description"}</p>


          {/* 💡 👇 [NEW] THANH PROJECT PROGRESS MỚI THÊM VÀO ĐÂY 👇 */}
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
          {/* ------------------------------------------------------- */}

        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {isProjectLeader && (
            <Button icon={<FaCog />} type="default" onClick={() => setIsSettingsModalVisible(true)}>
              Project Settings
            </Button>
          )}
          {isProjectLeader && (
            <Button icon={<BarChartOutlined />} type="default" onClick={handleExportReport}>
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

      {isSettingsModalVisible && (
        <ProjectSettingsModal
          visible={isSettingsModalVisible}
          onCancel={() => setIsSettingsModalVisible(false)}
          project={projectData}
          onUpdated={handleProjectDataRefresh}
        />
      )}
    </div>
  );
};

export default ProjectDetail;