import React, { useMemo, useState, useEffect } from "react";
import Header from "../../../components/header/Header.tsx";
import Sidebar from "../../../components/sidebar/Sidebar.tsx";
import Title from "../../../components/title/Title.tsx";
import "bootstrap/dist/css/bootstrap.min.css";

import MesTachesBacklog from "./mes-taches/MesTachesBacklog.tsx";
import TachesAValiderBacklog from "./a-valider/TachesAValiderBacklog.tsx";
import { BacklogTaskService } from "../../../services/projet/backlog/BacklogTaskService.tsx";
import { useLeadTechFinDetailsService } from "../../../services/lead/tech-fin/LeadTechFinDetailsService.tsx";
import { useAuth } from "../../../context/AuthContext.tsx";
import "./BacklogTachePage.css";

const BacklogTachePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"afaire" | "avalider">("afaire");
  const [deviseAbr, setDeviseAbr] = useState<string>("€");
  const { api, user } = useAuth();

  const backlogTaskService = useMemo(() => new BacklogTaskService(api), [api]);
  const leadTechFinService = useLeadTechFinDetailsService();

  // Récupère la devise via le service de tâches (si disponible),
  // sinon depuis le lead associé au premier backlog trouvé.
  useEffect(() => {
    (async () => {
      try {
        // BacklogTaskService expose optionnellement getDevise()
        if (typeof (backlogTaskService as any).getDevise === "function") {
          const d = await (backlogTaskService as any).getDevise();
          if (d) { setDeviseAbr(d); return; }
        }
        // Fallback : récupère le leadId depuis les tâches
        const tasks = await backlogTaskService.getTasks().catch(() => []);
        const leadId = (tasks[0] as any)?.backlog?.leadId ?? null;
        if (leadId) {
          const techFin = await leadTechFinService.getByLeadId(leadId);
          setDeviseAbr(techFin?.devise?.abrDevise || "€");
        }
      } catch { setDeviseAbr("€"); }
    })();
  }, [backlogTaskService]);

  return (
    <div className="page-lead-layout">
      <Header />
      <div className="liste-lead-wrapper">
        <aside className="liste-lead-sidebar"><Sidebar /></aside>
        <main className="liste-lead-main">
          <div className="container-fluid">
            <div className="row mb-3">
              <div className="col">
                <Title title="Tâches Backlog" subtitle="Suivi et validation des tâches de projet" />
              </div>
            </div>

            <div className="btp-tab-switcher">
              <button className={`btp-tab-btn${activeTab === "afaire" ? " active" : ""}`}
                onClick={() => setActiveTab("afaire")}>Mes tâches à faire</button>
              <button className={`btp-tab-btn${activeTab === "avalider" ? " active" : ""}`}
                onClick={() => setActiveTab("avalider")}>Tâches à valider</button>
            </div>

            <div className="btp-tab-content">
              {activeTab === "afaire" && (
                <MesTachesBacklog service={backlogTaskService}
                  currentUserName={user?.username} deviseAbr={deviseAbr} />
              )}
              {activeTab === "avalider" && (
                <TachesAValiderBacklog service={backlogTaskService}
                  currentUserName={user?.username} deviseAbr={deviseAbr} />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default BacklogTachePage;