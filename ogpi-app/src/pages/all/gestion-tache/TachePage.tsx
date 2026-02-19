import React, { useMemo, useState } from "react";
import Header from "../../../components/header/Header.tsx";
import Sidebar from "../../../components/sidebar/Sidebar.tsx";
import Title from "../../../components/title/Title.tsx";
import "bootstrap/dist/css/bootstrap.min.css";

import MesTaches from "./mes-taches/MesTaches.tsx";
import { LeadTaskUserService } from "../../../services/lead/tasks/LeadTaskUserService.tsx";
import { LeadTaskFileService } from "../../../services/lead/tasks/LeadTaskFileService.tsx";

// ⚠️  Remplacez ce chemin par celui de votre instance axios
// Regardez comment vos autres pages importent l'api, ex :
// import { api } from "../../../api/axiosConfig";
// import apiClient from "../../../utils/httpClient";
import { useAuth } from "../../../context/AuthContext.tsx";
import "./TachePage.css";

const TachePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"afaire" | "avalider">("afaire");
  const {api} = useAuth();
  // Services instanciés une seule fois, passés en props
  const leadTaskUserService = useMemo(() => new LeadTaskUserService(api), []);
  const leadTaskFileService = useMemo(() => new LeadTaskFileService(api), []);

  return (
    <div className="page-lead-layout">
      <Header />

      <div className="liste-lead-wrapper">
        <aside className="liste-lead-sidebar">
          <Sidebar />
        </aside>

        <main className="liste-lead-main">
          <div className="container-fluid">
            <div className="row mb-3">
              <div className="col">
                <Title
                  title="Gestion des tâches"
                  subtitle="Suivi et validation de vos tâches"
                />
              </div>
            </div>

            <div className="tp-tab-switcher">
              <button
                className={`tp-tab-btn${activeTab === "afaire" ? " active" : ""}`}
                onClick={() => setActiveTab("afaire")}
              >
                <span className="tp-tab-icon">📋</span>
                Mes tâches à faire
              </button>
              <button
                className={`tp-tab-btn${activeTab === "avalider" ? " active" : ""}`}
                onClick={() => setActiveTab("avalider")}
              >
                <span className="tp-tab-icon">✅</span>
                Tâches à valider
                <span className="tp-tab-soon">bientôt</span>
              </button>
            </div>

            <div className="tp-tab-content">
              {activeTab === "afaire" && (
                <MesTaches
                  taskService={leadTaskUserService}
                  fileService={leadTaskFileService}
                />
              )}
              {activeTab === "avalider" && (
                <div className="tp-coming-soon">
                  <div className="tp-cs-icon">🚧</div>
                  <h5>Module en cours de développement</h5>
                  <p>La liste des tâches à valider sera disponible prochainement.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TachePage;