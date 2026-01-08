import React from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { BusinessUnit } from "../../../../types/profil/poste/BusinessUnit.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { BusinessUnitService } from "../../../../services/profil/poste/BusinessUnitService.tsx";

const BusinessUnitPage: React.FC = () => {
  const { api } = useAuth();
  const businessUnitService = new BusinessUnitService(api);
  return (
  
    <ConfigEntityPage<BusinessUnit>
      title="Gestion des Business Units"
      entityLabel="name"
      entityName="Business Unit"
      service={businessUnitService}
    />
  );
};

export default BusinessUnitPage;
