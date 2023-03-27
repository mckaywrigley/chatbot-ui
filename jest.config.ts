import type { Config } from 'jest';

const config: Config = {
    testEnvironment: 'jest-environment-jsdom',
    verbose: true,
    preset: 'ts-jest',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
};

export default config;