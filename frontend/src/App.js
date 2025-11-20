// /src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// 1. Import Layout mới
import MainLayout from './components/Layout/MainLayout';
// (AuthLayout được dùng bên trong Login/Register rồi)

// 2. Import Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Team from "./pages/Team";
import ProjectDetail from './pages/ProjectDetail';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* --- Các route được bảo vệ (Dùng MainLayout) --- */}
          {/* 1. Các trang công khai (Login, Register) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* 2. Các trang được bảo vệ (Dashboard, Project) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/team" element={<Team />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              {/* Trang chủ mặc định là /dashboard */}
              <Route path="/" element={<Dashboard />} />
            </Route>
          </Route>

          {/* Nếu user đã đăng nhập mà cố vào /login, 
              họ sẽ được chuyển đến /dashboard (handled by ProtectedRoute logic) 
              Chúng ta cần cập nhật ProtectedRoute
          */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;