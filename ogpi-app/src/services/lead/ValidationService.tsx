import { useAuth } from "../../context/AuthContext.tsx";
import { Validation } from "../../types/lead/Validation.tsx";

export const useValidationService = () => {
  const { api } = useAuth();

  const base = "/leads";

  /**
   * Créer une validation pour un lead
   */
  const create = async (
    leadId: number,
    validation: Validation
  ): Promise<Validation> => {
    const res = await api.post(
      `${base}/${leadId}/validations`,
      validation
    );
    return res.data;
  };

  /**
   * Vérifier si un lead est GO
   */
  const isLeadGo = async (leadId: number): Promise<boolean> => {
    const res = await api.get(
      `${base}/${leadId}/validations/go`
    );
    return res.data;
  };

  return {
    create,
    isLeadGo,
  };
};
