declare module '*.jpg';
declare module '*.jpeg';
declare module '*.png';
declare module '*.gif';
declare module '*.svg';

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			REACT_APP_API_URL?: string;
			[key: string]: string | undefined;
		}
	}
}

declare var process: {
	env: NodeJS.ProcessEnv;
};

export {};
