import { AbstractCrudService } from "../../profil/poste/util/AbstractCrudService.tsx";
import { AxiosInstance } from "axios";
import { Organisme } from "../../../types/profil/certification/Organisme.tsx";

export class OrganismeService extends AbstractCrudService<Organisme> {
  constructor(api: AxiosInstance) {
    super(api, "/organismes");
  }
}
