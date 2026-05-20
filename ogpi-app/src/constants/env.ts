type EnvVars = {
    API_URL: string;
};

export const ENV: EnvVars = {
    API_URL: process.env.REACT_APP_API_URL ?? "http://localhost:8080/api",
};