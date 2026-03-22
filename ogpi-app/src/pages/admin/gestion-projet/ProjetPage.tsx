import React, { useState } from "react";
import Header from "../../../components/header/Header.tsx";
import Sidebar from "../../../components/sidebar/Sidebar.tsx";
import Title from "../../../components/title/Title.tsx";
import { Tabs, Tab } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

import ListeProjet  from "./liste/ListeProjet.tsx";
import KanbanProjet from "./kanban/KanbanProjet.tsx";
import { useAuth } from "../../../context/AuthContext.tsx";

const ProjetPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("liste");
  const { api } = useAuth();

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
                  title="Gestion des projets"
                  subtitle="Suivi, validation et organisation des projets"
                />
              </div>
            </div>

            <Tabs
              activeKey={activeTab}
              onSelect={k => k && setActiveTab(k)}
              className="mb-4"
              mountOnEnter
              unmountOnExit
            >
              <Tab eventKey="liste" title="Liste">
                <ListeProjet />
              </Tab>

              <Tab eventKey="kanban" title="Kanban">
                <KanbanProjet />
              </Tab>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProjetPage;