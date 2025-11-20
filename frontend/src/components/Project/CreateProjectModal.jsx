import React, { useState } from 'react';
import ProjectService from '../../api/project.service';
import { FaFolderPlus, FaTimes } from 'react-icons/fa';

const CreateProjectModal = ({ onClose, onProjectCreated }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await ProjectService.createProject({ name, description });
            onProjectCreated();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Tạo project thất bại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            {/* Sử dụng modal-box nhưng giới hạn width nhỏ hơn modal task */}
            <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ width: '500px', height: 'auto', maxHeight: '90vh' }}>

                {/* Header */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaFolderPlus style={{ color: '#007bff', fontSize: '20px' }} />
                        <h3 style={{ margin: 0 }}>Tạo Project Mới</h3>
                    </div>
                    <button className="btn btn-outline" onClick={onClose} style={{ padding: '5px 10px', border: 'none' }}>
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body" style={{ display: 'block', padding: '20px', overflow: 'visible' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Tên dự án <span style={{ color: 'red' }}>*</span></label>
                            <input
                                type="text"
                                className="form-control"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ví dụ: Website E-commerce..."
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mô tả</label>
                            <textarea
                                className="form-control"
                                rows="4"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Mô tả ngắn gọn về mục tiêu dự án..."
                            />
                        </div>

                        {error && <div className="alert alert-danger" style={{ marginTop: '10px' }}>{error}</div>}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                            <button type="button" onClick={onClose} className="btn btn-secondary">Hủy</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Đang tạo...' : 'Tạo Project'}
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default CreateProjectModal;