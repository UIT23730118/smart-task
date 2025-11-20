import React, { useState, useEffect } from 'react';
import TaskService from '../../api/task.service';

const TaskModal = ({ taskId, projectId, members, statuses, onClose, onTaskChanged }) => {
  const isEditMode = taskId != null;
  
  // Khởi tạo state
  const [formData, setFormData] = useState({
    title: '', description: '', assigneeId: '', statusId: '', 
    priority: 'Minor', startDate: '', dueDate: '', progress: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load dữ liệu khi sửa
  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      TaskService.getTaskDetails(taskId).then(res => {
        const t = res.data;
        // Format YYYY-MM-DD
        const formatDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
        setFormData({
          title: t.title, description: t.description||'', 
          assigneeId: t.assigneeId||'', priority: t.priority||'Minor', 
          statusId: t.statusId || (statuses[0] ? statuses[0].id : ''),
          startDate: formatDate(t.startDate), dueDate: formatDate(t.dueDate), 
          progress: t.progress||0
        });
      }).catch(err => setError('Lỗi tải task')).finally(() => setLoading(false));
    } else {
        // Set default status cho mode tạo mới
        if(statuses.length > 0) {
            setFormData(prev => ({ ...prev, statusId: statuses[0].id }));
        }
    }
  }, [taskId, isEditMode, statuses]);

  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = { ...formData, projectId };
      if(isEditMode) await TaskService.updateTask(taskId, payload);
      else await TaskService.createTask(payload);
      onTaskChanged();
      // Đừng đóng modal ngay nếu muốn user thấy success, ở đây ta đóng luôn cho nhanh
    } catch(err) { setError(err.message); } 
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <h2>{isEditMode ? `Task #${taskId}` : 'Tạo Task Mới'}</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {/* LEFT COLUMN: Main Info */}
          <div className="modal-main">
            <form id="taskForm" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Tiêu đề <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" name="title" value={formData.title} onChange={handleChange} required autoFocus />
                </div>
                <div className="form-group">
                    <label className="form-label">Mô tả</label>
                    <textarea className="form-control" rows="8" name="description" value={formData.description} onChange={handleChange} />
                </div>
            </form>
            {error && <div className="alert alert-danger mt-4">{error}</div>}
          </div>

          {/* RIGHT COLUMN: Meta Data */}
          <div className="modal-sidebar">
             <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select className="form-control" name="statusId" value={formData.statusId} onChange={handleChange}>
                    {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
             </div>

             <div className="form-group">
                <label className="form-label">Người thực hiện</label>
                <select className="form-control" name="assigneeId" value={formData.assigneeId} onChange={handleChange}>
                    <option value="">-- Chưa chỉ định --</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
             </div>

             <div className="form-group">
                <label className="form-label">Độ ưu tiên</label>
                <select className="form-control" name="priority" value={formData.priority} onChange={handleChange}>
                    <option value="Minor">Minor (Thấp)</option>
                    <option value="Major">Major (Vừa)</option>
                    <option value="Critical">Critical (Cao)</option>
                    <option value="Blocker">Blocker (Khẩn cấp)</option>
                </select>
             </div>

             <hr className="my-4" style={{border:0, borderTop:'1px solid #ddd'}}/>

             <div className="form-group">
                <label className="form-label">Ngày bắt đầu</label>
                <input type="date" className="form-control" name="startDate" value={formData.startDate} onChange={handleChange} />
             </div>

             <div className="form-group">
                <label className="form-label">Hạn chót (Deadline)</label>
                <input type="date" className="form-control" name="dueDate" value={formData.dueDate} onChange={handleChange} />
             </div>

             <div className="form-group">
                <label className="form-label d-flex justify-between">
                    <span>Tiến độ</span>
                    <span className="text-primary font-bold">{formData.progress}%</span>
                </label>
                <input type="range" className="w-100" name="progress" min="0" max="100" value={formData.progress} onChange={handleChange} />
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" form="taskForm" className="btn btn-primary" disabled={loading}>
                {loading ? 'Đang lưu...' : 'Lưu lại'}
            </button>
        </div>

      </div>
    </div>
  );
};

export default TaskModal;