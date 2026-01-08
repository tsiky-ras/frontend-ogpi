import { AbstractCrudService } from "../poste/util/AbstractCrudService.tsx";
import { Poste } from "../../types/profil/poste/Poste";
import { AxiosInstance } from "axios";

export class PosteService extends AbstractCrudService<Poste> {
  constructor(api: AxiosInstance) {
    super(api, "/postes");
  }
}
