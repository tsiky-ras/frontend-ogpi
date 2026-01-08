import { AbstractCrudService } from "../../profil/poste/util/AbstractCrudService.tsx";
import { Filiere } from "../../../types/profil/etude/Filiere.tsx";
import { AxiosInstance } from "axios";

export class FiliereService extends AbstractCrudService<Filiere> {
  constructor(api: AxiosInstance) {
    super(api, "/filieres");
  }
}
