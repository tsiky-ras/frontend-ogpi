import { AbstractCrudService } from "../../profil/poste/util/AbstractCrudService.tsx";
import { AxiosInstance } from "axios";
import { Certification } from "../../../types/profil/certification/Certification.tsx";

export class CertificationService extends AbstractCrudService<Certification> {
  constructor(api: AxiosInstance) {
    super(api, "/certifications");
  }
}
