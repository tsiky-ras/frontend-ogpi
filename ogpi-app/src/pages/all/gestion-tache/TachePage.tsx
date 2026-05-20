// Extrait de TachePage.tsx — partie mise à jour pour intégrer TachesAValider

import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
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
import { LeadTaskToValidateService } from "../../../services/lead/tasks/LeadTaskToValidateService.tsx";
import { LeadService } from "../../../services/lead/LeadService.tsx";
import { useAuth } from "../../../context/AuthContext.tsx";
import "./TachePage.css";

const HIDDEN_STEP_IDS = new Set([9, 10, 11, 12]);

const TachePage: React.FC = () => {
  const location = useLocation();
  const state = (location.state ?? {}) as {
    activeTab?: "afaire" | "avalider";
    openLeadTaskId?: number;
  };
  const [searchParams] = useSearchParams();
  // const [activeTab, setActiveTab] = useState<string>(
  //   searchParams.get("page") ?? "liste"
  // );

  const [activeTab, setActiveTab] = useState<String>(
    searchParams.get("page") ?? "afaire"
  );
  const { api, user } = useAuth();

  // Si la notification demande un onglet précis, on le sélectionne au montage
  useEffect(() => {
    if (state.activeTab) setActiveTab(state.activeTab);
  }, [state.activeTab]);

  const leadTaskUserService      = useMemo(() => new LeadTaskUserService(api), [api]);
  const leadTaskFileService      = useMemo(() => new LeadTaskFileService(api), [api]);
  const leadTaskStatusService    = useMemo(() => new LeadTaskUserStatusService(api), [api]);
  const leadTaskValidationService = useMemo(() => new LeadTaskValidationService(api), [api]);
  const leadTaskToValidateService = useMemo(() => new LeadTaskToValidateService(api), [api]);
  const leadService               = useMemo(() => new LeadService(api), [api]);

  const [hiddenLeadIds, setHiddenLeadIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    leadService.getAll()
      .then((leads: any[]) => {
        const ids = new Set<number>(
          leads
            .filter((l: any) => HIDDEN_STEP_IDS.has(l.currentLeadStep?.leadStep?.id))
            .map((l: any) => l.id as number)
        );
        setHiddenLeadIds(ids);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="page-lead-layout">
      <Header />

      <div className="liste-lead-wrapper">
        <aside className="liste-lead-sidebar">
          <Sidebar />
        </aside>

        <main className="liste-lead-main">
          <div className="container-fluid">
                <Title
                  title="Gestion des tâches"
                  subtitle="Suivi et validation de vos tâches"
                />

            <div className="tp-tab-switcher">
              <button
                className={`tp-tab-btn${activeTab === "afaire" ? " active" : ""}`}
                onClick={() => setActiveTab("afaire")}
              >
                Mes tâches à faire
              </button>
              <button
                className={`tp-tab-btn${activeTab === "avalider" ? " active" : ""}`}
                onClick={() => setActiveTab("avalider")}
              >
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
                  openLeadTaskId={state.openLeadTaskId ?? null}
                  hiddenLeadIds={hiddenLeadIds}
                />
              )}
              {activeTab === "avalider" && (
                <TachesAValider
                  taskService={leadTaskToValidateService}
                  validationService={leadTaskValidationService}
                  currentUserName={user?.username}
                  hiddenLeadIds={hiddenLeadIds}
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