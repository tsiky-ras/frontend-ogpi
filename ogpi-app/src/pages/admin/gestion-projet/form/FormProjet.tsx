import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { useAuth } from "../../../../context/AuthContext.tsx";

import CollecteSuccessMessage from "../../../../components/message/CollecteSuccessMessage.tsx";
import CollecteErrorMessage from "../../../../components/message/CollecteErrorMessage.tsx";
import CollecteLoadingMessage from "../../../../components/message/CollecteLoadingMessage.tsx";

import { ProjetService } from "../../../../services/projet/ProjetService.tsx";
import { useUserService } from "../../../../services/user/UserService.tsx";
import { useTypeFacturationService } from "../../../../services/lead/tech-fin/TypeFacturationService.tsx";

import { Projet } from "../../types/projet/Projet"; // Assurez-vous que Projet inclut description

type FormProjetProps = {
  show: boolean;
  onClose: () => void;
  onSubmit: (projet: Projet) => void;
  projet?: Projet | null;
};

const FormProjet: React.FC<FormProjetProps> = ({ show, onClose, onSubmit, projet }) => {
  const { api } = useAuth();
  const projetService = new ProjetService(api);
  const userService = useUserService();
  const typeFactService = useTypeFacturationService();

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
    typeFacturation: { idTypeFacturation: 1, libelle: "Interne" },
    description: "",
  });

  const [users, setUsers] = useState<any[]>([]);
  const [statuts, setStatuts] = useState<any[]>([]);
  const [typeFacturations, setTypeFacturations] = useState<any[]>([]);

  /* Messages */
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showLoadingMessage, setShowLoadingMessage] = useState(false);

  useEffect(() => {
    if (!show) return;

    const fetchData = async () => {
      try {
        const [userList, factList] = await Promise.all([
          userService.getAll(),
          typeFactService.getAll(),
        ]);
        setUsers(userList);
        setTypeFacturations(factList);

        // Statuts production fixes
        setStatuts([
          { id: 1, label: "Planifié" },
          { id: 2, label: "En cours" },
          { id: 3, label: "Terminé" },
        ]);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, [show]);

  useEffect(() => {
    if (!show) return;
    if (projet) {
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
      setForm(prev => ({
        ...prev,
        nomProjet: "",
        dateAttribution: "",
        dateDebutPrevu: "",
        dateFinPrevu: "",
        refBC: "",
        refCompte: "",
        statutProduction: "",
        userCp: null,
        userSuppleante: null,
        typeFacturation: { idTypeFacturation: 1, libelle: "Interne" },
        description: "",
      }));
    }
  }, [show, projet]);

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
      if (projet?.idProjet) {
        savedProjet = await projetService.update(projet.idProjet, form);
      } else {
        savedProjet = await projetService.create(form);
      }

      setShowLoadingMessage(false);
      setSuccessMessage("Projet sauvegardé avec succès !");
      setShowSuccessMessage(true);
      onSubmit(savedProjet);

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

  return (
    <>
      <Modal show={show} onHide={onClose} fullscreen centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            {projet ? `Modifier le projet : ${projet.nomProjet}` : "Créer un projet"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
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
                      const user = users.find(u => u.userId === Number(e.target.value)) || null;
                      setForm(prev => ({ ...prev, userCp: user }));
                    }}
                  >
                    <option value="">Sélectionnez</option>
                    {users.map(u => (
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
                      const type = typeFacturations.find(t => t.idTypeFacturation === Number(e.target.value));
                      setForm(prev => ({ ...prev, typeFacturation: type }));
                    }}
                  >
                    {typeFacturations.map(t => (
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
                  <Form.Label>Date de fin prévu</Form.Label>
                  <Form.Control
                    type="date"
                    name="dateFinPrevu"
                    value={form.dateFinPrevu}
                    onChange={handleChange}
                  />
                </Form.Group>
                
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
                      const user = users.find(u => u.userId === Number(e.target.value)) || null;
                      setForm(prev => ({ ...prev, userSuppleante: user }));
                    }}
                  >
                    <option value="">Sélectionnez</option>
                    {users.map(u => (
                      <option key={u.userId} value={u.userId}>
                        {u.nom} {u.username}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                {/* Champ Description */}
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
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {projet ? "Modifier" : "Créer"}
          </Button>
        </Modal.Footer>
      </Modal>

      {showLoadingMessage && <CollecteLoadingMessage />}
      {showSuccessMessage && <CollecteSuccessMessage message={successMessage} />}
      {showErrorMessage && <CollecteErrorMessage message={errorMessage} />}
    </>
  );
};

export default FormProjet;