import React from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { BusinessUnit } from "../../../../types/profil/poste/BusinessUnit.tsx";

const BusinessUnitPage: React.FC = () => {
  return (
    <ConfigEntityPage<BusinessUnit>
      title="Gestion des Business Units"
      entityLabel="name"
      entityName="Business Unit"
      initialData={[]}
    />
  );
};

export default BusinessUnitPage;
