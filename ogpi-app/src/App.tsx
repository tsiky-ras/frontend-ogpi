import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login/Login.tsx";
import ListeUser from "./pages/admin/gestion-user/liste/ListeUser.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AuthGuard from "./components/auth/AuthGuard.tsx";
import ListeProfils from "./pages/admin/gestion-profil/liste/ListeProfils.tsx";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* Admin sécurisé */}
        <Route
          path="/admin"
          element={
            <AuthGuard>
              <AdminLayout />
            </AuthGuard>
          }
        >
          <Route path="gestion-user" element={<ListeUser />} />
          <Route path="collaborateurs" element={<ListeProfils />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
