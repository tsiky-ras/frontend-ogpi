import React from "react";
import ConfigEntityPage from "../../gestion-profil/referentiel/ConfigEntityPage.tsx";
import { Client } from "../../../../types/lead/Client.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { ClientService } from "../../../../services/lead/ClientService.tsx";

const ClientPage: React.FC = () => {
  const { api } = useAuth();
  const clientService = new ClientService(api);

  return (
    <ConfigEntityPage<Client>
      title="Gestion des clients"
      entityLabel="name"     
      entityName="Client"
      service={clientService}
    />
  );
};

export default ClientPage;
