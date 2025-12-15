///src/pages/Projects.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ProjectService from '../api/project.service';
import { useNavigate } from 'react-router-dom';

// Ant Design
import { Typography, Button, Row, Col, Spin, Result, Empty, message, Modal } from 'antd';
import { PlusOutlined, FolderOpenOutlined, CloudUploadOutlined } from '@ant-design/icons';

import ProjectCard from '../components/Project/ProjectCard';
import CreateProjectModal from '../components/Project/CreateProjectModal';
import ProjectImporter from '../components/Project/ProjectImporter';

const { Title, Text } = Typography;

const Projects = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const response = await ProjectService.getMyProjects();
            setProjects(response.data);
        } catch (err) {
            setError('Failed to fetch projects.');
            message.error('Failed to load projects.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleProjectCreated = () => {
        setIsCreateModalOpen(false);
        fetchProjects();
    };

    const handleProjectImported = (newProjectId) => {
        setIsImportModalOpen(false);
        fetchProjects();

        message.success('Project imported successfully. Redirecting...');
        navigate(`/projects/${newProjectId}`);
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={2} style={{ margin: 0 }}>Projects</Title>
                    <Text type="secondary">Manage and track all your projects</Text>
                </Col>

                <Col style={{ display: 'flex', gap: 10 }}>
                    {user.role === 'leader' && (
                        <>
                            {/* Import Button */}
                            <Button
                                icon={<CloudUploadOutlined />}
                                onClick={() => setIsImportModalOpen(true)}
                            >
                                Import Project
                            </Button>

                            {/* Create New Project Button */}
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setIsCreateModalOpen(true)}
                            >
                                New Project
                            </Button>
                        </>
                    )}
                </Col>
            </Row>

            {/* Content */}
            {loading ? (
                <Spin size="large" style={{ display: 'block', marginTop: 50 }} />
            ) : error ? (
                <Result
                    status="error"
                    title="Error loading projects"
                    subTitle={error}
                />
            ) : projects.length > 0 ? (
                <Row gutter={[24, 24]}>
                    {projects.map((project) => (
                        <Col xs={24} sm={12} md={8} lg={6} key={project.id}>
                            <ProjectCard project={project} />
                        </Col>
                    ))}
                </Row>
            ) : (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <Empty
                        description={
                            <span style={{ fontSize: 16 }}>
                                No projects yet
                            </span>
                        }
                        image={<FolderOpenOutlined style={{ fontSize: 48, color: '#ccc' }} />}
                    />
                    <Text type="secondary">Create your first project to get started</Text>
                </div>
            )}

            {/* Create Project Modal */}
            {isCreateModalOpen && (
                <CreateProjectModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onProjectCreated={handleProjectCreated}
                />
            )}

            {/* Import Project Modal */}
            {isImportModalOpen && (
                <Modal
                title="Import Project từ JSON"
                open={isImportModalOpen}
                onCancel={() => setIsImportModalOpen(false)}
                footer={null} // Không cần footer vì nút Import nằm trong ProjectImporter
            >
                <ProjectImporter 
                    onImportSuccess={handleProjectImported}
                    // Truyền thêm prop để component biết nó cần đóng Modal
                    onClose={() => setIsImportModalOpen(false)} 
                />
            </Modal>
            )}
        </div>
    );
};

export default Projects;
