import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    ReactNode,
  } from 'react';
  import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
  import { jwtDecode } from 'jwt-decode';
  import { User } from '../types/User';
  import { ENV } from '../constants/env.ts';
    
  interface JwtPayload {
    sub: string;
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
    address: string;
    phoneNumber: string;
    role: string;
    perms: [];
    exp?: number;
    iat?: number;
    [key: string]: any;
  }

  interface AuthContextType {
    user: User | null;
    loading: boolean;
    register: (
      firstname: string,
      lastname: string,
      email: string,
      password: string
    ) => Promise<{ success: boolean; error?: string }>;
    login: (
      email: string,
      password: string
    ) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    api: AxiosInstance;
  }
  
  interface AuthProviderProps {
    children: ReactNode;
  }
  
  
  const AuthContext = createContext<AuthContextType | null>(null);
  
  export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    
    function setUserFromToken(token:string){
      const decoded: JwtPayload = jwtDecode(token);
      const object:User={
        id: decoded.userId,
        email: decoded.email,
        nom: decoded.lastName,
        prenom: decoded.firstName,
        telephone: decoded.phoneNumber,
        role: decoded.role,
        roleRank: decoded.roleRank,
        landingPage: decoded.landingPage,
        statut: "actif",
        username: decoded.sub,
        password: "",
      }
      setUser(object);
    }
    
    // Configure axios instance
    const api = axios.create({
      baseURL: ENV.API_URL,
    });
  
    api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  
    api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest: any = error.config;
  
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
  
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) throw new Error('No refresh token');
  
            const response: AxiosResponse<{
              accessToken: string;
              refreshToken: string;
            }> = await axios.post(ENV.API_URL+'/auth/refresh', {
              refreshToken,
            });
  
            const { accessToken, refreshToken: newRefreshToken } = response.data;
  
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
  
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          } catch (refreshError) {
            await logout();
            return Promise.reject(refreshError);
          }
        }
  
        return Promise.reject(error);
      }
    );
  
    useEffect(() => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          setUserFromToken(token);
        } catch (err) {
          console.error('Invalid token:', err);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    }, []);
    
    const register = async (
      firstname: string,
      lastname: string,
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await axios.post(ENV.API_URL+'/auth/register', {
          firstname,
          lastname,
          email,
          password,
        });
  
        const { accessToken, refreshToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
  
        setUserFromToken(accessToken);
  
        return { success: true };
      } catch (error: any) {
        return {
          success: false,
          error: error.response?.data?.message || 'Registration failed',
        };
      }
    };
  
    const login = async (
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await axios.post(ENV.API_URL+'/auth/login', {
          email,
          password,
        });
        
        const { accessToken, refreshToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
  
        setUserFromToken(accessToken);
  
        return { success: true };
      } catch (error: any) {
        return {
          success: false,
          error: error.response?.data?.message || 'Login failed',
        };
      }
    };
  
    const logout = async (): Promise<void> => {
      try {
        // const token = localStorage.getItem('accessToken');
        // if (token) {
        //   await axios.post(
        //     'http://localhost:8080/api/auth/logout',
        //     {},
        //     { headers: { Authorization: `Bearer ${token}` } }
        //   );
        // }
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
      }
    };
  
    // === Valeur du contexte === //
    const value: AuthContextType = {
      user,
      loading,
      register,
      login,
      logout,
      api,
    };
  
    return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    );
  };
    
  export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
  };
  