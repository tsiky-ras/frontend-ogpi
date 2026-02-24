import React from "react";
import { Projet } from "../../../../../../types/projet/Projet.tsx";
import "./InfoGeneral.css";

type InfoGeneralProps = {
  projet: Projet;
};

const InfoGeneral: React.FC<InfoGeneralProps> = ({ projet }) => {
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

      <div className="info-item">
        <label>Description</label>
        <p>{projet.description || "-"}</p>
      </div>
    </div>
  );
};

export default InfoGeneral;