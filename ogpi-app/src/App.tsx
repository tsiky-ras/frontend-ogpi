import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Login from "./pages/login/Login.tsx";
import ListeUser from "./pages/admin/gestion-user/ListeUser.tsx";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<div style={{ padding: 24 }}>Accueil — Vous êtes connecté</div>} />
        <Route path="/admin/gestion-user" element={<ListeUser />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
