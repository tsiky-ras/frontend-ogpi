import { useAuth } from "../../../context/AuthContext.tsx";
import { ChiffresBacklog } from "../../../types/lead/tech-fin/LeadTechFin.tsx";

export const useBacklogChiffresService = () => {
  const { api } = useAuth();

  const base = "/backlog/chiffres";

  /**
   * Récupérer les chiffres du backlog pour un lead
   */
  const getByLeadId = async (
    leadId: number
  ): Promise<ChiffresBacklog[]> => {
    const res = await api.get(`${base}/lead/${leadId}`);
    return res.data;
  };

  return {
    getByLeadId,
  };
};
