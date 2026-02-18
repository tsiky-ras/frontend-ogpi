import { useAuth } from "../../../context/AuthContext.tsx";
import { TypeFacturation } from "../../../types/lead/tech-fin/LeadTechFin.tsx";

export const useTypeFacturationService = () => {
  const { api } = useAuth();

  const base = "/type-facturations";

  const getAll = async (): Promise<TypeFacturation[]> => {
    const res = await api.get(base);
    return res.data;
  };

  const getById = async (id: number): Promise<TypeFacturation> => {
    const res = await api.get(`${base}/${id}`);
    return res.data;
  };

  const create = async (
    typeFacturation: TypeFacturation
  ): Promise<TypeFacturation> => {
    const res = await api.post(base, typeFacturation);
    return res.data;
  };

  const update = async (
    typeFacturation: TypeFacturation
  ): Promise<TypeFacturation> => {
    const res = await api.put(
      `${base}/${typeFacturation.id}`,
      typeFacturation
    );
    return res.data;
  };

  const remove = async (id: number): Promise<void> => {
    await api.delete(`${base}/${id}`);
  };

  return {
    getAll,
    getById,
    create,
    update,
    remove,
  };
};
