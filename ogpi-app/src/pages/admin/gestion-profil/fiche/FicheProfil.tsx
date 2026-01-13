import React from "react";
import { Profil } from "../../../../types/profil/Profil.tsx";
import { Modal, Button } from "react-bootstrap";
import "./FicheProfil.css";

type FicheProfilProps = {
  profil: Profil | null;
  onClose: () => void;
};

const FicheProfil: React.FC<FicheProfilProps> = ({ profil, onClose }) => {
  if (!profil) return null;

  /* ===== Helpers ===== */
  const getPosteActuel = () =>
    profil.profilPostes?.find((p) => !p.endDate) ?? null;

  const getContractLabel = (c?: number) => {
    switch (c) {
      case 1:
        return "CDI";
      case 2:
        return "CDD";
      case 3:
        return "STAGE";
      default:
        return "—";
    }
  };

  const getSexLabel = (s?: number) => {
    if (s === 1) return "Masculin";
    if (s === 2) return "Féminin";
    return "—";
  };

  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString() : "—";

  const posteActuel = getPosteActuel();

  return (
    <Modal
      show={!!profil}
      onHide={onClose}
      size="lg"
      centered
      className="fiche-profil-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          Fiche de : {profil.prenom} {profil.nom}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="fiche-profil-body">
        {/* Badge type de collaborateur */}
        <div className="type-collab-badge-wrapper">
          <span
            className={`type-collab-badge ${
              profil.type === 1 ? "interne" : "externe"
            }`}
          >
            {profil.type === 1
              ? "Collaborateur interne"
              : "Collaborateur externe"}
          </span>
        </div>

        {/* ===== Identité professionnelle ===== */}
        <section className="fiche-section">
          <h4>1. Identité professionnelle</h4>
          <div className="fiche-grid">
            <div>
              <strong>Matricule :</strong> {profil.matricule ?? "—"}
            </div>
            <div>
              <strong>Nom :</strong> {profil.nom ?? "—"}
            </div>
            <div>
              <strong>Prénom :</strong> {profil.prenom ?? "—"}
            </div>
            <div>
              <strong>Date de naissance :</strong>{" "}
              {fmtDate(profil.dateNaissance)}
            </div>
            <div>
              <strong>Appellation :</strong> {profil.appellation ?? "—"}
            </div>
            <div>
              <strong>Sexe :</strong> {getSexLabel(profil.sexe)}
            </div>
            <div>
              <strong>Poste actuel / Rôle :</strong>{" "}
              {posteActuel?.poste?.label ?? "—"}
            </div>
            <div>
              <strong>BU d’appartenance :</strong>{" "}
              {posteActuel?.businessUnit?.name ?? "—"}
            </div>
            <div>
              <strong>Seniorité (années) :</strong>{" "}
              {profil.expAvant ?? 0}
            </div>
            <div>
              <strong>Email pro :</strong> {profil.emailPro ?? "—"}
            </div>
            <div>
              <strong>Email perso :</strong> {profil.emailPerso ?? "—"}
            </div>
            <div>
              <strong>Téléphone :</strong> {profil.telephone ?? "—"}
            </div>
          </div>
        </section>

        {/* ===== Contrat & Dates ===== */}
        <section className="fiche-section">
          <h4>2. Contrat & Dates</h4>
          <div className="fiche-grid">
            <div>
              <strong>Type de contrat :</strong>{" "}
              {getContractLabel(profil.contrat)}
            </div>
            <div>
              <strong>Date d'embauche :</strong> {fmtDate(profil.dateEmbauche)}
            </div>
            <div>
              <strong>Date d'intégration :</strong>{" "}
              {fmtDate(profil.dateIntegr)}
            </div>
            <div>
              <strong>Date de fin / débauche :</strong>{" "}
              {fmtDate(profil.dateDebauche)}
            </div>
          </div>
        </section>

        {/* ===== Diplômes ===== */}
        <section className="fiche-section">
          <h4>3. Diplômes</h4>
          {(!profil.etudes || profil.etudes.length === 0) ? (
            <p>Aucun diplôme renseigné</p>
          ) : (
            <div className="cards-container">
              {profil.etudes.map((e) => (
                <div className="card-item" key={e.id}>
                  <div><strong>Niveau :</strong> {e.diplome?.label ?? "—"}</div>
                  <div><strong>Filière :</strong> {e.filiere?.label ?? "—"}</div>
                  <div><strong>Université :</strong> {e.etablissement?.label ?? "—"}</div>
                  <div><strong>Année :</strong> {e.obtention ? new Date(e.obtention).getFullYear() : "—"}</div>
                  {e.link && (
                    <div>
                      <strong>Pièce jointe :</strong>{" "}
                      <a href={e.link} target="_blank" rel="noreferrer">Télécharger</a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== Certifications ===== */}
        <section className="fiche-section">
          <h4>4. Certifications</h4>
          {(!profil.profilCertifications || profil.profilCertifications.length === 0) ? (
            <p>Aucune certification</p>
          ) : (
            <div className="cards-container">
              {profil.profilCertifications.map((c) => (
                <div className="card-item" key={c.id}>
                  <div><strong>Nom :</strong> {c.certification?.label ?? "—"}</div>
                  <div><strong>Organisme :</strong> {c.organisme?.label ?? "—"}</div>
                  <div><strong>Date :</strong> {fmtDate(c.obtention)}</div>
                  <div><strong>Score :</strong> {c.score ?? "—"}</div>
                  <div>
                    <strong>Badge :</strong>{" "}
                    {c.badge ? (
                      <a href={c.badge} target="_blank" rel="noreferrer">Voir Badge</a>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== Hard Skills ===== */}
        <section className="fiche-section">
          <h4>5. Hard Skills</h4>
          {(!profil.hardSkillsNotes || profil.hardSkillsNotes.length === 0) ? (
            <p>Aucune compétence technique</p>
          ) : (
            <ul className="profil-list">
              {profil.hardSkillsNotes.map((h) => (
                <li key={h.id}>
                  <strong>Compétence :</strong> {h.hardSkills?.name ?? "—"} |{" "}
                  <strong>Note :</strong> {h.note ?? "—"}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ===== Soft Skills ===== */}
        <section className="fiche-section">
          <h4>6. Soft Skills</h4>
          {(!profil.profilSoftSkills || profil.profilSoftSkills.length === 0) ? (
            <p>Aucune soft skill</p>
          ) : (
            <ul className="soft-skills-list">
              {profil.profilSoftSkills.map((s) => (
                <li key={s.id}>{s.softSkills?.label ?? "—"}</li>
              ))}
            </ul>
          )}
        </section>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FicheProfil;
