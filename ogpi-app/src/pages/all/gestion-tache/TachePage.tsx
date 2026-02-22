// Extrait de TachePage.tsx — partie mise à jour pour intégrer TachesAValider

import React, { useMemo, useState } from "react";
import Header from "../../../components/header/Header.tsx";
import Sidebar from "../../../components/sidebar/Sidebar.tsx";
import Title from "../../../components/title/Title.tsx";
import "bootstrap/dist/css/bootstrap.min.css";

import MesTaches from "./mes-taches/MesTaches.tsx";
import TachesAValider from "./valider/TachesAValider.tsx";
import { LeadTaskUserService } from "../../../services/lead/tasks/LeadTaskUserService.tsx";
import { LeadTaskFileService } from "../../../services/lead/tasks/LeadTaskFileService.tsx";
import { LeadTaskUserStatusService } from "../../../services/lead/tasks/LeadTaskUserStatusService.tsx";
import { LeadTaskValidationService } from "../../../services/lead/tasks/LeadTaskValidationService.tsx";
// ⚠️  Créer un service dédié "to-validate" qui appelle /lead-task-user/to-validate
import { LeadTaskToValidateService } from "../../../services/lead/tasks/LeadTaskToValidateService.tsx";
import { useAuth } from "../../../context/AuthContext.tsx";
import "./TachePage.css";

const TachePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"afaire" | "avalider">("afaire");
  const { api, user } = useAuth();

  const leadTaskUserService      = useMemo(() => new LeadTaskUserService(api), [api]);
  const leadTaskFileService      = useMemo(() => new LeadTaskFileService(api), [api]);
  const leadTaskStatusService    = useMemo(() => new LeadTaskUserStatusService(api), [api]);
  const leadTaskValidationService = useMemo(() => new LeadTaskValidationService(api), [api]);
  // Service qui appelle GET /lead-task-user/to-validate au lieu de /all
  const leadTaskToValidateService = useMemo(() => new LeadTaskToValidateService(api), [api]);

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
              </button>
            </div>

            <div className="tp-tab-content">
              {activeTab === "afaire" && (
                <MesTaches
                  taskService={leadTaskUserService}
                  fileService={leadTaskFileService}
                  statusService={leadTaskStatusService}
                  currentUserName={user?.username}
                />
              )}
              {activeTab === "avalider" && (
                <TachesAValider
                  taskService={leadTaskToValidateService}
                  validationService={leadTaskValidationService}
                  currentUserName={user?.username}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TachePage;