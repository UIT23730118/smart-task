// /src/components/Task/TaskModal.jsx
import React, { useState, useEffect } from "react";
import TaskService from "../../api/task.service";
import { useAuth } from "../../context/AuthContext"; // Để lấy user hiện tại cho comment

const TaskModal = ({
  taskId,
  projectId,
  members,
  statuses,
  onClose,
  onTaskChanged,
}) => {
  const { user } = useAuth();
  const isEditMode = taskId != null;

  // State cho Task Data
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigneeId: "",
    statusId: "",
    priority: "Minor",
    startDate: "",
    dueDate: "",
    progress: 0,
  });

  // State cho Comments
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // State UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- LOAD DATA ---
  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      TaskService.getTaskDetails(taskId)
        .then((res) => {
          const t = res.data;
          const formatDate = (d) =>
            d ? new Date(d).toISOString().split("T")[0] : "";

          setFormData({
            title: t.title,
            description: t.description || "",
            assigneeId: t.assigneeId || "",
            priority: t.priority || "Minor",
            statusId: t.statusId || (statuses.length > 0 ? statuses[0].id : ""),
            startDate: formatDate(t.startDate),
            dueDate: formatDate(t.dueDate),
            progress: t.progress || 0,
          });

          // Load comments
          setComments(t.comments || []);
        })
        .catch((err) => {
          console.error(err);
          setError(
            "Lỗi tải task: " + (err.response?.data?.message || err.message)
          );
        })
        .finally(() => setLoading(false));
    } else {
      // Mode Tạo mới: Set default
      if (statuses.length > 0) {
        setFormData((prev) => ({ ...prev, statusId: statuses[0].id }));
      }
    }
  }, [taskId, isEditMode, statuses]); // Thêm statuses vào dependency

  // --- HANDLERS ---
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { ...formData, projectId };
      // Convert empty string assignee to null
      if (payload.assigneeId === "") payload.assigneeId = null;

      if (isEditMode) await TaskService.updateTask(taskId, payload);
      else await TaskService.createTask(payload);

      onTaskChanged(); // Refresh board
      // Không đóng modal ngay để user thấy kết quả, hoặc đóng luôn tùy bạn
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setCommentLoading(true);
    try {
      const res = await TaskService.addComment(taskId, newComment);
      // Thêm comment mới vào list hiện tại (giả lập để không cần gọi lại API load task)
      const addedComment = {
        ...res.data,
        user: { name: user.name, id: user.id }, // Giả lập user info để hiện ngay
      };
      setComments([...comments, addedComment]);
      setNewComment("");
    } catch (err) {
      alert("Lỗi gửi comment: " + err.message);
    } finally {
      setCommentLoading(false);
    }
  };

  // Nếu statuses chưa load kịp
  const safeStatuses = statuses || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>{isEditMode ? `Task #${taskId}` : "Tạo Task Mới"}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-danger" style={{ margin: "0 20px 10px" }}>
            {error}
          </div>
        )}

        <div className="modal-body">
          {/* LEFT COLUMN: Main Info & Comments */}
          <div className="modal-main">
            {/* Form Chính */}
            <div className="form-group">
              <label className="form-label">
                Tiêu đề <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mô tả</label>
              <textarea
                className="form-control"
                rows="5"
                name="description"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            {/* Khu vực Comment (Chỉ hiện khi Edit mode) */}
            {isEditMode && (
              <div
                style={{
                  marginTop: "30px",
                  borderTop: "1px solid #eee",
                  paddingTop: "20px",
                }}
              >
                <h4 style={{ fontSize: "16px", margin: "0 0 15px 0" }}>
                  Bình luận
                </h4>

                {/* Danh sách Comment */}
                <div
                  style={{
                    maxHeight: "200px",
                    overflowY: "auto",
                    marginBottom: "15px",
                  }}
                >
                  {comments.length === 0 && (
                    <p className="text-muted" style={{ fontSize: "13px" }}>
                      Chưa có bình luận nào.
                    </p>
                  )}
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        marginBottom: "10px",
                        display: "flex",
                        gap: "10px",
                      }}
                    >
                      <div
                        className="member-avatar"
                        style={{
                          width: "30px",
                          height: "30px",
                          fontSize: "12px",
                        }}
                      >
                        {c.user?.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div
                        style={{
                          background: "#f4f5f7",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: "bold",
                            fontSize: "12px",
                            marginBottom: "2px",
                          }}
                        >
                          {c.user?.name || "Unknown"}
                          <span
                            style={{
                              fontWeight: "normal",
                              color: "#888",
                              marginLeft: "10px",
                              fontSize: "11px",
                            }}
                          >
                            {new Date(c.createdAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                        <div style={{ fontSize: "14px" }}>{c.message}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input Comment */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Viết bình luận..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={handleAddComment}
                    disabled={commentLoading}
                  >
                    {commentLoading ? "..." : "Gửi"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Meta Data */}
          <div className="modal-sidebar">
            <div className="form-group">
              <label className="form-label">Trạng thái</label>
              <select
                className="form-control"
                name="statusId"
                value={formData.statusId}
                onChange={handleChange}
              >
                {safeStatuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Người thực hiện</label>
              <select
                className="form-control"
                name="assigneeId"
                value={formData.assigneeId}
                onChange={handleChange}
              >
                <option value="">-- Chưa chỉ định --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Độ ưu tiên</label>
              <select
                className="form-control"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="Minor">Minor (Thấp)</option>
                <option value="Major">Major (Vừa)</option>
                <option value="Critical">Critical (Cao)</option>
                <option value="Blocker">Blocker (Khẩn cấp)</option>
              </select>
            </div>

            <hr
              className="my-4"
              style={{ border: 0, borderTop: "1px solid #ddd" }}
            />

            <div className="form-group">
              <label className="form-label">Ngày bắt đầu</label>
              <input
                type="date"
                className="form-control"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hạn chót (Deadline)</label>
              <input
                type="date"
                className="form-control"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label d-flex justify-between">
                <span>Tiến độ</span>
                <span className="text-primary font-bold">
                  {formData.progress}%
                </span>
              </label>
              <input
                type="range"
                className="w-100"
                name="progress"
                min="0"
                max="100"
                value={formData.progress}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Đang lưu..." : "Lưu lại"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
