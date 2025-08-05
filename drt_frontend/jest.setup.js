/**
 * Jest setup file for DRT Frontend tests
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock Next.js image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />;
  },
}));

// Global test utilities
global.testUtils = {
  // Helper to create mock OCA metadata
  createMockOCAMetadata: () => ({
    oca_bundle: {
      bundle: {
        capture_base: { d: 'test-bundle' },
        overlays: {}
      },
      dependencies: []
    },
    extensions: {
      form: []
    }
  }),
  
  // Helper to create mock field
  createMockField: (id = 'test-field') => ({
    id,
    labels: { eng: { [id]: 'Test Field' } },
    options: { eng: { [id]: [] } },
    optionLabels: { eng: { [id]: {} } },
    type: 'textarea',
    validation: {
      conformance: undefined,
      entryCodes: undefined,
      characterEncoding: undefined,
      format: undefined,
      cardinality: undefined,
    },
  }),
}; 