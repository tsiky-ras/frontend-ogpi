import React, { useCallback, useEffect, useState } from "react";
import { Modal, Nav, Tab } from "react-bootstrap";
import { FaSpinner } from "react-icons/fa";
import InfoGeneral from "./info-general/InfoGeneral.tsx";
import StructureTab from "../../tabs/StructureTab.tsx";
import EquipeTab from "../../tabs/EquipeTab.tsx";
import BudgetTab from "../../../gestion-lead/backlog/BudgetTab.tsx";
import ChargesAnnexesTab from "../../tabs/ChargesAnnexesTab.tsx";
import { ChargesAnnexesService } from "../../../../../services/projet/backlog/ChargesAnnexesService.tsx";
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
import { useProjetTechFinDetailsService } from "../../../../../services/projet/tech-fin/ProjetTechFinDetailsService.tsx";
import { useProjetTechnoService } from "../../../../../services/projet/tech-fin/ProjetTechnoService.tsx";
import CalendrierPaiementTab from "../../tabs/CalendrierPaiementTab.tsx";
import { CalendrierPaiementService } from "../../../../../services/projet/paiement/CalendrierPaiementService.tsx";
import ComparaisonOpportuniteProjet, { LotPlan, ProfilBudget, CalendrierItem } from "../../../ComparaisonOpportuniteProjet.tsx";

type ProjetDetailsProps = {
  show: boolean;
  onClose: () => void;
  projet?: Projet | null;
  /** Appelé après chaque paiement validé — permet à ListeProjet de rafraîchir la barre */
  onPaiementValide?: () => void;
};

const ProjetDetails: React.FC<ProjetDetailsProps> = ({ show, onClose, projet, onPaiementValide }) => {
  const { api } = useAuth();
  const leadTechFinService   = useLeadTechFinDetailsService();
  const projetTechFinService = useProjetTechFinDetailsService();
  const projetTechnoService  = useProjetTechnoService();

  const [svc] = useState(() => ({
    backlog:        new BacklogProjetService(api),
    profil:         new BacklogProjetProfilService(api),
    lineProfil:     new BacklogProjetLineProfilService(api),
    planning:       new BacklogPlanningService(api),
    lead:           new LeadService(api),
    chargesAnnexes: new ChargesAnnexesService(api),
    calendrier:     new CalendrierPaiementService(api),
  }));

  const [loadingData,     setLoadingData]     = useState(false);
  const [budgetRH,        setBudgetRH]        = useState<number>(0);
  const [backlogId,       setBacklogId]       = useState<number | null>(null);
  const [lots,            setLots]            = useState<any[]>([]);
  const [lines,           setLines]           = useState<any[]>([]);
  // lineProfils     = backlog PROJET : volume (JH planifié projet) + timeSpent (JH réalisé)
  const [lineProfils,     setLineProfils]     = useState<any[]>([]);
  // leadLineProfils = backlog LEAD   : volume (JH offre)
  const [leadLineProfils, setLeadLineProfils] = useState<any[]>([]);
  const [deliverables,    setDeliverables]    = useState<Map<number, any[]>>(new Map());
  const [profils,         setProfils]         = useState<any[]>([]);
  const [deviseAbr,       setDeviseAbr]       = useState<string>("€");
  const [leadData,        setLeadData]        = useState<any | null>(null);
  const [projetTechnos,   setProjetTechnos]   = useState<any[]>([]);

  // ── États pour l'onglet Comparaison / Paiements ──────────────────────────
  const [calendrierItems, setCalendrierItems] = useState<CalendrierItem[]>([]);
  const [caEncaisse,      setCaEncaisse]      = useState<number>(0);
  const [chargesTotal,    setChargesTotal]    = useState<number>(0);

  // ── Chargement des technos — indépendant du backlog ──────────────────────
  const loadTechnos = useCallback(async () => {
    if (!projet?.idProjet || projet.lead?.leadId) {
      setProjetTechnos([]);
      return;
    }
    try {
      const details = await projetTechFinService.getByProjetId(projet.idProjet);
      console.log("Détails tech-fin du projet récupérés:", details);
      if (details?.idProjetTechFinDetails) {
        const technos = await projetTechnoService.getByDetailsId(details.idProjetTechFinDetails);
        console.log("Technos projet chargées:", technos);
        setProjetTechnos(technos ?? []);
      } else {
        setProjetTechnos([]);
      }
    } catch {
      setProjetTechnos([]);
    }
  }, [projet?.idProjet, projet?.lead?.leadId]);

  // ── Chargement du backlog + lead ─────────────────────────────────────────
  const loadBacklogData = useCallback(async () => {
    if (!projet?.idProjet) return;
    setLoadingData(true);
    try {
      // ── Lead / devise ──
      if (projet.lead?.leadId) {
        try {
          const [techFin, fullLead] = await Promise.all([
            leadTechFinService.getByLeadId(projet.lead.leadId),
            svc.lead.getById(projet.lead.leadId),
          ]);
          setDeviseAbr(techFin?.devise?.abrDevise ?? techFin?.devise?.nomDevise ?? "€");
          setLeadData(fullLead ? { ...fullLead, techFinDetails: techFin ?? null } : null);
        } catch {
          setDeviseAbr("€");
          setLeadData(null);
        }
      } else {
        setDeviseAbr("€");
        setLeadData(null);
      }

      // ── Backlog PROJET ──
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

      // lineProfils projet : volume = JH planifié projet, timeSpent = JH réalisé
      try {
        const lps = await svc.lineProfil.getAllByBacklogId(header.id);
        setLineProfils(Array.isArray(lps) ? lps : []);
      } catch { setLineProfils([]); }

      // ── LineProfils du backlog LEAD (JH offre) ──
      // GET /api/backlog-line-profils/backlog/{leadBacklogId}
      if (projet.lead?.leadId) {
        try {
          const leadBacklogHeader = await svc.backlog.getHeaderByLeadId(projet.lead.leadId);
          if (leadBacklogHeader?.id) {
            const leadLps = await api.get(`/backlog-line-profils/backlog/${leadBacklogHeader.id}`);
            setLeadLineProfils(Array.isArray(leadLps.data) ? leadLps.data : []);
          } else {
            setLeadLineProfils([]);
          }
        } catch { setLeadLineProfils([]); }
      } else {
        setLeadLineProfils([]);
      }

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

      // ── Calendrier paiements + CA encaissé + charges annexes ──
      try {
        const [calRes, totauxRes, chRes] = await Promise.all([
          svc.calendrier.getByBacklogId(header.id).catch(() => []),
          svc.calendrier.getTotaux(header.id).catch(() => ({})),
          svc.chargesAnnexes.getTotalByBacklogId(header.id).catch(() => 0),
        ]);
        setCalendrierItems((calRes as any[]).map((c: any) => ({
          id: c.id,
          libelle: c.libelle,
          montantAPayer: Number(c.montantAPayer ?? 0),
          statut: c.statut,
          datePaiement: c.datePaiement,
          typeReference: c.typeReference,
        })));
        setCaEncaisse(Number((totauxRes as any).caProjet ?? 0));
        setChargesTotal(Number(chRes ?? 0));
      } catch {
        setCalendrierItems([]);
        setCaEncaisse(0);
        setChargesTotal(0);
      }
    } catch (err) {
      console.error("Erreur chargement backlog projet details:", err);
    } finally {
      setLoadingData(false);
    }
  }, [projet?.idProjet, projet?.lead?.leadId, api]);

  /**
   * Recharge uniquement le calendrier + CA après un paiement validé.
   * Beaucoup plus léger que recharger tout le backlog.
   * Appelé par CalendrierPaiementTab → notifie aussi ListeProjet.
   */
  const refreshCalendrier = useCallback(async () => {
    if (!backlogId) return;
    try {
      const [calRes, totauxRes] = await Promise.all([
        svc.calendrier.getByBacklogId(backlogId).catch(() => []),
        svc.calendrier.getTotaux(backlogId).catch(() => ({})),
      ]);
      setCalendrierItems((calRes as any[]).map((c: any) => ({
        id: c.id,
        libelle: c.libelle,
        montantAPayer: Number(c.montantAPayer ?? 0),
        statut: c.statut,
        datePaiement: c.datePaiement,
        typeReference: c.typeReference,
      })));
      setCaEncaisse(Number((totauxRes as any).caProjet ?? 0));
    } catch { /* silencieux */ }
    // Notifie ListeProjet pour mettre à jour la barre de progression paiement
    onPaiementValide?.();
  }, [backlogId, svc.calendrier, onPaiementValide]);

  // ── Reset + déclenchement au montage ────────────────────────────────────
  useEffect(() => {
    if (!show || !projet) return;
    setBacklogId(null);
    setLots([]);
    setLines([]);
    setLineProfils([]);
    setLeadLineProfils([]);
    setDeliverables(new Map());
    setProfils([]);
    setLeadData(null);
    setProjetTechnos([]);
    setCalendrierItems([]);
    setCaEncaisse(0);
    setChargesTotal(0);

    // Les deux chargements sont indépendants : les technos ne dépendent pas du backlog
    loadTechnos();
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
            <Nav.Item><Nav.Link eventKey="structure">Lots / Phases / Sprints</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="equipe">Équipe</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="planning">Planning</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="budget">Budget</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="charges_annexes">Charges Annexes</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="paiements">Paiements</Nav.Link></Nav.Item>
            {leadData && (
              <Nav.Item><Nav.Link eventKey="comparaison">Comparaison</Nav.Link></Nav.Item>
            )}
          </Nav>

          <Tab.Content>
            <Tab.Pane eventKey="infoGeneral">
              <div className="details-section">
                <InfoGeneral projet={projet} technos={!leadId ? projetTechnos : undefined} />
              </div>
            </Tab.Pane>

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
                {loadingData ? <div className="details-tab-loading"><FaSpinner className="fa-spin me-2" /> Chargement...</div> : <StructureTab lots={lots} />}
              </div>
            </Tab.Pane>

            <Tab.Pane eventKey="equipe">
              <div className="details-section details-section--full">
                {loadingData ? <div className="details-tab-loading"><FaSpinner className="fa-spin me-2" /> Chargement...</div> : <EquipeTab profils={profils} deviseAbr={deviseAbr} />}
              </div>
            </Tab.Pane>

            <Tab.Pane eventKey="planning">
              <div className="details-section details-section--full">
                {loadingData ? <div className="details-tab-loading"><FaSpinner className="fa-spin me-2" /> Chargement...</div>
                  : <PlanningTab
                      lots={lots}
                      lines={lines}
                      lineProfils={lineProfils}
                      deliverables={deliverables}
                      selectedBacklogId={backlogId}
                      planningService={svc.planning}
                      projectStartDate={projet.dateDebutPrevu ?? null}
                    />}
              </div>
            </Tab.Pane>

            <Tab.Pane eventKey="budget">
              <div className="details-section details-section--full">
                {loadingData ? <div className="details-tab-loading"><FaSpinner className="fa-spin me-2" /> Chargement...</div>
                  : <BudgetTab lots={lots} profils={profils} lines={lines} lineProfils={lineProfils} selectedBacklogId={backlogId} leadId={leadId} deviseAbr={deviseAbr} onTotalChange={setBudgetRH} />}
              </div>
            </Tab.Pane>

            <Tab.Pane eventKey="charges_annexes">
              <div className="details-section details-section--full">
                {loadingData
                  ? <div className="details-tab-loading"><FaSpinner className="fa-spin me-2" /> Chargement...</div>
                  : <ChargesAnnexesTab
                      backlogId={backlogId}
                      deviseAbr={deviseAbr}
                      budgetRH={budgetRH}
                      service={svc.chargesAnnexes}
                    />
                }
              </div>
            </Tab.Pane>

            {/* ── Onglet Paiements client ── */}
            <Tab.Pane eventKey="paiements">
              <div className="details-section details-section--full">
                <CalendrierPaiementTab
                  backlogId={backlogId}
                  lots={lots}
                  sprints={(() => {
                    const m = new Map<number, any[]>();
                    lots.forEach((l: any) =>
                      (l.phases ?? []).forEach((p: any) =>
                        (p.sprints ?? []).forEach((s: any) => {
                          if (!m.has(p.id)) m.set(p.id, []);
                          m.get(p.id)!.push(s);
                        })
                      )
                    );
                    return m;
                  })()}
                  deliverables={deliverables}
                  deviseAbr={deviseAbr}
                  montantOffre={leadData?.techFinDetails?.montantOffre ?? 0}
                  service={svc.calendrier}
                />
              </div>
            </Tab.Pane>

            {/* ── Onglet Comparaison Opportunité ↔ Projet ── */}
            {leadData && (
              <Tab.Pane eventKey="comparaison">
                <div className="details-section details-section--full">
                  {loadingData
                    ? <div className="details-tab-loading"><FaSpinner className="fa-spin me-2" /> Chargement...</div>
                    : <ComparaisonOpportuniteProjet
                        // ── Planning Opportunité (lead) ──
                        // JH offre par phase = Σ leadLineProfils.volume filtrés sur lineId des lignes de cette phase
                        leadLots={lots.map((l: any) => {
                          const phasesMapped = (l.phases ?? []).map((p: any) => {
                            // lignes de cette phase dans le backlog lead
                            const phaseLines = lines.filter((ln: any) => ln.phaseId === p.id || ln.phase?.id === p.id);
                            const phaseLineIds = phaseLines.map((ln: any) => ln.id);
                            const jhO = leadLineProfils
                              .filter((lp: any) => phaseLineIds.includes(lp.lineId))
                              .reduce((s: number, lp: any) => s + (lp.volume ?? 0), 0);
                            return {
                              id: p.id, name: p.name, order: p.order,
                              dateDebut: p.dateDebut ?? null,
                              dateFin: p.dateFin ?? null,
                              heures: p.heures ?? null,
                              jhOffre: jhO || null,
                            };
                          });
                          const lotJhO = phasesMapped.reduce((s: number, p: any) => s + (p.jhOffre ?? 0), 0);
                          return {
                            id: l.id, name: l.name, order: l.order,
                            dateDebut: l.dateDebut ?? null,
                            dateFin: l.dateFin ?? null,
                            phases: phasesMapped,
                            jhOffre: lotJhO || null,
                          };
                        }) as LotPlan[]}
                        leadDateDebut={projet.dateDebutPrevu ?? null}
                        leadDateFin={
                          leadData?.leadRealDeadLine
                            ? String(leadData.leadRealDeadLine).split("T")[0]
                            : projet.dateFinPrevu ?? null
                        }

                        // ── Planning Projet (réel) ──
                        // JH planifié projet + JH réalisé par phase = Σ lineProfils sur les lignes de la phase
                        projetLots={lots.map((l: any) => {
                          const phasesMapped = (l.phases ?? []).map((p: any) => {
                            const phaseLines = lines.filter((ln: any) => ln.phaseId === p.id || ln.phase?.id === p.id);
                            const phaseLineIds = phaseLines.map((ln: any) => ln.id);
                            const phLps = lineProfils.filter((lp: any) => phaseLineIds.includes(lp.lineId));
                            const jhP = phLps.reduce((s: number, lp: any) => s + (lp.volume ?? 0), 0);
                            const jhR = phLps.reduce((s: number, lp: any) => s + (lp.timeSpent ?? 0), 0);
                            return {
                              id: p.id, name: p.name, order: p.order,
                              dateDebut: p.dateDebut ?? null,
                              dateFin: p.dateFin ?? null,
                              jhPlanifieProjet: jhP || null,
                              jhRealise: jhR || null,
                            };
                          });
                          const lotJhP = phasesMapped.reduce((s: number, p: any) => s + (p.jhPlanifieProjet ?? 0), 0);
                          const lotJhR = phasesMapped.reduce((s: number, p: any) => s + (p.jhRealise ?? 0), 0);
                          return {
                            id: l.id, name: l.name, order: l.order,
                            dateDebut: l.dateDebut ?? null,
                            dateFin: l.dateFin ?? null,
                            phases: phasesMapped,
                            jhPlanifieProjet: lotJhP || null,
                            jhRealise: lotJhR || null,
                          };
                        }) as LotPlan[]}
                        projetDateDebut={projet.dateDebutPrevu ?? null}
                        projetDateFin={projet.dateFinPrevu ?? null}

                        // ── Budget / Profils — 3 niveaux JH ──
                        // volumeLead         : backlog LEAD  → JH offre (vendu au client)
                        // volumeBacklogProjet: backlog PROJET → JH planifié projet (base facturation)
                        // volumeProjet       : backlog PROJET → JH réalisé / time_spent (indicatif)
                        profils={profils.map((p: any) => {
                          const volumeLead = leadLineProfils
                            .filter((lp: any) => lp.profil?.name === p.name || lp.profil?.id === p.id)
                            .reduce((s: number, lp: any) => s + (lp.volume ?? 0), 0);

                          const volumeBacklogProjet = lineProfils
                            .filter((lp: any) => lp.profil?.id === p.id)
                            .reduce((s: number, lp: any) => s + (lp.volume ?? 0), 0);

                          const volumeProjet = lineProfils
                            .filter((lp: any) => lp.profil?.id === p.id)
                            .reduce((s: number, lp: any) => s + (lp.timeSpent ?? 0), 0);

                          return {
                            id: p.id, name: p.name, tjm: p.tjm ?? 0,
                            volumeLead,
                            volumeBacklogProjet,
                            volumeProjet,
                          } as ProfilBudget;
                        })}

                        // ── CA & paiements ──
                        montantOffreLead={leadData?.techFinDetails?.montantOffre ?? 0}
                        deviseAbr={deviseAbr}
                        calendrier={calendrierItems}
                        caEncaisse={caEncaisse}
                        chargesAnnexes={chargesTotal}
                      />
                  }
                </div>
              </Tab.Pane>
            )}
          </Tab.Content>
        </Tab.Container>
      </Modal.Body>
    </Modal>
  );
};

export default ProjetDetails;