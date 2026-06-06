import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '**/__tests__/lib/**/*.test.ts',
        '**/__tests__/api/**/*.test.ts',
        '**/__tests__/middleware/**/*.test.ts',
        '**/__tests__/security/**/*.test.ts',
      ],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            module: 'commonjs',
            moduleResolution: 'node',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      setupFilesAfterFramework: [],
      setupFiles: [],
      setupFilesAfterFramework2: [],
      globalSetup: undefined,
      globalTeardown: undefined,
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: [
        '**/__tests__/components/**/*.test.tsx',
        '**/__tests__/components/**/*.test.ts',
      ],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            module: 'commonjs',
            moduleResolution: 'node',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            jsx: 'react-jsx',
          },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__tests__/helpers/fileMock.ts',
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.dom.ts'],
    },
  ],
};

export default config;
