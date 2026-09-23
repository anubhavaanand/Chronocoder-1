/**
 * Lighthouse Performance Configuration for ChronoCoder v3
 * 
 * This configuration defines:
 * - Comprehensive audit settings for performance analysis
 * - Accessibility check configurations
 * - Best practices validation
 * - SEO optimization checks
 * - Progressive Web App verification
 */

module.exports = {
  // ============================================================================
  // GENERAL CONFIGURATION
  // ============================================================================
  
  output: 'html', // Output format: 'html', 'json', 'csv'
  outputPath: './reports/lighthouse/',
  channel: 'cli', // Audit channel
  
  // Enable specific categories
  onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
  
  // Disable specific audits (comment out to enable)
  onlyAudits: [],
  
  // Budget configuration
  budgets: [
    {
      name: 'home-page-budget',
      path: '/',
      resourceSizes: {
        html: 15000,
        javascript: 200000,
        css: 20000,
        image: 300000,
        total: 800000,
      },
    },
    {
      name: 'mentor-detail-budget',
      path: '/mentors/*',
      resourceSizes: {
        html: 25000,
        javascript: 250000,
        css: 30000,
        image: 400000,
        total: 1000000,
      },
    },
    {
      name: 'api-endpoint-budget',
      path: '/api/v1/*',
      responseSize: 50000,
      transferSize: 40000,
    },
  ],
  
  // ============================================================================
  // PERFORMANCE AUDITS
  // ============================================================================
  
  performance: {
    disableStorageReset: false,
    formFactor: 'desktop', // 'mobile' or 'desktop'
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1, // 1 = no throttling, 4 = slow 4x
    },
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      disabled: false,
    },
  },
  
  performanceMetrics: [
    // Core Web Vitals
    'first-contentful-paint',
    'largest-contentful-paint',
    'cumulative-layout-shift',
    'first-input-delay',
    
    // Additional metrics
    'speed-index',
    'total-blocking-time',
    'time-to-interactive',
    'server-response-time',
    'max-potential-fid',
    'interaction-to-next-paint',
    'long-tasks',
    
    // Resource metrics
    'total-byte-weight',
    'request-count',
    'dom-size',
    'main-thread-work',
    'bootup-time',
    
    // Cache and storage
    'uses-responsive-images',
    'uses-optimized-images',
    'uses-text-compression',
    'offscreen-images',
    'unminified-javascript',
    'unminified-css',
    'unused-javascript',
    'unused-css-rules',
  ],
  
  // ============================================================================
  // ACCESSIBILITY CHECKS
  // ============================================================================
  
  accessibility: {
    audits: {
      'aria-allowed-attr': true,
      'aria-required-attr': true,
      'aria-required-children': true,
      'aria-required-parent': true,
      'aria-roles': true,
      'aria-valid-attr': true,
      'aria-valid-attr-value': true,
      'button-name': true,
      'bypass': true,
      'color-contrast': true,
      'document-title': true,
      'duplicate-id-active': true,
      'focus-traps': true,
      'form-field-multiple-labels': true,
      'heading-order': true,
      'html-has-lang': true,
      'html-lang-valid': true,
      'image-alt': true,
      'input-button-name': true,
      'label': true,
      'link-name': true,
      'list': true,
      'listitem': true,
      'meta-viewport': true,
      'object-alt': true,
      'tabindex': true,
      'td-headers-attr': true,
      'th-has-data-cells': true,
      'valid-lang': true,
      'video-caption': true,
      
      // Custom accessibility requirements
      custom: [
        {
          id: 'keyboard-navigation',
          title: 'All interactive elements are keyboard accessible',
          description: 'Tab navigation works throughout the application',
          score: 1,
        },
        {
          id: 'skip-links',
          title: 'Skip navigation links present',
          description: 'Assistive technology users can skip to main content',
          score: 1,
        },
        {
          id: 'focus-indicators',
          title: 'Clear focus indicators',
          description: 'Focused elements have visible outlines',
          score: 1,
        },
      ],
    },
    
    disabledAuditIds: [],
    
    // Screen reader settings
    screenReader: {
      enabled: true,
      mode: 'native', // 'native' or 'chromevox'
    },
    
    // WCAG version
    wcagVersion: '2.1', // '2.0', '2.1', '2.2'
    
    // Level requirement
    level: 'AA', // 'A', 'AA', 'AAA'
  },
  
  // ============================================================================
  // BEST PRACTICES AUDITS
  // ============================================================================
  
  bestPractices: {
    audits: {
      'uses-http2': true,
      'uses-passive-event-listeners': true,
      'no-document-write': true,
      'external-anchors-use-rel-noopener': true,
      'geolocation-on-start': true,
      'doctype': true,
      'no-vulnerable-libraries': true,
      'js-libraries': true,
      'notification-on-start': true,
      'deprecations': true,
      'errors-in-console': true,
      'image-aspect-ratio': true,
      'image-size-responsive': true,
      'preload-fonts': true,
      'user-interaction-before-autoplay': true,
      
      // Security best practices
      'https': true,
      'csp-xss': true,
      'mixed-content': true,
      
      // Modern web standards
      'insights': true,
    },
  },
  
  // ============================================================================
  // SEO AUDITS
  // ============================================================================
  
  seo: {
    audits: {
      'document-title': true,
      'meta-description': true,
      'http-status-code': true,
      'link-text': true,
      'crawlable-anchors': true,
      'canonical': true,
      'robots-txt': true,
      'hreflang': true,
      'preconnect-known-origins': true,
      'font-size': true,
      'tap-targets': true,
      'viewport': true,
      'plugins': true,
      'charset': true,
      'structured-data': true,
      
      // Content quality
      'meta-viewport': true,
      'is-crawlable': true,
      'tappable-buttons': true,
    },
  },
  
  // ============================================================================
  // PROGRESSIVE WEB APP AUDITS
  // ============================================================================
  
  pwa: {
    audits: {
      'installable-manifest': true,
      'service-worker': true,
      'works-offline': true,
      'splash-screen': true,
      'themed-omnibox': true,
      'content-scaled-appropriately': true,
      'maskable-icon': true,
      'offline-capability': true,
      'cross-origin-isolated': true,
    },
    
    // PWA criteria
    groupMode: 'required',
    
    // Minimum PWA features
    minScore: 0.8,
  },
  
  // ============================================================================
  // CUSTOM SCORES & THRESHOLDS
  // ============================================================================
  
  thresholds: {
    // Required minimum scores
    performance: {
      min: 90, // Must achieve at least 90
      target: 95,
    },
    
    accessibility: {
      min: 100,
      target: 100,
    },
    
    bestPractices: {
      min: 95,
      target: 100,
    },
    
    seo: {
      min: 90,
      target: 100,
    },
    
    pwa: {
      min: 80,
      target: 100,
    },
  },
  
  // ============================================================================
  // CI/CD INTEGRATION
  // ============================================================================
  
  ci: {
    collect: {
      startServerCommand: 'npm run serve',
      startServerReadyMatch: /ready/i,
      pauseAfterLoadMs: 2000,
      url: ['http://localhost:3000'],
      settings: {
        disableCache: false,
        clearCookies: true,
        screenEmulation: {
          disabled: false,
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
          mobile: false,
        },
      },
    },
    
    uploadResults: {
      storeResults: false,
      storageName: 'chronocoder-lighthouse-results',
    },
    
    failOnRatings: ['F', 'D'], // Fail if any rating is F or D
    failOnFatalErrors: true,
  },
  
  // ============================================================================
  // PERFORMANCE BUDGET ENFORCEMENT
  // ============================================================================
  
  performanceBudget: {
    metric: 'firstContentfulPaint',
    budget: 1500, // ms
    maxSuggestion: {
      metric: 'largestContentfulPaint',
      budget: 2500,
    },
  },
  
  requestBreakdown: {
    static: {
      script: 600000,
      stylesheet: 100000,
      image: 800000,
      font: 200000,
      document: 25000,
      other: 50000,
    },
    dynamic: {
      fetch: 300000,
      xhr: 100000,
    },
  },
  
  // ============================================================================
  // LOADING STATES CONFIGURATION
  // ============================================================================
  
  loadingStrategy: {
    lazyLoading: true,
    criticalResources: [
      'fonts',
      'css/critical',
      'images/above-fold',
      'javascript/runtime',
      'javascript/main',
    ],
    preloadLinks: [
      '/fonts/chronocoder.woff2',
      '/styles/global.css',
      '/scripts/app.js',
    ],
  },
  
  // ============================================================================
  // ANALYTICS INTEGRATION
  // ============================================================================
  
  analytics: {
    integration: true,
    properties: [
      'userTiming',
      'navigationTiming',
      'resourceTiming',
      'paintTiming',
      'longTaskTiming',
    ],
    sendToGTM: false,
  },
  
  // ============================================================================
  // REPORTING SETTINGS
  // ============================================================================
  
  reporting: {
    theme: 'dark',
    reportGenerator: 'lighthouse',
    charts: {
      enabled: true,
      waterfall: true,
      treemap: true,
    },
    screenshots: true,
    snapshots: false,
    video: false,
    artifacts: false,
  },
  
  // ============================================================================
  // ADDITIONAL OPTIONS
  // ============================================================================
  
  additionalOptions: {
    // Chrome flags
    chromeFlags: [
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=swiftshader',
      '--deterministic-mode',
    ],
    
    // Local server options
    localServerOptions: {
      port: 3000,
      host: 'localhost',
    },
    
    // Override environment variables
    overrideEnvironmentVariables: {
      NODE_ENV: 'test',
      CHRONOCODER_TEST_MODE: 'true',
    },
  },
};

// ============================================================================
// EXPORT DEFAULT FOR CLI USAGE
// ============================================================================

module.exports.default = module.exports;
