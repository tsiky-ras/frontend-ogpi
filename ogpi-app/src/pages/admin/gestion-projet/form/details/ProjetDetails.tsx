import React, { useCallback, useEffect, useState } from "react";
import { Modal, Nav, Tab } from "react-bootstrap";
import { FaSpinner } from "react-icons/fa";
import InfoGeneral from "./info-general/InfoGeneral.tsx";
import StructureTab from "../../tabs/StructureTab.tsx";
import EquipeTab from "../../tabs/EquipeTab.tsx";
import BudgetTab from "../../../gestion-lead/backlog/BudgetTab.tsx";
import PlanningTab from "../../../gestion-lead/backlog/PlanningTab.tsx";
import DetailsQualif from "../../../gestion-lead/details/qualif/DetailsQualif.tsx";
import DetailsOffreTech from "../../../gestion-lead/details/offre-tech/DetailsOffreTech.tsx";
import "./ProjetDetails.css";
import { Projet } from "../../../../../types/projet/Projet.tsx";
import { useAuth } from "../../../../../context/AuthContext.tsx";
import { BacklogProjetService } from "../../../../../services/projet/backlog/BacklogProjetService.tsx";
import { BacklogProjetProfilService } from "../../../../../services/projet/backlog/BacklogProjetProfilService.tsx";
import { BacklogProjetLineProfilService } from "../../../../../services/projet/backlog/BacklogProjetLineService.tsx";
import { BacklogPlanningService } from "../../../../../services/lead/backlog/BacklogPlanningService.tsx";
import { useLeadTechFinDetailsService } from "../../../../../services/lead/tech-fin/LeadTechFinDetailsService.tsx";
import { LeadService } from "../../../../../services/lead/LeadService.tsx";

type ProjetDetailsProps = {
  show: boolean;
  onClose: () => void;
  projet?: Projet | null;
};

const ProjetDetails: React.FC<ProjetDetailsProps> = ({ show, onClose, projet }) => {
  const { api } = useAuth();
  const leadTechFinService = useLeadTechFinDetailsService();

  const [svc] = useState(() => ({
    backlog:    new BacklogProjetService(api),
    profil:     new BacklogProjetProfilService(api),
    lineProfil: new BacklogProjetLineProfilService(api),
    planning:   new BacklogPlanningService(api),
    lead:       new LeadService(api),
  }));

  const [loadingData, setLoadingData] = useState(false);
  const [backlogId,   setBacklogId]   = useState<number | null>(null);
  const [lots,        setLots]        = useState<any[]>([]);
  const [lines,       setLines]       = useState<any[]>([]);
  const [lineProfils, setLineProfils] = useState<any[]>([]);
  const [deliverables,setDeliverables]= useState<Map<number, any[]>>(new Map());
  const [profils,     setProfils]     = useState<any[]>([]);
  const [deviseAbr,   setDeviseAbr]   = useState<string>("€");
  const [leadData,    setLeadData]    = useState<any | null>(null);

  const loadBacklogData = useCallback(async () => {
    if (!projet?.idProjet) return;
    setLoadingData(true);
    try {
      const header = await svc.backlog.getHeaderByProjetId(projet.idProjet);
      if (!header?.id) return;
      setBacklogId(header.id);

      const full = await svc.backlog.getFullById(header.id);
      if (!full) return;

      const sortedLots = (full.lots ?? []).slice().sort((a: any, b: any) => a.order - b.order);
      setLots(sortedLots);
      setLines((full.lines ?? []).slice().sort((a: any, b: any) => a.order - b.order));

      const rawProfils: any[] = full.profilsProjet ?? full.profils ?? [];
      setProfils(
        rawProfils.slice().sort((a: any, b: any) => a.order - b.order)
          .map((p: any) => ({ ...p, collaborateurs: p.collaborateurs ?? [] }))
      );

      try {
        const lps = await svc.lineProfil.getAllByBacklogId(header.id);
        setLineProfils(Array.isArray(lps) ? lps : []);
      } catch { setLineProfils([]); }

      const dlvMap = new Map<number, any[]>();
      sortedLots.forEach((lot: any) => {
        (lot.phases ?? []).forEach((phase: any) => {
          const phaseDelivs: any[] = phase.deliverables ?? [];
          const sprintDelivs: any[] = (phase.sprints ?? []).flatMap((s: any) =>
            (s.deliverables ?? []).map((d: any) => ({ ...d, sprintId: d.sprintId ?? s.id }))
          );
          const all = [...phaseDelivs, ...sprintDelivs].filter(
            (d, i, arr) => arr.findIndex(x => x.id === d.id) === i
          );
          dlvMap.set(phase.id, all.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)));
        });
      });
      setDeliverables(dlvMap);

      // Chargement devise + données lead si projet lié à un lead
      if (projet.lead?.leadId) {
        try {
          const [techFin, fullLead] = await Promise.all([
            leadTechFinService.getByLeadId(projet.lead.leadId),
            svc.lead.getById(projet.lead.leadId),
          ]);

          // Devise
          setDeviseAbr(techFin?.devise?.abrDevise ?? techFin?.devise?.nomDevise ?? "€");

          // On attache techFinDetails au lead comme dans DetailsLead
          setLeadData(fullLead ? { ...fullLead, techFinDetails: techFin ?? null } : null);

        } catch {
          setDeviseAbr("€");
          setLeadData(null);
        }
      } else {
        setDeviseAbr("€");
        setLeadData(null);
      }
    } catch (err) {
      console.error("Erreur chargement backlog projet details:", err);
    } finally {
      setLoadingData(false);
    }
  }, [projet?.idProjet, projet?.lead?.leadId]);

  useEffect(() => {
    if (!show || !projet) return;
    setBacklogId(null); setLots([]); setLines([]); setLineProfils([]);
    setDeliverables(new Map()); setProfils([]); setLeadData(null);
    loadBacklogData();
  }, [show, projet?.idProjet]);

  if (!projet) return null;

  const leadId = projet.lead?.leadId ?? null;

  return (
    <Modal show={show} onHide={onClose} fullscreen className="details-lead-modal">
      <Modal.Header closeButton>
        <div className="details-lead-header-content">
          <div>
            <Modal.Title style={{ color: "white" }}>
              {projet.nomProjet || "Projet sans nom"}
            </Modal.Title>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>
              {projet.refBC || "---"}
              {leadId && (
                <span className="ms-3" style={{ background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem" }}>
                  Lead associé
                </span>
              )}
            </p>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="details-lead-body">
        <Tab.Container defaultActiveKey="infoGeneral">
          <Nav variant="pills" className="details-lead-tabs mb-4">
            <Nav.Item>
              <Nav.Link eventKey="infoGeneral">Informations générales</Nav.Link>
            </Nav.Item>

            {/* Onglets lead — uniquement si le projet est lié à un lead */}
            {leadData && (
              <>
                <Nav.Item>
                  <Nav.Link eventKey="qualification">Qualification</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="offre">Offre technique & financière</Nav.Link>
                </Nav.Item>
              </>
            )}

            <Nav.Item>
              <Nav.Link eventKey="structure">Lots / Phases / Sprints</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="equipe">Équipe</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="planning">Planning</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="budget">Budget</Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content>
            <Tab.Pane eventKey="infoGeneral">
              <div className="details-section">
                <InfoGeneral projet={projet} />
              </div>
            </Tab.Pane>

            {/* Contenu onglets lead */}
            {leadData && (
              <>
                <Tab.Pane eventKey="qualification">
                  <DetailsQualif lead={leadData} />
                </Tab.Pane>
                <Tab.Pane eventKey="offre">
                  <DetailsOffreTech lead={leadData} />
                </Tab.Pane>
              </>
            )}

            <Tab.Pane eventKey="structure">
              <div className="details-section details-section--full">
                {loadingData
                  ? <div className="details-tab-loading"><FaSpinner className="fa-spin me-2" /> Chargement...</div>
                  : <StructureTab lots={lots} />}
              </div>
            </Tab.Pane>

            <Tab.Pane eventKey="equipe">
              <div className="details-section details-section--full">
                {loadingData
                  ? <div className="details-tab-loading"><FaSpinner className="fa-spin me-2" /> Chargement...</div>
                  : <EquipeTab profils={profils} deviseAbr={deviseAbr} />}
              </div>
            </Tab.Pane>

            <Tab.Pane eventKey="planning">
              <div className="details-section details-section--full">
                {loadingData
                  ? <div className="details-tab-loading"><FaSpinner className="fa-spin me-2" /> Chargement...</div>
                  : <PlanningTab lots={lots} lines={lines} lineProfils={lineProfils} deliverables={deliverables} selectedBacklogId={backlogId} planningService={svc.planning} />}
              </div>
            </Tab.Pane>

            <Tab.Pane eventKey="budget">
              <div className="details-section details-section--full">
                {loadingData
                  ? <div className="details-tab-loading"><FaSpinner className="fa-spin me-2" /> Chargement...</div>
                  : <BudgetTab lots={lots} profils={profils} lines={lines} lineProfils={lineProfils} selectedBacklogId={backlogId} leadId={leadId} deviseAbr={deviseAbr} />}
              </div>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Modal.Body>
    </Modal>
  );
};

export default ProjetDetails;