import React from "react";
import ConfigEntityPage from "../../gestion-profil/referentiel/ConfigEntityPage.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { LeadCategory } from "../../../../types/lead/LeadCategory.tsx";
import { LeadCategoryService } from "../../../../services/lead/LeadCategoryService.tsx";

const LeadCategoryPage: React.FC = () => {
  const { api } = useAuth();
  const leadCategoryService = new LeadCategoryService(api);

  return (
    <ConfigEntityPage<LeadCategory>
      title="Gestion des catégories d'opportunités"
      entityLabel="label"     
      entityName="Catégorie d'opportunité"
      service={leadCategoryService}
    />
  );
};

export default LeadCategoryPage;
