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
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../../src'),
      '@components': path.resolve(__dirname, '../../../src/components'),
      '@hooks': path.resolve(__dirname, '../../../src/hooks'),
      '@services': path.resolve(__dirname, '../../../src/services'),
      '@types': path.resolve(__dirname, '../../../src/types'),
      '@utils': path.resolve(__dirname, '../../../src/utils'),
      '@config': path.resolve(__dirname, '../../../src/config'),
    },
  },
  
  test: {
    // ============================================================================
    // GLOBAL CONFIGURATION
    // ============================================================================
    
    name: 'ChronoCoder',
    
    // Test directory
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
    
    // Root directory
    root: path.resolve(__dirname, '../../..'),
    
    // Global setup file
    globalSetup: './global-setup.ts',
    
    // Setup files before each test suite
    setupFiles: ['./setup.ts'],
    
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
      
      // Per-test threshold (for critical paths)
      perTestThreshold: {
        // Critical test suites require 100% coverage
        'critical-paths': 100,
      },
      
      // Watermark settings
      watermarks: {
        lines: [50, 80, 95],
        functions: [50, 80, 95],
        branches: [50, 80, 95],
        statements: [50, 80, 95],
      },
      
      // Extension patterns
      extension: ['.ts', '.tsx', '.mts'],
      
      // Exclude coverage from certain reports
      reportOnFailure: false,
      
      // Allow failing tests with low coverage
      allowUncovered: false,
      
      // Check coverage warnings
      checkWarnings: false,
    },
    
    // ============================================================================
    // SNAPSHOT CONFIGURATION
    // ============================================================================
    
    snapshotFormat: {
      escapeString: false,
      printBasicPrototype: false,
    },
    
    expandSnapshotDiff: true,
    
    // Update snapshots automatically during CI (if explicitly enabled)
    updateSnapshot: 'new',
    
    // Snapshot directory
    snapshotEnvironment: 'node',
    
    // ============================================================================
    // PARALLELIZATION & CONCURRENCY
    // ============================================================================
    
    // Number of parallel test workers
    threads: true,
    
    // Maximum number of test workers
    maxThreads: 4,
    minThreads: 2,
    
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
    
    // Fail fast on first failure
    failFast: false,
    
    // ============================================================================
    // SCREENSHOT & DEBUG CAPTURES
    // ============================================================================
    
    // Capture screenshots on failures
    screenshotFailures: true,
    
    // Screenshot directory
    screenshotDirectory: './screenshots',
    
    // Keep screenshots after tests
    keepScreenshots: false,
    
    // Debug mode
    silent: false,
    
    // Log heap usage for memory leak detection
    logHeapUsage: false,
    
    // Change console output
    onChange: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['node_modules/**'],
    },
    
    // Watch excluded patterns
    watchExclude: ['node_modules/**', 'dist/**'],
    
    // ============================================================================
    // MOCKING CONFIGURATION
    // ============================================================================
    
    // Auto-mock external dependencies
    mock: [
      // Pattern-based mocking
      {
        pattern: '**/*.stories.{ts,tsx}',
        mode: 'path',
      },
    ],
    
    // Unmock some modules
    unstubified: [],
    
    // ===========================================================================
    // REPORTERS
    // ===========================================================================
    
    reporters: [
      // Console output
      ['default', {
        summary: true,
      }],
      // JUnit XML for CI/CD
      ['jest', {
        outputFile: './reports/test-results.xml',
      }],
      // HTML coverage report
      ['json', {
        outputFile: './reports/vitest-results.json',
      }],
    ],
    
    // Reporter output
    outputFile: {
      html: './reports/html-report/index.html',
      json: './reports/vitest-results.json',
      junit: './reports/test-results.xml',
    },
    
    // ============================================================================
    // CUSTOM MATCHERS
    // ===========================================================================
    
    // Extended expect assertions
    extend: true,
    
    // Timing information
    timing: false,
    
    // Heap profiling
    profiler: false,
    
    // Code coverage thresholds warning
    allowOnly: false,
    
    // Isolate each test file
    isolate: true,
    
    // ============================================================================
    // EXPLICIT IMPORT REQUIREMENT
    // ===========================================================================
    
    // Don't import globals automatically
    globals: true,
    
    // Imports
    imports: {
      exclude: [],
      include: [],
    },
    
    // ============================================================================
    // INTERCEPTOR CONFIGURATION (Network requests)
    // ===========================================================================
    
    interceptor: {
      mode: 'auto',
      record: {
        dir: './__recordings__',
        headers: true,
      },
      host: 'localhost:3000',
    },
    
    // ===========================================================================
    // ENVIRONMENT SETUP
    // ===========================================================================
    
    passWithNoTests: false,
    
    // Tests that should be skipped
    skip: false,
    
    // Tests to run
    grep: undefined,
    
    // Run only tests matching pattern
    bail: 0,
    
    // Display total time
    hideSkippedTests: false,
    
    // Enable API coverage
    apiCoverage: false,
    
    // Re-run all tests when changed
    related: false,
    
    // Use provided Vite config
    vite: {
      mode: 'test',
      test: {
        // Inherits from this config
      },
    },
  },
});
