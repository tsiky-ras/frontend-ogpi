import React, { useState, useEffect, useMemo, useCallback } from "react";
import Header from "../../../components/header/Header.tsx";
import Sidebar from "../../../components/sidebar/Sidebar.tsx";
import Title from "../../../components/title/Title.tsx";
import { Tabs, Tab } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

import ListeProjet    from "./liste/ListeProjet.tsx";
import KanbanProjet   from "./kanban/KanbanProjet.tsx";
import DashboardProjet from "./dashboard/DashboardProjet.tsx";
import { useAuth } from "../../../context/AuthContext.tsx";
import { ProjetService } from "../../../services/projet/ProjetService.tsx";
import { ProjetStatutService } from "../../../services/projet/statut/ProjetStatutService.tsx";
import { ProjetAvancementService, ProjetAvancement } from "../../../services/projet/ProjetAvancementService.tsx";
import { Projet } from "../../../types/projet/Projet.tsx";

// Statut par défaut quand un projet n'a pas encore de statut kanban
const DEFAULT_STATUT_ID = 1;

const FULL_ACCESS_ROLE_IDS = [1, 2, 5, 6]; // ADMIN, MANAGER, LEAD PROJECT, LEAD COMMERCIAL

const ProjetPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const { api, user } = useAuth();

  // ── Services centralisés ────────────────────────────────────────────────
  const projetService     = useMemo(() => new ProjetService(api),          [api]);
  const statutService     = useMemo(() => new ProjetStatutService(api),    [api]);
  const avancementService = useMemo(() => new ProjetAvancementService(api),[api]);

  // ── État global partagé ─────────────────────────────────────────────────
  const [projets,     setProjets]     = useState<Projet[]>([]);
  const [statutMap,   setStatutMap]   = useState<Map<number, number>>(new Map());
  const [avancements, setAvancements] = useState<Map<number, ProjetAvancement>>(new Map());
  const [loading,     setLoading]     = useState(true);

  // ── Chargement initial — tout en parallèle ──────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [data, courants] = await Promise.all([
        projetService.getAll(),
        statutService.getStatutsCourants(),
      ]);

      const canSeeAll = FULL_ACCESS_ROLE_IDS.includes(user?.role?.roleId ?? 0);
      const filteredData = canSeeAll
        ? data
        : data.filter(p =>
            p.userCp?.userId === user?.userId ||
            p.userSuppleante?.userId === user?.userId
          );
      setProjets(filteredData);

      const map = new Map<number, number>();
      filteredData.forEach(p => {
        const id = p.idProjet ?? 0;
        map.set(id, courants.get(id)?.id ?? DEFAULT_STATUT_ID);
      });
      setStatutMap(map);

      // Avancements en arrière-plan (non bloquant)
      avancementService.getAll()
        .then(av => setAvancements(ProjetAvancementService.toMap(av)))
        .catch(() => {});
    } catch (err) {
      console.error("Erreur chargement initial", err);
    } finally {
      setLoading(false);
    }
  }, [projetService, statutService, avancementService]);

  useEffect(() => { loadAll(); }, []);

  const handleProjetSaved = useCallback(async () => { await loadAll(); }, [loadAll]);

  const handleStatutChange = useCallback((projetId: number, newStatutId: number) => {
    setStatutMap(prev => new Map(prev).set(projetId, newStatutId));
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
              unmountOnExit={false}
            >
              {/* ── Onglet Dashboard (nouveau) ── */}
              <Tab eventKey="dashboard" title="Dashboard">
                <DashboardProjet
                  projets={projets}
                  statutMap={statutMap}
                  avancements={avancements}
                  loading={loading}
                  canViewFinancials={FULL_ACCESS_ROLE_IDS.includes(user?.role?.roleId ?? 0)}
                />
              </Tab>

              {/* ── Onglet Liste ── */}
              <Tab eventKey="liste" title="Liste">
                <ListeProjet
                  projets={projets}
                  statutMap={statutMap}
                  avancements={avancements}
                  loading={loading}
                  onProjetSaved={handleProjetSaved}
                />
              </Tab>

              {/* ── Onglet Kanban ── */}
              <Tab eventKey="kanban" title="Kanban">
                <KanbanProjet
                  projets={projets}
                  statutMap={statutMap}
                  loading={loading}
                  onProjetSaved={handleProjetSaved}
                  onStatutChange={handleStatutChange}
                />
              </Tab>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProjetPage;