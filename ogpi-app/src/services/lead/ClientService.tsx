import { AxiosInstance } from "axios";
import { Client } from "../../types/lead/Client.tsx";
import { AbstractCrudService } from "../../services/profil/poste/util/AbstractCrudService.tsx";

export class ClientService extends AbstractCrudService<Client> {
  constructor(api: AxiosInstance) {
    super(api, "/clients");
  }
}
