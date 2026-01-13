import { useAuth } from "../../context/AuthContext.tsx";
import { Role } from "../../types/user/Role.tsx";

export const useRoleService = () => {
  const { api } = useAuth();

  const base = "/roles";

  // GET all roles
  const getAll = async (): Promise<Role[]> => {
    const res = await api.get(`${base}`);
    return res.data;
  };

  // GET role by ID
  const getById = async (id: number): Promise<Role> => {
    const res = await api.get(`${base}/${id}`);
    return res.data;
  };

  // CREATE role
  const create = async (role: Role): Promise<Role> => {
    const res = await api.post(`${base}`, role);
    return res.data;
  };

  // UPDATE role
  const update = async (role: Role): Promise<Role> => {
    const res = await api.put(`${base}/${role.roleId}`, role);
    return res.data;
  };

  // DELETE role
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
