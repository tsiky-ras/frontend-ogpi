import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Row, Col, ListGroup, Spinner } from "react-bootstrap";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { useWorkingDay } from "../../../../hooks/useWorkingDay.ts";

import CollecteSuccessMessage from "../../../../components/message/CollecteSuccessMessage.tsx";
import CollecteErrorMessage from "../../../../components/message/CollecteErrorMessage.tsx";
import CollecteLoadingMessage from "../../../../components/message/CollecteLoadingMessage.tsx";

import { ProjetService } from "../../../../services/projet/ProjetService.tsx";
import { useUserService } from "../../../../services/user/UserService.tsx";
import { useTypeFacturationService } from "../../../../services/lead/tech-fin/TypeFacturationService.tsx";
import { LeadService } from "../../../../services/lead/LeadService.tsx";
import { useLeadTechFinDetailsService } from "../../../../services/lead/tech-fin/LeadTechFinDetailsService.tsx";
import { useProjetTechFinDetailsService } from "../../../../services/projet/tech-fin/ProjetTechFinDetailsService.tsx";
import { useProjetTechnoService } from "../../../../services/projet/tech-fin/ProjetTechnoService.tsx";
import { useTechnoService } from "../../../../services/lead/tech-fin/TechnoService.tsx";
import { Projet } from "../../../../types/projet/Projet.tsx";
import FormLead from "../../gestion-lead/form/FormLead.tsx";
import { FaPlus } from "react-icons/fa";
import GenericForm from "../../../../components/form/GenericForm.tsx";

type FormProjetProps = {
  onSubmit: (projet: Projet) => void | Promise<void>;
  show: boolean;
  onClose: () => void;
  projet?: Projet | null;
};

type CreationMode = "choice" | "from-lead" | "new";

const FormProjet: React.FC<FormProjetProps> = ({ show, onClose, onSubmit, projet }) => {
  const { api } = useAuth();
  const projetService        = new ProjetService(api);
  const userService          = useUserService();
  const typeFactService      = useTypeFacturationService();
  const leadService          = new LeadService(api);
  const leadTechFinService   = useLeadTechFinDetailsService();
  const projetTechFinService = useProjetTechFinDetailsService();
  const projetTechnoService  = useProjetTechnoService();
  const technoService        = useTechnoService();

  // ── Jours fériés — vérification des champs date ─────────────────────────
  const {
    ajuster: ajusterAttribution, alerte: alerteAttribution, effacer: effacerAttribution,
  } = useWorkingDay(api);
  const {
    ajuster: ajusterDebut, alerte: alerteDebut, effacer: effacerDebut,
  } = useWorkingDay(api);
  const {
    ajuster: ajusterFin, alerte: alerteFin, effacer: effacerFin,
  } = useWorkingDay(api);

  // ── Mode sélection ──────────────────────────────────────────────────────
  const [creationMode, setCreationMode] = useState<CreationMode>("choice");

  // ── Recherche de lead ───────────────────────────────────────────────────
  const [leadSearch,        setLeadSearch]        = useState("");
  const [leadResults,       setLeadResults]       = useState<any[]>([]);
  const [leadSearchLoading, setLeadSearchLoading] = useState(false);
  const [selectedLead,      setSelectedLead]      = useState<any | null>(null);
  const [showFormLead,      setShowFormLead]       = useState(false);
  const [allLeads,          setAllLeads]           = useState<any[]>([]);

  // ── Technos ─────────────────────────────────────────────────────────────
  const [allTechnos,      setAllTechnos]      = useState<any[]>([]);
  const [selectedTechnos, setSelectedTechnos] = useState<any[]>([]);
  const [showTechnoModal, setShowTechnoModal] = useState(false);

  // ── Formulaire projet ───────────────────────────────────────────────────
  const [form, setForm] = useState<Projet>({
    nomProjet: "",
    dateAttribution: "",
    dateDebutPrevu: "",
    dateFinPrevu: "",
    refBC: "",
    refCompte: "",
    statutProduction: "",
    userCp: null,
    userSuppleante: null,
    typeFacturation: null,
    description: "",
  });

  const [users,            setUsers]            = useState<any[]>([]);
  const [typeFacturations, setTypeFacturations] = useState<any[]>([]);

  // ── Messages ────────────────────────────────────────────────────────────
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage,     setSuccessMessage]     = useState("");
  const [showErrorMessage,   setShowErrorMessage]   = useState(false);
  const [errorMessage,       setErrorMessage]       = useState("");
  const [showLoadingMessage, setShowLoadingMessage] = useState(false);

  // ── Reset à l'ouverture ─────────────────────────────────────────────────
  useEffect(() => {
    if (!show) return;

    if (projet) {
      setCreationMode("new");
      setForm({
        nomProjet:        projet.nomProjet || "",
        dateAttribution:  projet.dateAttribution || "",
        dateDebutPrevu:   projet.dateDebutPrevu || "",
        dateFinPrevu:     projet.dateFinPrevu || "",
        refBC:            projet.refBC || "",
        refCompte:        projet.refCompte || "",
        statutProduction: projet.statutProduction || "",
        userCp:           projet.userCp || null,
        userSuppleante:   projet.userSuppleante || null,
        typeFacturation:  projet.typeFacturation || { idTypeFacturation: 1, libelle: "Interne" },
        description:      projet.description || "",
      });

      // Charger les technos existantes en mode édition (uniquement si pas de lead)
      if (projet.idProjet && !projet.lead?.leadId) {
        projetTechFinService.getByProjetId(projet.idProjet)
          .then(details => {
            if (details?.idProjetTechFinDetails) {
              return projetTechnoService.getByDetailsId(details.idProjetTechFinDetails);
            }
            return [];
          })
          .then(technos => setSelectedTechnos((technos ?? []).map((t: any) => {
            // getByDetailsId retourne { techno: { idTechno, nomTechno } } → on extrait techno
            return t.techno ?? t;
          })))
          .catch(() => setSelectedTechnos([]));
      } else {
        setSelectedTechnos([]);
      }
    } else {
      setCreationMode("choice");
      setLeadSearch("");
      setLeadResults([]);
      setSelectedLead(null);
      setSelectedTechnos([]);
      resetForm();
    }
  }, [show, projet]);

  // ── Chargement des listes (users, typeFacturation, technos dispo) ────────
  useEffect(() => {
    if (!show) return;
    const fetchData = async () => {
      try {
        const [userList, factList, technoList] = await Promise.all([
          userService.getAll(),
          typeFactService.getAll(),
          technoService.getAll(),
        ]);
        setUsers(userList);
        setTypeFacturations(factList);
        setAllTechnos(technoList ?? []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [show]);

  // ── Chargement de tous les leads ────────────────────────────────────────
  useEffect(() => {
    if (!show) return;
    const fetchLeads = async () => {
      setLeadSearchLoading(true);
      try {
        const results = await leadService.getGagne();
        setAllLeads(results || []);
      } catch (err) {
        console.error(err);
        setAllLeads([]);
      } finally {
        setLeadSearchLoading(false);
      }
    };
    fetchLeads();
  }, [show]);

  // ── Filtrage local leads ─────────────────────────────────────────────────
  useEffect(() => {
    const query = leadSearch.trim().toLowerCase();
    if (!query) { setLeadResults([]); return; }
    setLeadResults(
      allLeads.filter(lead =>
        lead.leadName?.toLowerCase().includes(query) ||
        lead.leadRef?.toLowerCase().includes(query)
      )
    );
  }, [leadSearch, allLeads]);

  // ── Sélection d'un lead ──────────────────────────────────────────────────
  const handleSelectLead = async (lead: any) => {
    setLeadSearch(`${lead.leadRef || ""} – ${lead.leadName || ""}`);
    setLeadResults([]);
    setLeadSearchLoading(true);
    try {
      const leadId = lead.leadId || lead.id;
      const fullLead = await leadService.getById(leadId);
      let techFinDetails: any = null;
      try {
        techFinDetails = await leadTechFinService.getByLeadId(leadId);
      } catch (err) {
        console.warn("Pas de données TechFin pour ce lead :", err);
      }

      const completeLead = {
        ...fullLead,
        id:      fullLead.leadId || fullLead.id,
        leadId:  fullLead.leadId || fullLead.id,
        name:    fullLead.leadName || fullLead.name,
        client:           fullLead.client || null,
        createdByUser:    fullLead.createdByUser || null,
        partenaires:      fullLead.leadPartenaires?.map((lp: any) => lp.partenaire) || [],
        leadPartenaires:  fullLead.leadPartenaires || [],
        leadStatusHistories: fullLead.leadStatusHistories || [],
        leadStepHistories:   fullLead.leadStepHistories || [],
        techFinDetails: {
          idLeadTechFinDetails: techFinDetails?.idLeadTechFinDetails || null,
          technos:              techFinDetails?.technos || [],
          devise:               techFinDetails?.devise || null,
          typeFacturation:      techFinDetails?.typeFacturation || null,
          volumeJHVendu:        techFinDetails?.volumeJHVendu ?? 0,
          tauxDeChange:         techFinDetails?.tauxDeChange ?? 1,
          impots:               techFinDetails?.impots ?? 0,
          montantOffre:         techFinDetails?.montantOffre ?? 0,
          budget:               techFinDetails?.montantOffre ?? 0,
          dateAttribution:      techFinDetails?.dateAttribution || null,
          volumeJHVenduEtMontant: techFinDetails?.volumeJHVenduEtMontant || [],
        },
        technos:         techFinDetails?.technos || [],
        volumeJHVendu:   techFinDetails?.volumeJHVendu || 0,
        devise:          techFinDetails?.devise || null,
        tauxDeChange:    techFinDetails?.tauxDeChange || 1,
        typeFacturation: techFinDetails?.typeFacturation || null,
        impots:          techFinDetails?.impots || 0,
        dateAttribution: techFinDetails?.dateAttribution || "",
        montantOffre:    techFinDetails?.montantOffre || 0,
        budget:          techFinDetails?.montantOffre || 0,
      };

      setSelectedLead(completeLead);
      setShowFormLead(true);
    } catch (err) {
      console.error("Impossible de charger le lead complet :", err);
    } finally {
      setLeadSearchLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      nomProjet: "", dateAttribution: "", dateDebutPrevu: "", dateFinPrevu: "",
      refBC: "", refCompte: "", statutProduction: "",
      userCp: null, userSuppleante: null, typeFacturation: null, description: "",
    });
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  // ── Normalisation des ids technos (alignée sur FormTechFin) ────────────
  const normalizeTechnoIds = (input: any[]): number[] =>
    Array.from(
      new Set(
        (input ?? [])
          .map(item =>
            typeof item === "object" && item !== null
              ? Number(item.idTechno || item.id)
              : Number(item)
          )
          .filter(id => !isNaN(id) && id > 0)
      )
    );

  // ── Toggle checkbox techno ───────────────────────────────────────────────
  const handleToggleTechno = (techno: any, checked: boolean) => {
    const technoId = Number(techno.idTechno || techno.id);
    setSelectedTechnos(prev =>
      checked
        ? [...prev, techno]
        : prev.filter(t => Number(t.idTechno || t.id) !== technoId)
    );
  };

  // ── Sauvegarde ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.nomProjet || !form.dateDebutPrevu) {
      setErrorMessage("Veuillez remplir tous les champs obligatoires.");
      setShowErrorMessage(true);
      return;
    }
    setShowLoadingMessage(true);
    try {
      const idFact = form.typeFacturation?.idTypeFacturation;
      const payload: any = {
        ...form,
        typeFacturation: idFact && Number(idFact) > 0 ? { idTypeFacturation: Number(idFact) } : undefined,
        userCp:          form.userCp?.userId          ? { userId: form.userCp.userId }          : undefined,
        userSuppleante:  form.userSuppleante?.userId  ? { userId: form.userSuppleante.userId }  : undefined,
      };
      if (selectedLead) {
        payload.lead = { leadId: selectedLead.leadId || selectedLead.id };
      }

      let savedProjet: any;
      if (projet?.idProjet) {
        savedProjet = await projetService.update(projet.idProjet, payload);
      } else {
        savedProjet = await projetService.create(payload);
      }

      // ── Sauvegarde des technos (uniquement pour projets sans lead) ──────
      if (!selectedLead && savedProjet?.idProjet) {
        try {
          let details: any;
          try {
            details = await projetTechFinService.getByProjetId(savedProjet.idProjet);
          } catch {
            // Aucun details existant → on le crée avec projetId (nom attendu par le modèle Java)
            details = await projetTechFinService.create({ projetId: savedProjet.idProjet });
          }
          const detailsId = details?.idProjetTechFinDetails;
          if (detailsId) {
            await projetTechnoService.deleteByDetailsId(detailsId);
            await Promise.all(
              selectedTechnos.map(t =>
                // Le repository Java appelle getTechno().getIdTechno() → on envoie idTechno
                projetTechnoService.create({
                  idProjetTechFinDetails: detailsId,
                  techno: { idTechno: t.idTechno ?? t.id },
                })
              )
            );
          }
        } catch (err) {
          console.error("Erreur sauvegarde technos :", err);
        }
      }

      setShowLoadingMessage(false);
      setSuccessMessage(projet ? "Projet modifié avec succès !" : "Projet créé avec succès !");
      setShowSuccessMessage(true);

      await onSubmit(savedProjet);

      setTimeout(() => {
        setShowSuccessMessage(false);
        onClose();
      }, 1500);
    } catch (err) {
      setShowLoadingMessage(false);
      setErrorMessage(err instanceof Error ? err.message : "Erreur inconnue");
      setShowErrorMessage(true);
    }
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <>
      {showFormLead && selectedLead && (
        <FormLead
          show={showFormLead}
          onClose={() => {
            setShowFormLead(false);
            setSelectedLead(null);
            setLeadSearch("");
            setCreationMode("choice");
            onClose();
          }}
          onSubmit={() => {}}
          lead={selectedLead}
          initialTab="projet"
        />
      )}

      <Modal show={show && !showFormLead} onHide={onClose} fullscreen centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            {projet
              ? `Modifier le projet : ${projet.nomProjet}`
              : creationMode === "choice"    ? "Créer un projet"
              : creationMode === "from-lead" ? "Créer un projet depuis une opportunité"
              : "Créer un nouveau projet"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>

          {/* ── Étape 0 : choix du mode ── */}
          {!projet && creationMode === "choice" && (
            <div className="d-flex flex-column align-items-center gap-3 mt-5">
              <h5 className="mb-4 text-center">Comment souhaitez-vous créer le projet ?</h5>
              <Button variant="primary" size="lg" style={{ width: 320 }} onClick={() => setCreationMode("from-lead")}>
                Depuis une opportunité existante
              </Button>
              <Button variant="outline-secondary" size="lg" style={{ width: 320 }} onClick={() => setCreationMode("new")}>
                Nouveau projet interne
              </Button>
            </div>
          )}

          {/* ── Étape 1 (from-lead) : recherche autocomplete ── */}
          {!projet && creationMode === "from-lead" && (
            <div className="mb-4">
              <Form.Group className="mb-2">
                <Form.Label><strong>Rechercher une opportunité</strong> (par référence ou nom)</Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    placeholder="Ex : OPP-2024-001 ou Nom du projet..."
                    value={leadSearch}
                    onChange={e => {
                      setLeadSearch(e.target.value);
                      if (selectedLead) { setSelectedLead(null); resetForm(); }
                    }}
                    autoFocus
                  />
                  {leadSearchLoading && (
                    <Spinner animation="border" size="sm" className="position-absolute" style={{ right: 10, top: 10 }} />
                  )}
                </div>
                {leadResults.length > 0 && (
                  <ListGroup className="position-absolute shadow" style={{ zIndex: 1050, width: "calc(100% - 3rem)", maxHeight: 260, overflowY: "auto" }}>
                    {leadResults.map((lead: any) => (
                      <ListGroup.Item
                        key={lead.leadId || lead.id}
                        action
                        onClick={() => handleSelectLead(lead)}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <span><strong>{lead.leadRef}</strong> – {lead.leadName}</span>
                        <small className="text-muted">{lead.businessUnit?.name || ""}</small>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Form.Group>

              {selectedLead && (
                <div className="alert alert-info py-2 mt-2">
                  Lead sélectionné : <strong>{selectedLead.leadRef} – {selectedLead.leadName}</strong>
                  <Button variant="link" size="sm" className="ms-3 p-0 text-danger"
                    onClick={() => { setSelectedLead(null); setLeadSearch(""); resetForm(); }}>
                    Changer
                  </Button>
                </div>
              )}

              <Button variant="link" size="sm" className="text-muted"
                onClick={() => { setCreationMode("choice"); setLeadSearch(""); setLeadResults([]); setSelectedLead(null); resetForm(); }}>
                ← Retour au choix
              </Button>
            </div>
          )}

          {/* ── Formulaire projet ── */}
          {((!projet && (creationMode === "new" || (creationMode === "from-lead" && selectedLead))) || projet) && (
            <>
              {!projet && creationMode === "new" && (
                <div className="mb-3">
                  <Button variant="link" size="sm" className="text-muted p-0"
                    onClick={() => { setCreationMode("choice"); resetForm(); }}>
                    ← Retour au choix
                  </Button>
                </div>
              )}

              <Form>
                <Row>
                  {/* Colonne gauche */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nom du projet *</Form.Label>
                      <Form.Control type="text" name="nomProjet" value={form.nomProjet} onChange={handleChange} required />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Date d'attribution</Form.Label>
                      <Form.Control type="date" name="dateAttribution" value={form.dateAttribution}
                        onChange={async e => {
                          const val = e.target.value;
                          setForm((prev: any) => ({ ...prev, dateAttribution: val }));
                          effacerAttribution();
                          await ajusterAttribution(val, (adj) =>
                            setForm((prev: any) => ({ ...prev, dateAttribution: adj }))
                          );
                        }} />
                      {alerteAttribution && (
                        <div style={{ display:"flex", gap:"0.4rem", alignItems:"flex-start", background:"#fff8e1", border:"1px solid #ffc107", borderLeft:"4px solid #ff9800", borderRadius:6, padding:"6px 10px", fontSize:"0.78rem", color:"#5a3e00", marginTop:"0.35rem" }}>
                          <span>⚠️</span>
                          <div style={{ flex:1 }}>
                            <strong>{alerteAttribution.libelleJourFerie}</strong> — reporté au{" "}
                            <strong style={{ color:"#2d6a4f" }}>
                              {new Date(alerteAttribution.dateAjustee + "T00:00:00").toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}
                            </strong>
                          </div>
                          <button onClick={effacerAttribution} style={{ background:"none", border:"none", cursor:"pointer", color:"#9a7000", padding:0 }}>✕</button>
                        </div>
                      )}
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Ref Compte</Form.Label>
                      <Form.Control type="text" name="refCompte" value={form.refCompte} onChange={handleChange} />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Chef de projet</Form.Label>
                      <Form.Select name="userCp" value={form.userCp?.userId || ""}
                        onChange={e => setForm(prev => ({ ...prev, userCp: users.find(u => u.userId === Number(e.target.value)) || null }))}>
                        <option value="">Sélectionnez</option>
                        {users.map(u => <option key={u.userId} value={u.userId}>{u.nom} {u.username}</option>)}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Type de facturation</Form.Label>
                      <Form.Select name="typeFacturation" value={form.typeFacturation?.idTypeFacturation || ""}
                        onChange={e => setForm(prev => ({ ...prev, typeFacturation: typeFacturations.find(t => t.idTypeFacturation === Number(e.target.value)) || null }))}>
                        <option value="">— Sélectionnez —</option>
                        {typeFacturations.map(t => <option key={t.idTypeFacturation} value={t.idTypeFacturation}>{t.nomTypeFacturation}</option>)}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  {/* Colonne droite */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date de début prévu *</Form.Label>
                      <Form.Control type="date" name="dateDebutPrevu" value={form.dateDebutPrevu}
                        onChange={async e => {
                          const val = e.target.value;
                          setForm((prev: any) => ({ ...prev, dateDebutPrevu: val }));
                          effacerDebut();
                          await ajusterDebut(val, (adj) =>
                            setForm((prev: any) => ({ ...prev, dateDebutPrevu: adj }))
                          );
                        }} required />
                      {alerteDebut && (
                        <div style={{ display:"flex", gap:"0.4rem", alignItems:"flex-start", background:"#fff8e1", border:"1px solid #ffc107", borderLeft:"4px solid #ff9800", borderRadius:6, padding:"6px 10px", fontSize:"0.78rem", color:"#5a3e00", marginTop:"0.35rem" }}>
                          <span>⚠️</span>
                          <div style={{ flex:1 }}>
                            <strong>{alerteDebut.libelleJourFerie}</strong> — reporté au{" "}
                            <strong style={{ color:"#2d6a4f" }}>
                              {new Date(alerteDebut.dateAjustee + "T00:00:00").toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}
                            </strong>
                          </div>
                          <button onClick={effacerDebut} style={{ background:"none", border:"none", cursor:"pointer", color:"#9a7000", padding:0 }}>✕</button>
                        </div>
                      )}
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Date de fin prévu</Form.Label>
                      <Form.Control type="date" name="dateFinPrevu" value={form.dateFinPrevu}
                        onChange={async e => {
                          const val = e.target.value;
                          setForm((prev: any) => ({ ...prev, dateFinPrevu: val }));
                          effacerFin();
                          await ajusterFin(val, (adj) =>
                            setForm((prev: any) => ({ ...prev, dateFinPrevu: adj }))
                          );
                        }} />
                      {alerteFin && (
                        <div style={{ display:"flex", gap:"0.4rem", alignItems:"flex-start", background:"#fff8e1", border:"1px solid #ffc107", borderLeft:"4px solid #ff9800", borderRadius:6, padding:"6px 10px", fontSize:"0.78rem", color:"#5a3e00", marginTop:"0.35rem" }}>
                          <span>⚠️</span>
                          <div style={{ flex:1 }}>
                            <strong>{alerteFin.libelleJourFerie}</strong> — reporté au{" "}
                            <strong style={{ color:"#2d6a4f" }}>
                              {new Date(alerteFin.dateAjustee + "T00:00:00").toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}
                            </strong>
                          </div>
                          <button onClick={effacerFin} style={{ background:"none", border:"none", cursor:"pointer", color:"#9a7000", padding:0 }}>✕</button>
                        </div>
                      )}
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Ref BC</Form.Label>
                      <Form.Control type="text" name="refBC" value={form.refBC} onChange={handleChange} />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Suppléant(e)</Form.Label>
                      <Form.Select name="userSuppleante" value={form.userSuppleante?.userId || ""}
                        onChange={e => setForm(prev => ({ ...prev, userSuppleante: users.find(u => u.userId === Number(e.target.value)) || null }))}>
                        <option value="">Sélectionnez</option>
                        {users.map(u => <option key={u.userId} value={u.userId}>{u.nom} {u.username}</option>)}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Description</Form.Label>
                      <Form.Control as="textarea" rows={4} name="description" value={form.description} onChange={handleChange} placeholder="Ajouter une description du projet" />
                    </Form.Group>
                  </Col>
                </Row>

                {/* ── Technologies — uniquement pour projets sans lead ── */}
                {!selectedLead && (
                  <Row className="mt-2">
                    <Col md={8}>
                      <Form.Group>
                        <Form.Label><strong>Technologies</strong></Form.Label>
                        <div className="d-flex flex-column">
                          {allTechnos.map(t => {
                            const idTech = Number(t.idTechno || t.id);
                            const isChecked = normalizeTechnoIds(selectedTechnos).includes(idTech);
                            return (
                              <Form.Check
                                key={idTech}
                                type="checkbox"
                                id={`techno-${idTech}`}
                                label={t.nomTechno}
                                checked={isChecked}
                                onChange={e => handleToggleTechno(t, e.target.checked)}
                              />
                            );
                          })}
                        </div>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="mt-2"
                          onClick={() => setShowTechnoModal(true)}
                        >
                          <FaPlus className="me-1" /> Ajouter une techno
                        </Button>
                      </Form.Group>
                    </Col>
                  </Row>
                )}
              </Form>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          {((!projet && (creationMode === "new" || (creationMode === "from-lead" && selectedLead))) || projet) && (
            <Button variant="primary" onClick={handleSave}>
              {projet ? "Modifier" : "Créer"}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* ── Modal création Techno ── */}
      <Modal show={showTechnoModal} onHide={() => setShowTechnoModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Créer une technologie</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <GenericForm
            valueKey="nomTechno"
            initialData={{ nomTechno: "", descTechno: "" }}
            extraInputs={[{ name: "descTechno", label: "Description", type: "textarea" }]}
            onSubmit={async (data: any) => {
              const newTechno = await technoService.create(data);
              setAllTechnos(prev =>
                Array.from(new Map([...prev, newTechno].map(t => [t.idTechno ?? t.id, t])).values())
              );
              setSelectedTechnos(prev => [...prev, newTechno]);
              setShowTechnoModal(false);
            }}
            onCancel={() => setShowTechnoModal(false)}
            submitLabel="Créer"
            title=""
          />
        </Modal.Body>
      </Modal>

      {showLoadingMessage && <CollecteLoadingMessage />}
      {showSuccessMessage && <CollecteSuccessMessage message={successMessage} />}
      {showErrorMessage   && <CollecteErrorMessage   message={errorMessage} />}
    </>
  );
};

export default FormProjet;