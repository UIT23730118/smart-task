// /src/pages/ProjectDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import ProjectService from "../api/project.service";
// Import components
import TaskCard from "../components/Task/TaskCard";
import TaskModal from "../components/Task/TaskModal";
import TaskListView from "../components/Project/TaskListView"; // <-- IMPORT MỚI
import { useAuth } from "../context/AuthContext";

// Icons
import {
  FaUsersCog,
  FaCalendarAlt,
  FaUserTie,
  FaSearch,
  FaFilter,
  FaPlus,
  FaList,
  FaColumns,
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
  const [viewMode, setViewMode] = useState("board"); // "board" hoặc "list"

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
  const projectProgress =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

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
        <div className="meta-item">
          <FaUserTie style={{ color: "#007bff" }} />
          <span style={{ fontWeight: 500 }}>
            {projectData.leader ? projectData.leader.name : "No Leader"}
          </span>
        </div>
        <div className="meta-item">
          <FaCalendarAlt style={{ color: "#6c757d" }} />
          <span>
            {new Date(projectData.startDate).toLocaleDateString("vi-VN")}
          </span>
        </div>
        <div className="project-progress-container">
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#333" }}>
            Tiến độ: {projectProgress}%
          </span>
          <div className="project-progress-track">
            <div
              className="project-progress-fill"
              style={{ width: `${projectProgress}%` }}
            ></div>
          </div>
          <span style={{ fontSize: "12px", color: "#666" }}>
            ({completedTasks}/{totalTasks} tasks)
          </span>
        </div>
      </div>

      {/* FILTER & ACTIONS BAR */}
      <div className="filter-bar">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            position: "relative",
          }}
        >
          <FaSearch
            style={{ position: "absolute", left: "10px", color: "#aaa" }}
          />
          <input
            type="text"
            className="search-input"
            placeholder="Tìm kiếm..."
            style={{ paddingLeft: "30px" }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flex: 1,
          }}
        >
          <FaFilter style={{ color: "#666" }} />
          <select
            className="filter-select"
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
          >
            <option value="all">Tất cả thành viên</option>
            {projectData.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* --- VIEW SWITCHER (Nút chuyển Board/List) --- */}
        <div
          style={{
            display: "flex",
            border: "1px solid #ddd",
            borderRadius: "4px",
            overflow: "hidden",
            marginRight: "10px",
          }}
        >
          <button
            onClick={() => setViewMode("board")}
            style={{
              padding: "6px 12px",
              background: viewMode === "board" ? "#e3f2fd" : "white",
              border: "none",
              cursor: "pointer",
              color: viewMode === "board" ? "#007bff" : "#666",
              borderRight: "1px solid #ddd",
            }}
          >
            <FaColumns /> Board
          </button>
          <button
            onClick={() => setViewMode("list")}
            style={{
              padding: "6px 12px",
              background: viewMode === "list" ? "#e3f2fd" : "white",
              border: "none",
              cursor: "pointer",
              color: viewMode === "list" ? "#007bff" : "#666",
            }}
          >
            <FaList /> List
          </button>
        </div>

        <button className="btn btn-primary" onClick={openCreateTaskModal}>
          <FaPlus style={{ marginRight: "5px" }} /> Tạo Task Mới
        </button>
      </div>

      {/* MAIN CONTENT AREA (Chuyển đổi giữa Kanban và List) */}
      <div style={{ flex: 1, overflow: "hidden", marginTop: "10px" }}>
        {viewMode === "board" ? (
          // 1. KANBAN VIEW
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
        ) : (
          // 2. LIST VIEW (TABLE)
          <TaskListView tasks={filteredTasks} onTaskClick={openEditTaskModal} />
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
