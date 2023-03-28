import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  verbose: true,
  preset: 'ts-jest',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results/jest',
        outputName: 'results.xml',
      },
    ],
  ],
};

export default config;
