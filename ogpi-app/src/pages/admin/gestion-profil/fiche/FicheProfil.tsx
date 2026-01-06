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

  const getPosteActuel = () => profil.postes.find(p => !p.endDate);
  const getYear = (dateStr?: string) => (dateStr ? new Date(dateStr).getFullYear() : "—");

  const seniority = profil.experience_avant ?? 0;

  return (
    <Modal show={!!profil} onHide={onClose} size="lg" centered className="fiche-profil-modal">
      <Modal.Header closeButton>
        <Modal.Title>Fiche de {profil.prenom} {profil.nom}</Modal.Title>
      </Modal.Header>

      <Modal.Body className="fiche-profil-body">
        {/* ===== Type de collaborateur ===== */}
        <section className="fiche-section">
          <h4>Type de collaborateur</h4>
          <p>{profil.type_profil === 1 ? "Collaborateur interne" : "Collaborateur externe"}</p>
        </section>

        {/* ===== Identité professionnelle ===== */}
        <section className="fiche-section">
          <h4>1. Identité professionnelle</h4>
          <div className="fiche-grid">
            <div>
              <strong>Matricule :</strong> {profil.matricule}
            </div>
            <div>
                <strong>Nom et prénom :</strong> <span className="fiche-identite-nom">{profil.nom} {profil.prenom}</span>
            </div>
            <div>
              <strong>Poste actuel / Rôle :</strong> {getPosteActuel()?.poste.label ?? "—"}
            </div>
            <div>
              <strong>BU d’appartenance :</strong> {getPosteActuel()?.bu.name ?? "—"}
            </div>
            <div>
              <strong>Seniorité :</strong> {seniority} années
            </div>
          </div>
        </section>

        {/* ===== Diplômes ===== */}
        <section className="fiche-section">
          <h4>2. Diplômes</h4>
          {profil.etudes.length === 0 && <p>Aucun diplôme renseigné</p>}
          {profil.etudes.map(e => (
            <div className="fiche-grid" key={e.profilEtudeId}>
              <div>
                <strong>Niveau d’étude :</strong> {e.diplome.label}
              </div>
              <div>
                <strong>Université / Établissement :</strong> {e.etablissement.label}
              </div>
              <div>
                <div>
                <strong>Année d’obtention :</strong> {getYear(e.obtention)}
                </div>
              </div>
              <div>
                <strong>Pièce jointe :</strong> 
                <a href="#" className="fiche-link"> Télécharger PDF</a>
              </div>
            </div>
          ))}
        </section>

        {/* ===== Certifications ===== */}
        <section className="fiche-section">
          <h4>3. Certifications</h4>
          {profil.certifications.length === 0 && <p>Aucune certification</p>}
          {profil.certifications.map(c => (
            <div className="fiche-grid" key={c.id}>
              <div>
                <strong>Nom :</strong> {c.label}
              </div>
              <div>
                <strong>Organisme :</strong> {c.organisme.label}
              </div>
              <div>
                <strong>Date d’obtention :</strong> {c.obtention}
              </div>
              <div>
                <strong>Niveau / Score :</strong> {c.score ?? "—"}
              </div>
              <div>
                <strong>Badge numérique :</strong> {c.badge ? <a href={c.badge}>🏅 Voir</a> : "—"}
              </div>
            </div>
          ))}
        </section>

        {/* ===== Hard Skills ===== */}
        <section className="fiche-section">
          <h4>4. Hard Skills</h4>
          {profil.hard_skills.length === 0 && <p>Aucune compétence technique</p>}
          {profil.hard_skills.map(h => (
            <div className="fiche-grid" key={h.id}>
              <div>
                <strong>Compétence :</strong> {h.domaine.label}
              </div>
              <div>
                <strong>Niveau :</strong> {h.niveau}
              </div>
            </div>
          ))}
        </section>

        {/* ===== Soft Skills ===== */}
        <section className="fiche-section">
          <h4>5. Soft Skills</h4>
          {profil.soft_skills.length === 0 && <p>Aucune soft skill</p>}
          <div className="fiche-grid">
            {profil.soft_skills.map(s => (
              <div key={s.domaine.id} className="soft-skill">
                {s.domaine.label}
              </div>
            ))}
          </div>
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
