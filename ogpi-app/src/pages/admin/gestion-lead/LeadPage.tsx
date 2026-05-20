import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../../../components/header/Header.tsx";
import Sidebar from "../../../components/sidebar/Sidebar.tsx";
import Title from "../../../components/title/Title.tsx";
import { Tabs, Tab } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

import ListeLead from "./liste/ListeLead.tsx";
import ValidationLeadPage from "./validation/ValidationLeadPage.tsx";
import { useAuth } from "../../../context/AuthContext.tsx";
import { LeadService } from "../../../services/lead/LeadService.tsx";
import KanbanLead from "./kanban/KanbanLead.tsx";
import EvaluationLeadPage from "./evaluation/EvaluationLeadPage.tsx";
import DashboardLeadPage from "./dashboad/DashboardLeadPage.tsx";

const LeadPage: React.FC = () => {
  const { user } = useAuth();

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(
    searchParams.get("page") ?? "dashboard"
  );
  const { api } = useAuth();
  const leadService = useMemo(() => new LeadService(api), [api]);
  const [validationCount, setValidationCount] = useState<number>(0);

  const fetchValidationCount = useCallback(async () => {
    try {
      const data = await leadService.getToValidate();
      setValidationCount(Array.isArray(data) ? data.length : 0);
    } catch {
      setValidationCount(0);
    }
  }, [leadService]);

  useEffect(() => {
    fetchValidationCount();
  }, [fetchValidationCount]);

  useEffect(() => {
    if (activeTab === "validation") fetchValidationCount();
  }, [activeTab, fetchValidationCount]);

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
                  title="Gestion des opportunités"
                  subtitle="Suivi, validation et organisation des leads"
                />
              </div>
            </div>

            {/* ONGLET */}
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => k && setActiveTab(k)}
              className="mb-4"
              mountOnEnter
              unmountOnExit={false}
            >
              <Tab eventKey="dashboard" title="Dashboard">
                <DashboardLeadPage />
              </Tab>
              <Tab eventKey="liste" title="Liste">
                <ListeLead isArchive={false} />
              </Tab>
              {(user?.role?.roleId== 2 ||user?.role?.roleId== 5||user?.role?.roleId== 6)?
                <Tab eventKey="validation" title={<span>Validation <span className="badge bg-secondary ms-2">{validationCount}</span></span>}>
                    <ValidationLeadPage onUpdated={fetchValidationCount} />
                </Tab>
              :null}
              {(user?.role?.roleId== 7)?
                <Tab eventKey="evaluation" title="Évaluation">
                  <EvaluationLeadPage onUpdated={fetchValidationCount} />
                </Tab>
              :null}

             <Tab eventKey="kanban" title="Kanban">
                <KanbanLead />
              </Tab>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LeadPage;
