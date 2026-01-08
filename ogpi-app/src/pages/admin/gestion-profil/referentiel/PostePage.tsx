import React from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { Poste } from "../../../../types/profil/poste/Poste.tsx";
import { PosteService } from "../../../../services/profil/poste/PosteService.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";

const PostePage: React.FC = () => {
  const { api } = useAuth();
  const posteService = new PosteService(api);

  return (
    <ConfigEntityPage<Poste>
      title="Gestion des Postes"
      entityLabel="label"
      entityName="Poste"
      service={posteService}
    />
  );
};

export default PostePage;
