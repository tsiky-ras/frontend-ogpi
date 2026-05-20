import React from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../../../../components/header/Header.tsx";
import Sidebar from "../../../../components/sidebar/Sidebar.tsx";
import Title from "../../../../components/title/Title.tsx";
import ListeLead from "../liste/ListeLead.tsx";

const ArchiveLead: React.FC = () => {
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
                  title="Archives des opportunités"
                  subtitle="Leads gagnés et perdus"
                />
              </div>
            </div>

            <ListeLead isArchive={true} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ArchiveLead;