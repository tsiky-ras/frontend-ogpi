import React, { useState, useEffect } from "react";
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

const LeadPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("liste");
  const { api } = useAuth();
  const leadService = new LeadService(api);
  const [validationCount, setValidationCount] = useState<number>(0);

  const fetchValidationCount = async () => {
    try {
      const data = await leadService.getToValidate();
      setValidationCount(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      console.error("Erreur fetch validation count", err);
      setValidationCount(0);
    }
  };

  useEffect(() => {
    fetchValidationCount();
  }, []);

  useEffect(() => {
    if (activeTab === "validation") fetchValidationCount();
  }, [activeTab]);

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
              unmountOnExit    
            >
              <Tab eventKey="liste" title="Liste">
                <ListeLead />
              </Tab>

                <Tab eventKey="validation" title={<span>Validation <span className="badge bg-secondary ms-2">{validationCount}</span></span>}>
                    <ValidationLeadPage onUpdated={fetchValidationCount} />
                </Tab>

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
