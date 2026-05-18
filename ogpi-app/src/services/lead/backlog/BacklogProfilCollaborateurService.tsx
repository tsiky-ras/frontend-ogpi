// services/lead/backlog/BacklogProfilCollaborateurService.tsx

export class BacklogProfilCollaborateurService {
    private api: any;
  
    constructor(api: any) {
      this.api = api;
    }
  
    /**
     * Remplace (ou affecte) le collaborateur d'un BacklogProfil.
     * PUT /api/projet/backlog-profils/{id}/collaborateurs/{idProfil}
     * @param backlogProfilId  - l'id du BacklogProfil
     * @param collaborateurId  - l'id du Profil (collaborateur) à affecter
     */
    async replaceCollaborateur(backlogProfilId: number, collaborateurId: number): Promise<void> {
      await this.api.put(
        `/projet/backlog-profils/${backlogProfilId}/collaborateurs/${collaborateurId}`
      );
    }
  }