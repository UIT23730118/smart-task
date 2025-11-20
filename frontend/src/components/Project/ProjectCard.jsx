// /src/components/Project/ProjectCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const ProjectCard = ({ project }) => {
    return (
        <div className="project-item">
            <Link to={`/project/${project.id}`}>
                <h4>{project.name}</h4>
                <p className="text-muted">
                    {/* Cắt ngắn description nếu quá dài */}
                    {project.description
                        ? project.description.substring(0, 100) + (project.description.length > 100 ? '...' : '')
                        : 'Không có mô tả'
                    }
                </p>
                {/* (Sau này có thể thêm:
          <div className="project-item-footer">
            <span>... members</span>
          </div>
        )*/}
            </Link>
        </div>
    );
};

export default ProjectCard;