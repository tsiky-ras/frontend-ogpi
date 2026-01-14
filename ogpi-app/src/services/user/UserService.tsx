import { useAuth } from "../../context/AuthContext.tsx";
import { User } from "../../types/user/User.tsx";

export const useUserService = () => {
  const { api } = useAuth();

  const base = "/users";

  // ---------------- GET ALL USERS ----------------
  const getAll = async (): Promise<User[]> => {
    const res = await api.get(`${base}/all`);
    return res.data;
  };

  // ---------------- GET USER BY ID ----------------
  const getById = async (id: number): Promise<User> => {
    const res = await api.get(`${base}/${id}`);
    return res.data;
  };

  // ---------------- GET USER BY USERNAME ----------------
  const getByUsername = async (username: string): Promise<User> => {
    const res = await api.get(`${base}/username/${username}`);
    return res.data;
  };

  // ---------------- GET USER BY EMAIL ----------------
  const getByEmail = async (email: string): Promise<User> => {
    const res = await api.get(`${base}/email/${email}`);
    return res.data;
  };

  // ---------------- CREATE USER ----------------
  const createUser = async (userPayload: {
    username: string;
    email: string;
    password: string;
    profilId: number;
    role: { roleId: number };
  }): Promise<number> => {
    const res = await api.post("/users/create", userPayload);
    return res.data;
  };

  // ---------------- UPDATE USER ----------------
  const update = async (user: User): Promise<User> => {
    const res = await api.put(`${base}/update/${user.userId}`, user);
    return res.data;
  };

  // ---------------- DELETE USER ----------------
  const remove = async (userId: number): Promise<void> => {
    await api.delete(`${base}/delete/${userId}`);
  };

  return {
    getAll,
    getById,
    getByUsername,
    getByEmail,
    createUser,
    update,
    remove,
  };
};
