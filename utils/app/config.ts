// function isBrowser(): boolean {
//     return typeof window !== 'undefined'
// }

function isBrowser() {
    return Boolean(typeof window !== "undefined" && window.__env );
  }

const config: {
    public: PublicConfig,
    serverOnly: ServerConfig
} = {
    public: {} as any,
    serverOnly: {} as any,
};

const publicPrefix = 'NEXT_PUBLIC_';
const serverOnlyPrefix = 'SERVER_ONLY_';
  
function convertBoolean(value: any): any {
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    return value;
}

const sortKeys = (obj: any) => {
    return Object.keys(obj)
        .sort()
        .reduce((acc, key) => {
            acc[key] = obj[key];
            return acc;
        }, {} as any);
};

if (isBrowser()) {
    console.log('execute in browser config')
    Object.entries(window.__env).forEach(([key, value]) => {
        config.public[key] = convertBoolean(value);
    });
    // we need to make sure keys are always in the same order to prevent "Text content did not match" issue 
    // when displaying config on a page
    config.public = sortKeys(config.public);
    console.log(JSON.stringify(config))
} else {
    console.log('execute in server config')
    Object.entries(process.env).forEach(([key, value]) => {
        if (key.startsWith(publicPrefix)) {
            config.public[key.replace(publicPrefix, '')] = convertBoolean(value);
        }
        if (key.startsWith(serverOnlyPrefix)) {
            config.serverOnly[key.replace(serverOnlyPrefix, '')] = convertBoolean(value);
        }
    });
    console.log(JSON.stringify(config))
    // we need to make sure keys are always in the same order to prevent "Text content did not match" issue 
    // when displaying config on a page
    config.public = sortKeys(config.public);
}
config.public.DEFAULT_TEMPERATURE = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || "1")
declare global {
    interface Window {
        __env: any; 
    }
}

interface PublicConfig {
    BASEPATH: string,
    OPENAI_API_HOST: string,
    OPENAI_API_PREFIX: string,
    DEFAULT_SYSTEM_PROMPT: string,
    DEFAULT_TEMPERATURE: number,
    [key: string]: any
}
interface ServerConfig {
    BASEPATH: string,
    OPENAI_API_HOST: string,
    OPENAI_API_PREFIX: string,
    OPENAI_API_KEY: string,
    DEFAULT_MODEL: string,
    GOOGLE_API_KEY: string,
    GOOGLE_CSE_ID: string,
    [key: string]: any
}

export function env(key = '') {
    console.log('get env', key)
    if (!key.length) {
        throw new Error('No env key provided');
    }

    if (isBrowser()) {
        console.log('get env value from __env', window.__env[key])
        return window.__env[key];
    }

    console.log('get env from procee', process.env[key])
    return process.env[key];
}
export default config;