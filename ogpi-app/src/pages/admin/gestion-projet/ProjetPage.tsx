import React, { useState, useEffect, useMemo, useCallback } from "react";
import Header from "../../../components/header/Header.tsx";
import Sidebar from "../../../components/sidebar/Sidebar.tsx";
import Title from "../../../components/title/Title.tsx";
import { Tabs, Tab } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

import ListeProjet  from "./liste/ListeProjet.tsx";
import KanbanProjet from "./kanban/KanbanProjet.tsx";
import { useAuth } from "../../../context/AuthContext.tsx";
import { ProjetService } from "../../../services/projet/ProjetService.tsx";
import { ProjetStatutService } from "../../../services/projet/statut/ProjetStatutService.tsx";
import { ProjetAvancementService, ProjetAvancement } from "../../../services/projet/ProjetAvancementService.tsx";
import { Projet } from "../../../types/projet/Projet.tsx";

// Statut par défaut quand un projet n'a pas encore de statut kanban
const DEFAULT_STATUT_ID = 1;

const ProjetPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("liste");
  const { api } = useAuth();

  // ── Services centralisés ────────────────────────────────────────────────
  const projetService     = useMemo(() => new ProjetService(api),          [api]);
  const statutService     = useMemo(() => new ProjetStatutService(api),    [api]);
  const avancementService = useMemo(() => new ProjetAvancementService(api),[api]);

  // ── État global partagé ─────────────────────────────────────────────────
  const [projets,    setProjets]    = useState<Projet[]>([]);
  const [statutMap,  setStatutMap]  = useState<Map<number, number>>(new Map());
  const [avancements, setAvancements] = useState<Map<number, ProjetAvancement>>(new Map());
  const [loading,    setLoading]    = useState(true);

  // ── Chargement centralisé ───────────────────────────────────────────────
  const loadProjets = useCallback(async () => {
    try {
      const data = await projetService.getAll();
      setProjets(data);
      return data;
    } catch (err) {
      console.error("Erreur chargement projets", err);
      return [];
    }
  }, [projetService]);

  const loadStatuts = useCallback(async (data?: Projet[]) => {
    try {
      const courants = await statutService.getStatutsCourants();
      const src = data ?? projets;
      const map = new Map<number, number>();
      src.forEach(p => {
        const id = p.idProjet ?? 0;
        map.set(id, courants.get(id)?.id ?? DEFAULT_STATUT_ID);
      });
      setStatutMap(map);
    } catch {
      // silencieux
    }
  }, [statutService, projets]);

  const loadAvancements = useCallback(async () => {
    try {
      const data = await avancementService.getAll();
      setAvancements(ProjetAvancementService.toMap(data));
    } catch {
      // silencieux
    }
  }, [avancementService]);

  // Chargement initial — tout en parallèle
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [data, courants] = await Promise.all([
        projetService.getAll(),
        statutService.getStatutsCourants(),
      ]);
      setProjets(data);

      const map = new Map<number, number>();
      data.forEach(p => {
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

  // Callback appelé après création/édition d'un projet (depuis FormProjet)
  const handleProjetSaved = useCallback(async () => {
    const data = await loadProjets();
    await loadStatuts(data);
    await loadAvancements();
  }, [loadProjets, loadStatuts, loadAvancements]);

  // Callback appelé quand le kanban déplace un projet
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
              <Tab eventKey="liste" title="Liste">
                <ListeProjet
                  projets={projets}
                  statutMap={statutMap}
                  avancements={avancements}
                  loading={loading}
                  onProjetSaved={handleProjetSaved}
                />
              </Tab>

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