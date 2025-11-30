import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
// Install if needed: npm install react-icons
import { FaCheckSquare, FaThLarge, FaFolder, FaUsers, FaBell } from 'react-icons/fa';

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const userInitial = user ? user.name.charAt(0).toUpperCase() : 'U';

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Active link styling
    const getNavLinkClass = ({ isActive }) =>
        isActive ? "nav-link active" : "nav-link";

    return (
        <header className="app-header">
            {/* 1. TaskFlow Logo */}
            <div className="logo-section">
                <FaCheckSquare className="logo-icon" />
                <span className="logo-text">TaskFlow</span>
                <div className="divider">|</div>
            </div>

            {/* 2. Navigation */}
            <nav className="main-nav">
                <NavLink to="/dashboard" className={getNavLinkClass}>
                    <FaThLarge /> Dashboard
                </NavLink>

                <NavLink to="/projects" className={getNavLinkClass}>
                    {/* Make sure the /projects route exists, or temporarily redirect to dashboard */}
                    <FaFolder /> Projects
                </NavLink>

                <NavLink to="/team" className={getNavLinkClass}>
                    {/* Same for /team route */}
                    <FaUsers /> Team
                </NavLink>
            </nav>

            {/* 3. User Tools */}
            <div className="user-tools">
                <div className="notification-wrapper">
                    <FaBell className="bell-icon" />
                    <span className="notification-dot"></span>
                </div>

                <div className="user-profile" onClick={() => setDropdownOpen(!dropdownOpen)}>
                    <div className="avatar-circle">{userInitial}</div>
                </div>

                {dropdownOpen && (
                    <div className="dropdown-menu">
                        <div className="dropdown-item" onClick={handleLogout}>Logout</div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
