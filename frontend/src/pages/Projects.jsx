// /src/pages/Projects.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ProjectService from '../api/project.service';
import ProjectCard from '../components/Project/ProjectCard';
import CreateProjectModal from '../components/Project/CreateProjectModal';
import { FaFolderOpen } from 'react-icons/fa';

const Projects = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const response = await ProjectService.getMyProjects();
            setProjects(response.data);
        } catch (err) {
            setError('Failed to fetch projects.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleProjectCreated = () => {
        fetchProjects(); // Tải lại danh sách project
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Projects</h1>
                    <p>Manage and track all your projects</p>
                </div>
                <div>
                    {user.role === 'leader' && (
                        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                            + New Project
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <p>Loading projects...</p>
            ) : error ? (
                <div className="alert alert-danger">{error}</div>
            ) : projects.length > 0 ? (
                <div className="projects-list">
                    {projects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            ) : (
                <div className="empty-state" style={{ background: 'white', padding: '50px', borderRadius: '8px', textAlign: 'center' }}>
                    <FaFolderOpen size={40} color="#ccc" />
                    <h3 style={{ marginTop: '15px' }}>No projects yet</h3>
                    <p style={{ color: '#666' }}>Create your first project to get started</p>
                </div>
            )}

            {isModalOpen && (
                <CreateProjectModal
                    onClose={() => setIsModalOpen(false)}
                    onProjectCreated={handleProjectCreated}
                />
            )}
        </>
    );
};

export default Projects;