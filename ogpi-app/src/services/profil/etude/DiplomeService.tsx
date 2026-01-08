import { AbstractCrudService } from "../../profil/poste/util/AbstractCrudService.tsx";
import { Diplome } from "../../../types/profil/etude/Diplome";
import { AxiosInstance } from "axios";

export class DiplomeService extends AbstractCrudService<Diplome> {
  constructor(api: AxiosInstance) {
    super(api, "/diplomes");
  }
}
