import React, { useState } from "react";
import Header from "../../../components/header/Header.tsx";
import Sidebar from "../../../components/sidebar/Sidebar.tsx";
import Title from "../../../components/title/Title.tsx";
import { Tabs, Tab } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

import ListeLead from "./liste/ListeLead.tsx";
import ValidationLeadPage from "./validation/ValidationLeadPage.tsx";

const LeadPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("liste");

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

              <Tab eventKey="validation" title="Validation">
                <ValidationLeadPage />
              </Tab>

              <Tab eventKey="kanban" title="Kanban">
                <div className="p-4 text-muted">
                  <h5>Kanban (à venir)</h5>
                  <p>
                    Cette vue permettra de gérer les opportunités par statut
                    (drag & drop).
                  </p>
                </div>
              </Tab>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LeadPage;
