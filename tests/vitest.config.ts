/**
 * Vitest Configuration for ChronoCoder v3 Testing
 * 
 * This configuration sets up:
 * - Test environment
 * - Coverage thresholds
 * - Snapshot handling
 * - Parallelization settings
 * - Custom matchers
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
  
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: /^react$/, replacement: path.resolve(__dirname, './node_modules/react') },
      { find: /^react\/(.*)$/, replacement: path.resolve(__dirname, './node_modules/react/$1') },
      { find: /^react-dom$/, replacement: path.resolve(__dirname, './node_modules/react-dom') },
      { find: /^react-dom\/(.*)$/, replacement: path.resolve(__dirname, './node_modules/react-dom/$1') },
      { find: '@', replacement: path.resolve(__dirname, '../src') },
      { find: '@components', replacement: path.resolve(__dirname, '../src/components') },
      { find: '@hooks', replacement: path.resolve(__dirname, '../src/hooks') },
      { find: '@services', replacement: path.resolve(__dirname, '../src/services') },
      { find: '@types', replacement: path.resolve(__dirname, '../src/types') },
      { find: '@utils', replacement: path.resolve(__dirname, '../src/utils') },
      { find: '@config', replacement: path.resolve(__dirname, '../src/config') },
      // Pin Monaco to the test-suite copy so component imports and test mocks
      // resolve to a single module instance (avoids dual-React invalid hooks).
      { find: /^@monaco-editor\/react$/, replacement: path.resolve(__dirname, './node_modules/@monaco-editor/react') },
      { find: /^monaco-editor$/, replacement: path.resolve(__dirname, './node_modules/monaco-editor') },
      { find: /^lucide-react$/, replacement: path.resolve(__dirname, './node_modules/lucide-react') },
      { find: /^react-markdown$/, replacement: path.resolve(__dirname, './node_modules/react-markdown') },
      { find: /^remark-gfm$/, replacement: path.resolve(__dirname, './node_modules/remark-gfm') },
    ],
  },
  
  test: {
    // ============================================================================
    // GLOBAL CONFIGURATION
    // ============================================================================
    
    name: 'ChronoCoder',
    
    server: {
      deps: {
        inline: ['framer-motion', '@testing-library/react'],
      },
    },
    
    // Test directory
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
    
    // Root directory
    root: path.resolve(__dirname, '..'),
    
    // Global setup file
    // globalSetup: './global-setup.ts',
    
    // Setup files before each test suite
    setupFiles: [path.resolve(__dirname, './setup.ts')],
    
    // Environment
    environment: 'jsdom',
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Restore mocks after each test
    restoreMocks: true,
    
    // Mock modules
    mockReset: true,
    
    // ============================================================================
    // COVERAGE CONFIGURATION
    // ============================================================================
    
    coverage: {
      provider: 'v8',
      
      // Report directory
      reporter: [
        ['text', { 
          // Increase precision
          precision: 2,
        }],
        ['text-summary', {}],
        ['html', { 
          subdir: 'report-html',
          // Include icon generation
          includeIconFiles: true,
          // Generate breakpoints in summary
          breakpoints: true,
        }],
        ['json', { 
          file: 'coverage.json',
        }],
        ['json-summary', { 
          file: 'coverage-summary.json',
        }],
      ],
      
      // Source directories to analyze
      include: ['src/**/*.{ts,tsx}'],
      
      // Directories to exclude
      exclude: [
        'src/components/*.stories.tsx',
        'src/**/*.d.ts',
        'src/**/__mocks__/**',
        'src/**/(test|spec)/**',
        'src/vite-env.d.ts',
      ],
      
      // Threshold requirements (enforcement)
      thresholds: {
        // Line coverage must be at least 80%
        lines: 80,
        
        // Function coverage must be at least 85%
        functions: 85,
        
        // Branch coverage must be at least 75%
        branches: 75,
        
        // Statements coverage
        statements: 80,
      },
      
      // Watermark settings
      watermarks: {
        lines: [50, 80],
        functions: [50, 80],
        branches: [50, 80],
        statements: [50, 80],
      },
      
      // Extension patterns
      extension: ['.ts', '.tsx', '.mts'],
      
      // Exclude coverage from certain reports
      reportOnFailure: false,
    },
    
    // ============================================================================
    // SNAPSHOT CONFIGURATION
    // ============================================================================
    
    snapshotFormat: {
      escapeString: false,
      printBasicPrototype: false,
    },
    
    expandSnapshotDiff: true,
    
    // ============================================================================
    // PARALLELIZATION & CONCURRENCY
    // ============================================================================
    
    // Pool type for running tests
    pool: 'threads',
    
    // Pool options
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        minThreads: 2,
        maxThreads: 4,
      },
      forks: {
        singleFork: true,
        isolate: true,
      },
      childProcess: {
        isolation: true,
        isolate: true,
      },
    },
    
    // Sequential execution for specific tests
    sequence: {
      concurrent: true,
      seed: 0,
    },
    
    // ============================================================================
    // TIMEOUTS & RETRIES
    // ============================================================================
    
    // Default timeout for each test
    testTimeout: 10000, // 10 seconds
    
    // Retry failed tests
    retry: 2,
    
    globals: true,
    passWithNoTests: true,
    bail: 0,
  },
});
