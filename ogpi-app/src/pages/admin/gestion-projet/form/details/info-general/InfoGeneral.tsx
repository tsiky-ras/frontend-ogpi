import React from "react";
import { Projet } from "../../../../../../types/projet/Projet.tsx";
import "./InfoGeneral.css";

type TechnoItem = {
  techno?: { idTechno?: number; id?: number; nomTechno?: string };
  nomTechno?: string;
  idTechno?: number;
  id?: number;
};

type InfoGeneralProps = {
  projet: Projet;
  technos?: TechnoItem[];
};

const resolveTechnoName = (t: TechnoItem): string | undefined => {
  if (t.techno?.nomTechno) return t.techno.nomTechno; // forme Java : { techno: { nomTechno } }
  if (t.nomTechno)         return t.nomTechno;         // forme plate : { nomTechno }
  return undefined;
};

const InfoGeneral: React.FC<InfoGeneralProps> = ({ projet, technos }) => {
  const technoList = (technos ?? [])
    .map(resolveTechnoName)
    .filter((name): name is string => !!name);

  return (
    <div className="info-general-grid">
      <div className="info-item">
        <label>Nom du projet</label>
        <p>{projet.nomProjet || "-"}</p>
      </div>

      <div className="info-item">
        <label>Date d'attribution</label>
        <p>{projet.dateAttribution ? new Date(projet.dateAttribution).toLocaleDateString("fr-FR") : "-"}</p>
      </div>

      <div className="info-item">
        <label>Date de début prévu</label>
        <p>{projet.dateDebutPrevu ? new Date(projet.dateDebutPrevu).toLocaleDateString("fr-FR") : "-"}</p>
      </div>

      <div className="info-item">
        <label>Date de fin prévu</label>
        <p>{projet.dateFinPrevu ? new Date(projet.dateFinPrevu).toLocaleDateString("fr-FR") : "-"}</p>
      </div>

      <div className="info-item">
        <label>Réf BC</label>
        <p>{projet.refBC || "-"}</p>
      </div>

      <div className="info-item">
        <label>Réf Compte</label>
        <p>{projet.refCompte || "-"}</p>
      </div>

      <div className="info-item">
        <label>Chef de projet</label>
        <p>{projet.userCp?.username || "-"}</p>
      </div>

      <div className="info-item">
        <label>Suppléant(e)</label>
        <p>{projet.userSuppleante?.username || "-"}</p>
      </div>

      <div className="info-item">
        <label>Type de facturation</label>
        <p>{projet.typeFacturation?.nomTypeFacturation || "-"}</p>
      </div>

      {/* Technologies — uniquement pour les projets sans lead */}
      {!projet.lead?.leadId && (
        <div className="info-item">
          <label>Technologies</label>
          {technoList.length > 0 ? (
            <div className="d-flex flex-wrap gap-1 mt-1">
              {technoList.map((name, i) => (
                <span
                  key={i}
                  className="badge bg-secondary"
                  style={{ fontSize: "0.8rem", fontWeight: 400 }}
                >
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p>-</p>
          )}
        </div>
      )}

      <div className="info-item">
        <label>Description</label>
        <p>{projet.description || "-"}</p>
      </div>
    </div>
  );
};

export default InfoGeneral;