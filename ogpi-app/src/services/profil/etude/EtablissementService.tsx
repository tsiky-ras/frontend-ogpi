import { AbstractCrudService } from "../../profil/poste/util/AbstractCrudService.tsx";
import { Etablissement } from "../../../types/profil/etude/Etablissement";
import { AxiosInstance } from "axios";

export class EtablissementService extends AbstractCrudService<Etablissement> {
  constructor(api: AxiosInstance) {
    super(api, "/etablissements");
  }
}
