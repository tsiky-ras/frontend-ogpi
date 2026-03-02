import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Row, Col, Nav, Tab, ListGroup, Spinner } from "react-bootstrap";
import { useAuth } from "../../../../context/AuthContext.tsx";

import CollecteSuccessMessage from "../../../../components/message/CollecteSuccessMessage.tsx";
import CollecteErrorMessage from "../../../../components/message/CollecteErrorMessage.tsx";
import CollecteLoadingMessage from "../../../../components/message/CollecteLoadingMessage.tsx";

import { ProjetService } from "../../../../services/projet/ProjetService.tsx";
import { useUserService } from "../../../../services/user/UserService.tsx";
import { useTypeFacturationService } from "../../../../services/lead/tech-fin/TypeFacturationService.tsx";
import { LeadService } from "../../../../services/lead/LeadService.tsx";
import { useLeadTechFinDetailsService } from "../../../../services/lead/tech-fin/LeadTechFinDetailsService.tsx";
import { Projet } from "../../../../types/projet/Projet.tsx";
import FormLead from "../../gestion-lead/form/FormLead.tsx";

type FormProjetProps = {
  onSubmit: (projet: Projet) => void | Promise<void>;
  show: boolean;
  onClose: () => void;
  projet?: Projet | null;
};

// ─── Étape 1 : choix du mode de création ────────────────────────────────────
type CreationMode = "choice" | "from-lead" | "new";

const FormProjet: React.FC<FormProjetProps> = ({ show, onClose, onSubmit, projet }) => {
  const { api } = useAuth();
  const projetService = new ProjetService(api);
  const userService = useUserService();
  const typeFactService = useTypeFacturationService();
  const leadService = new LeadService(api);
  const leadTechFinService = useLeadTechFinDetailsService();

  // ── Mode sélection ──────────────────────────────────────────────────────
  const [creationMode, setCreationMode] = useState<CreationMode>("choice");

  // ── Recherche de lead ───────────────────────────────────────────────────
  const [leadSearch, setLeadSearch] = useState("");
  const [leadResults, setLeadResults] = useState<any[]>([]);
  const [leadSearchLoading, setLeadSearchLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  // ── Ouverture du FormLead sur l'onglet Projet après sélection ──────────
  const [showFormLead, setShowFormLead] = useState(false);

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

  const [users, setUsers] = useState<any[]>([]);
  const [typeFacturations, setTypeFacturations] = useState<any[]>([]);

  /* Messages */
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showLoadingMessage, setShowLoadingMessage] = useState(false);

  // ── Reset à l'ouverture ─────────────────────────────────────────────────
  useEffect(() => {
    if (!show) return;
    if (projet) {
      // Mode édition : on saute le choix
      setCreationMode("new");
      setForm({
        nomProjet: projet.nomProjet || "",
        dateAttribution: projet.dateAttribution || "",
        dateDebutPrevu: projet.dateDebutPrevu || "",
        dateFinPrevu: projet.dateFinPrevu || "",
        refBC: projet.refBC || "",
        refCompte: projet.refCompte || "",
        statutProduction: projet.statutProduction || "",
        userCp: projet.userCp || null,
        userSuppleante: projet.userSuppleante || null,
        typeFacturation: projet.typeFacturation || { idTypeFacturation: 1, libelle: "Interne" },
        description: projet.description || "",
      });
    } else {
      setCreationMode("choice");
      setLeadSearch("");
      setLeadResults([]);
      setSelectedLead(null);
      resetForm();
    }
  }, [show, projet]);

  // ── Chargement des listes ───────────────────────────────────────────────
  useEffect(() => {
    if (!show) return;
    const fetchData = async () => {
      try {
        const [userList, factList] = await Promise.all([
          userService.getAll(),
          typeFactService.getAll(),
        ]);
        console.log("typeFactService.getAll()", factList);
        setUsers(userList);
        setTypeFacturations(factList);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [show]);

  // ── Chargement de tous les leads au montage ────────────────────────────
  const [allLeads, setAllLeads] = useState<any[]>([]);

  useEffect(() => {
    if (!show) return;
    const fetchLeads = async () => {
      setLeadSearchLoading(true);
      try {
        const results = await leadService.getAll();
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

  // ── Filtrage local sur nom ou ref ───────────────────────────────────────
  useEffect(() => {
    const query = leadSearch.trim().toLowerCase();
    if (!query) {
      setLeadResults([]);
      return;
    }
    const filtered = allLeads.filter(
      (lead) =>
        lead.leadName?.toLowerCase().includes(query) ||
        lead.leadRef?.toLowerCase().includes(query)
    );
    setLeadResults(filtered);
  }, [leadSearch, allLeads]);

  // ── Chargement complet du lead + TechFin (même logique que ListeLead.loadFullLeadDetails) ──
  const handleSelectLead = async (lead: any) => {
    setLeadSearch(`${lead.leadRef || ""} – ${lead.leadName || ""}`);
    setLeadResults([]);
    setLeadSearchLoading(true);

    try {
      const leadId = lead.leadId || lead.id;

      // 1. Lead complet avec partenaires et historiques
      const fullLead = await leadService.getById(leadId);

      // 2. Données TechFin séparées
      let techFinDetails: any = null;
      try {
        techFinDetails = await leadTechFinService.getByLeadId(leadId);
      } catch (err) {
        console.warn("Pas de données TechFin pour ce lead :", err);
      }

      // 3. Fusion identique à loadFullLeadDetails dans ListeLead
      const completeLead = {
        ...fullLead,
        id: fullLead.leadId || fullLead.id,
        leadId: fullLead.leadId || fullLead.id,
        name: fullLead.leadName || fullLead.name,

        client: fullLead.client || null,
        createdByUser: fullLead.createdByUser || null,
        partenaires: fullLead.leadPartenaires?.map((lp: any) => lp.partenaire) || [],
        leadPartenaires: fullLead.leadPartenaires || [],
        leadStatusHistories: fullLead.leadStatusHistories || [],
        leadStepHistories: fullLead.leadStepHistories || [],

        // TechFin — objet structuré pour DetailsLead
        techFinDetails: {
          idLeadTechFinDetails: techFinDetails?.idLeadTechFinDetails || null,
          technos: techFinDetails?.technos || [],
          devise: techFinDetails?.devise || null,
          typeFacturation: techFinDetails?.typeFacturation || null,
          volumeJHVendu: techFinDetails?.volumeJHVendu ?? 0,
          tauxDeChange: techFinDetails?.tauxDeChange ?? 1,
          impots: techFinDetails?.impots ?? 0,
          montantOffre: techFinDetails?.montantOffre ?? 0,
          budget: techFinDetails?.montantOffre ?? 0,
          dateAttribution: techFinDetails?.dateAttribution || null,
          volumeJHVenduEtMontant: techFinDetails?.volumeJHVenduEtMontant || [],
        },

        // TechFin — champs plats pour FormLead (mapLeadToTechFinForm + fetchAll)
        technos: techFinDetails?.technos || [],
        volumeJHVendu: techFinDetails?.volumeJHVendu || 0,
        devise: techFinDetails?.devise || null,
        tauxDeChange: techFinDetails?.tauxDeChange || 1,
        typeFacturation: techFinDetails?.typeFacturation || null,
        impots: techFinDetails?.impots || 0,
        dateAttribution: techFinDetails?.dateAttribution || "",
        montantOffre: techFinDetails?.montantOffre || 0,
        budget: techFinDetails?.montantOffre || 0,
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
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.nomProjet || !form.dateDebutPrevu) {
      setErrorMessage("Veuillez remplir tous les champs obligatoires.");
      setShowErrorMessage(true);
      return;
    }
    setShowLoadingMessage(true);
    try {
      let savedProjet;
      const idFact = form.typeFacturation?.idTypeFacturation;
      const payload: any = {
        ...form,
        typeFacturation: idFact && Number(idFact) > 0
          ? { idTypeFacturation: Number(idFact) }
          : undefined, 
        userCp: form.userCp?.userId ? { userId: form.userCp.userId } : undefined,
        userSuppleante: form.userSuppleante?.userId ? { userId: form.userSuppleante.userId } : undefined,
      };
      if (selectedLead) {
        payload.lead = { leadId: selectedLead.leadId || selectedLead.id };
      }
      if (projet?.idProjet) {
        savedProjet = await projetService.update(projet.idProjet, payload);
      } else {
        savedProjet = await projetService.create(payload);
      }
      setShowLoadingMessage(false);
      setSuccessMessage(projet ? "Projet modifié avec succès !" : "Projet créé avec succès !");
      setShowSuccessMessage(true);

      await onSubmit(savedProjet); // ← attendre le reload parent

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
      {/* ── FormLead complet ouvert sur l'onglet Projet après sélection d'un lead ── */}
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
          onSubmit={(data) => {
            // Remonte l'info si besoin (ex: lead mis à jour)
          }}
          lead={selectedLead}
          initialTab="projet"
        />
      )}

      <Modal show={show && !showFormLead} onHide={onClose} fullscreen centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            {projet
              ? `Modifier le projet : ${projet.nomProjet}`
              : creationMode === "choice"
              ? "Créer un projet"
              : creationMode === "from-lead"
              ? "Créer un projet depuis une opportunité"
              : "Créer un nouveau projet"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {/* ── Étape 0 : choix du mode ── */}
          {!projet && creationMode === "choice" && (
            <div className="d-flex flex-column align-items-center gap-3 mt-5">
              <h5 className="mb-4 text-center">Comment souhaitez-vous créer le projet ?</h5>
              <Button
                variant="primary"
                size="lg"
                style={{ width: 320 }}
                onClick={() => setCreationMode("from-lead")}
              >
                Depuis une opportunité existante
              </Button>
              <Button
                variant="outline-secondary"
                size="lg"
                style={{ width: 320 }}
                onClick={() => setCreationMode("new")}
              >
                Nouveau projet interne
              </Button>
            </div>
          )}

          {/* ── Étape 1 (from-lead) : recherche autocomplete ── */}
          {!projet && creationMode === "from-lead" && (
            <div className="mb-4">
              <Form.Group className="mb-2">
                <Form.Label>
                  <strong>Rechercher une opportunité</strong> (par référence ou nom)
                </Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    placeholder="Ex : OPP-2024-001 ou Nom du projet..."
                    value={leadSearch}
                    onChange={(e) => {
                      setLeadSearch(e.target.value);
                      if (selectedLead) {
                        setSelectedLead(null);
                        resetForm();
                      }
                    }}
                    autoFocus
                  />
                  {leadSearchLoading && (
                    <Spinner
                      animation="border"
                      size="sm"
                      className="position-absolute"
                      style={{ right: 10, top: 10 }}
                    />
                  )}
                </div>
                {leadResults.length > 0 && (
                  <ListGroup
                    className="position-absolute shadow"
                    style={{ zIndex: 1050, width: "calc(100% - 3rem)", maxHeight: 260, overflowY: "auto" }}
                  >
                    {leadResults.map((lead: any) => (
                      <ListGroup.Item
                        key={lead.leadId || lead.id}
                        action
                        onClick={() => handleSelectLead(lead)}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <span>
                          <strong>{lead.leadRef}</strong> – {lead.leadName}
                        </span>
                        <small className="text-muted">
                          {lead.businessUnit?.name || ""}
                        </small>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Form.Group>

              {selectedLead && (
                <div className="alert alert-info py-2 mt-2">
                  Lead sélectionné :{" "}
                  <strong>
                    {selectedLead.leadRef} – {selectedLead.leadName}
                  </strong>
                  <Button
                    variant="link"
                    size="sm"
                    className="ms-3 p-0 text-danger"
                    onClick={() => {
                      setSelectedLead(null);
                      setLeadSearch("");
                      resetForm();
                    }}
                  >
                    Changer
                  </Button>
                </div>
              )}

              <Button
                variant="link"
                size="sm"
                className="text-muted"
                onClick={() => {
                  setCreationMode("choice");
                  setLeadSearch("");
                  setLeadResults([]);
                  setSelectedLead(null);
                  resetForm();
                }}
              >
                ← Retour au choix
              </Button>
            </div>
          )}

          {/* ── Formulaire projet (affiché si mode new, ou si lead sélectionné) ── */}
          {((!projet && (creationMode === "new" || (creationMode === "from-lead" && selectedLead))) ||
            projet) && (
            <>
              {!projet && creationMode === "new" && (
                <div className="mb-3">
                  <Button
                    variant="link"
                    size="sm"
                    className="text-muted p-0"
                    onClick={() => {
                      setCreationMode("choice");
                      resetForm();
                    }}
                  >
                    ← Retour au choix
                  </Button>
                </div>
              )}
              <Form>
                <Row>
                  {/* Colonne de gauche */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nom du projet *</Form.Label>
                      <Form.Control
                        type="text"
                        name="nomProjet"
                        value={form.nomProjet}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Date d'attribution</Form.Label>
                      <Form.Control
                        type="date"
                        name="dateAttribution"
                        value={form.dateAttribution}
                        onChange={handleChange}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Ref Compte</Form.Label>
                      <Form.Control
                        type="text"
                        name="refCompte"
                        value={form.refCompte}
                        onChange={handleChange}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Chef de projet</Form.Label>
                      <Form.Select
                        name="userCp"
                        value={form.userCp?.userId || ""}
                        onChange={(e) => {
                          const user =
                            users.find((u) => u.userId === Number(e.target.value)) || null;
                          setForm((prev) => ({ ...prev, userCp: user }));
                        }}
                      >
                        <option value="">Sélectionnez</option>
                        {users.map((u) => (
                          <option key={u.userId} value={u.userId}>
                            {u.nom} {u.username}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Type de facturation</Form.Label>
                      <Form.Select
                        name="typeFacturation"
                        value={form.typeFacturation?.idTypeFacturation || ""}
                        onChange={(e) => {
                          const type =
                            typeFacturations.find((t) => t.idTypeFacturation === Number(e.target.value)) || null;
                          setForm((prev) => ({ ...prev, typeFacturation: type }));
                        }}
                      >
                        <option value="">— Sélectionnez —</option>
                        {typeFacturations.map((t) => (
                          <option key={t.idTypeFacturation} value={t.idTypeFacturation}>
                            {t.nomTypeFacturation}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>             
                    </Col>
                  {/* Colonne de droite */}
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date de début prévu *</Form.Label>
                      <Form.Control
                        type="date"
                        name="dateDebutPrevu"
                        value={form.dateDebutPrevu}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Date de fin prévu</Form.Label>
                      <Form.Control
                        type="date"
                        name="dateFinPrevu"
                        value={form.dateFinPrevu}
                        onChange={handleChange}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Ref BC</Form.Label>
                      <Form.Control
                        type="text"
                        name="refBC"
                        value={form.refBC}
                        onChange={handleChange}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Suppléant(e)</Form.Label>
                      <Form.Select
                        name="userSuppleante"
                        value={form.userSuppleante?.userId || ""}
                        onChange={(e) => {
                          const user =
                            users.find((u) => u.userId === Number(e.target.value)) || null;
                          setForm((prev) => ({ ...prev, userSuppleante: user }));
                        }}
                      >
                        <option value="">Sélectionnez</option>
                        {users.map((u) => (
                          <option key={u.userId} value={u.userId}>
                            {u.nom} {u.username}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        placeholder="Ajouter une description du projet"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          {/* Bouton Sauvegarder uniquement si le formulaire est visible */}
          {((!projet &&
            (creationMode === "new" ||
              (creationMode === "from-lead" && selectedLead))) ||
            projet) && (
            <Button variant="primary" onClick={handleSave}>
              {projet ? "Modifier" : "Créer"}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {showLoadingMessage && <CollecteLoadingMessage />}
      {showSuccessMessage && <CollecteSuccessMessage message={successMessage} />}
      {showErrorMessage && (
        <CollecteErrorMessage message={errorMessage} />
      )}
    </>
  );
};

export default FormProjet;