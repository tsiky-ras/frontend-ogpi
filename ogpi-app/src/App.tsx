import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login/Login.tsx";
import ListeUser from "./pages/admin/gestion-user/liste/ListeUser.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AuthGuard from "./components/auth/AuthGuard.tsx";
import ListeProfils from "./pages/admin/gestion-profil/liste/ListeProfils.tsx";
import BusinessUnitPage from "./pages/admin/gestion-profil/referentiel/BuisnessUnitPage.tsx";
import DiplomePage from "./pages/admin/gestion-profil/referentiel/DiplomePage.tsx";
import EtablissementPage from "./pages/admin/gestion-profil/referentiel/EtablissementPage.tsx";
import FilierePage from "./pages/admin/gestion-profil/referentiel/FilierePage.tsx";
import HardSkillPage from "./pages/admin/gestion-profil/referentiel/HardSkillPage.tsx"; 
import SoftSkillPage from "./pages/admin/gestion-profil/referentiel/SoftSkillPage.tsx";
import PostePage from "./pages/admin/gestion-profil/referentiel/PostePage.tsx";
import CertificationPage from "./pages/admin/gestion-profil/referentiel/CertificationPage.tsx";
import OrganismePage from "./pages/admin/gestion-profil/referentiel/OrganismePage.tsx";
import ListeLead from "./pages/admin/gestion-lead/liste/ListeLead.tsx";
import ClientPage from "./pages/admin/gestion-lead/referentiel/ClientPage.tsx";
import LeadCategoryPage from "./pages/admin/gestion-lead/referentiel/LeadCategoryPage.tsx";
import LeadSecteurPage from "./pages/admin/gestion-lead/referentiel/LeadSecteurPage.tsx";
import LeadStatusPage from "./pages/admin/gestion-lead/referentiel/LeadStatusPage.tsx";
import LeadTypePage from "./pages/admin/gestion-lead/referentiel/LeadTypePage.tsx";
import PartenairePage from "./pages/admin/gestion-lead/referentiel/PartenairePage.tsx";
import TypeProjetFinancementPage from "./pages/admin/gestion-lead/referentiel/TypeProjetFinancementPage.tsx";
import BacklogPage from "./pages/admin/gestion-lead/backlog/BacklogPage.tsx";
import LeadPage from "./pages/admin/gestion-lead/LeadPage.tsx";
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
          <Route path="/admin/gestion-user" element={<ListeUser />} />
          <Route path="/admin/collaborateurs" element={<ListeProfils />} />
          <Route path="/admin/config/business-units" element={<BusinessUnitPage />} />
          <Route path="/admin/config/diplomes" element={<DiplomePage />} />
          <Route path="/admin/config/etablissements" element={<EtablissementPage />} />
          <Route path="/admin/config/filieres" element={<FilierePage />} />
          <Route path="/admin/config/hard-skills" element={<HardSkillPage />} />
          <Route path="/admin/config/soft-skills" element={<SoftSkillPage />} />
          <Route path="/admin/config/postes" element={<PostePage />} />
          <Route path="/admin/config/certifications" element={<CertificationPage />} />
          <Route path="/admin/config/organismes" element={<OrganismePage />} />   
          <Route path="/admin/gestion-opportunites" element={<LeadPage />} /> 
          <Route path="/admin/config/lead-clients" element={<ClientPage />} /> 
          <Route path="/admin/config/lead-categories" element={<LeadCategoryPage />} />
          <Route path="/admin/config/lead-secteur" element={<LeadSecteurPage />} />
          <Route path="/admin/config/lead-statut" element={<LeadStatusPage />} />
          <Route path="/admin/config/lead-types" element={<LeadTypePage />} />
          <Route path="/admin/config/lead-partenaire" element={<PartenairePage />} />
          <Route path="/admin/config/lead-financement" element={<TypeProjetFinancementPage />} />
        </Route>

        {/* <Route path="*" element={<Navigate to="/login" replace />} /> */}
      </Routes>
    </Router>
  );
};

export default App;
