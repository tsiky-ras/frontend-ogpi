import React, { useState } from "react";
import Header from "../../../components/header/Header.tsx";
import Sidebar from "../../../components/sidebar/Sidebar.tsx";
import Title from "../../../components/title/Title.tsx";
import { Tabs, Tab } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

import TacheList from "./liste/TacheList.tsx";
import MesTaches from "./mes-taches/MesTaches.tsx";

const TachePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("mes-taches");

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
                  subtitle="Suivi des tâches par lead et par projet"
                />
              </div>
            </div>

            <Tabs
              activeKey={activeTab}
              onSelect={(k) => k && setActiveTab(k)}
              className="mb-4"
              mountOnEnter
              unmountOnExit
            >
              <Tab eventKey="mes-taches" title="Mes Tâches">
                <MesTaches currentUser="Tsiky" />
              </Tab>

              <Tab eventKey="lead" title="Lead">
                <TacheList type="LEAD" />
              </Tab>

              <Tab eventKey="projet" title="Projet">
                <TacheList type="PROJET" />
              </Tab>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TachePage;