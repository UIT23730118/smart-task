// /src/pages/ProjectDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button, Segmented, Progress } from "antd";
import { PlusOutlined, UnorderedListOutlined, AppstoreOutlined } from "@ant-design/icons";
import ProjectService from "../api/project.service";
// Import components
import TaskCard from "../components/Task/TaskCard";
import TaskModal from "../components/Task/TaskModal";
import TaskListView from "../components/Project/TaskListView"; // <-- IMPORT MỚI
import FilterBar from "../components/Project/FilterBar";
import { useAuth } from "../context/AuthContext";

// Icons
import {
  FaUsersCog,
} from "react-icons/fa";

const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // State lọc & View
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [viewMode, setViewMode] = useState("list"); // "board" hoặc "list"

  // State Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskToEdit, setSelectedTaskToEdit] = useState(null);

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      const response = await ProjectService.getProjectDetails(id);
      setProjectData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load project.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  // Handlers Modal
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
  const handleTaskSaved = () => {
    fetchProjectData();
    closeTaskModal();
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="alert alert-danger m-4">{error}</div>;
  if (!projectData) return <div className="p-4">Project not found.</div>;

  // Logic Tính toán
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
        format={(percent) => `${Math.round(percent)}%`}   // Chỉ hiện phần trăm
        strokeWidth={10}
        status={percent === 100 ? 'success' : 'active'}
      />
    );
  };

  // Logic Lọc Task
  const filteredTasks = projectData.tasks.filter((task) => {
    const matchesSearch = task.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesAssignee =
      filterAssignee === "all" ||
      (task.assignee && task.assignee.id === parseInt(filterAssignee));
    return matchesSearch && matchesAssignee;
  });

  return (
    <div
      style={{
        padding: "20px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: "28px", marginBottom: "5px" }}>
            {projectData.name}
          </h1>
          <p style={{ color: "#666", margin: 0 }}>
            {projectData.description || "Không có mô tả"}
          </p>
        </div>
        <div>
          {user.role === "leader" && (
            <Link to="/team" className="btn btn-outline">
              {" "}
              <FaUsersCog /> Quản lý Team{" "}
            </Link>
          )}
        </div>
      </div>

      {/* META INFO */}
      <div className="project-meta-bar">
        <h4>Progress</h4>
        <TaskProgress completedTasks={completedTasks} totalTasks={totalTasks} />
      </div>

      {/* FILTER & ACTIONS BAR */}
      <div className="filter-bar">
        <FilterBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterAssignee={filterAssignee} setFilterAssignee={setFilterAssignee} projectData={projectData} />

        {/* --- VIEW SWITCHER (Nút chuyển Board/List) --- */}
        <div
          style={{
            display: "flex",
            "flex-direction": "row-reverse",
          }}
        >
          <Segmented
            value={viewMode}
            onChange={setViewMode}
            options={[
              { label: "List", value: "list", icon: <UnorderedListOutlined /> },
              { label: "Board", value: "board", icon: <AppstoreOutlined /> },
            ]}
          />
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTaskModal}>
          Add New Task
        </Button>
      </div>

      {/* MAIN CONTENT AREA (Chuyển đổi giữa Kanban và List) */}
      <div style={{ marginTop: 20 }}>
        {viewMode === "list" ? (
          <TaskListView tasks={filteredTasks} onTaskClick={openEditTaskModal} />
        ) : (
          <div className="kanban-board-container">
            {projectData.statuses.map((status) => {
              const columnTasks = filteredTasks.filter(
                (t) => t.statusId === status.id
              );
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
                      <div
                        className="text-center mt-4"
                        style={{ color: "#999", fontSize: "13px" }}
                      >
                        Trống
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TASK FORM MODAL */}
      {isTaskModalOpen && (
        <TaskModal
          taskId={selectedTaskToEdit ? selectedTaskToEdit.id : null}
          projectId={projectData.id}
          members={projectData.members}
          statuses={projectData.statuses}
          onClose={closeTaskModal}
          onTaskChanged={handleTaskSaved}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
