/**
 * Dependency rule of the front monorepo (clean-architecture skill, ADR 0002):
 * apps/* -> api-client, core, ui-tokens ; api-client -> core ; core/application -> core/domain ;
 * core/presentation (labels shared by the apps) -> core/domain ; core/domain -> nothing.
 * Inside core and api-client, the bounded contexts (catalog, contribution, identity) only share
 * domain/shared-kernel (ADR 0015) and domain/common.
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies make the layers impossible to reason about.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'core-domain-is-pure',
      severity: 'error',
      comment: 'The client domain depends on nothing: no framework, no adapter, no other layer, no npm package.',
      from: { path: '^packages/core/src/domain' },
      to: {
        pathNot: ['^packages/core/src/domain'],
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'core-domain-no-npm',
      severity: 'error',
      from: { path: '^packages/core/src/domain' },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-no-pkg', 'npm-unknown'] },
    },
    {
      name: 'core-application-only-domain',
      severity: 'error',
      comment: 'Use cases only depend on the client domain (and on the ports they declare).',
      from: { path: '^packages/core/src/application' },
      to: {
        pathNot: ['^packages/core/src/(application|domain)'],
      },
    },
    {
      name: 'core-presentation-only-domain',
      severity: 'error',
      comment:
        'Labels shared by the apps (presentation) read the client domain only: no use case, no framework, no npm package.',
      from: { path: '^packages/core/src/presentation' },
      to: {
        pathNot: ['^packages/core/src/(presentation|domain)'],
      },
    },
    {
      name: 'bounded-contexts-isolated',
      severity: 'error',
      comment:
        'Catalog, Contribution and Identity do not import each other (in each layer of core, and in api-client): ' +
        'only the shared kernel (ADR 0015) and common are shared. A need across contexts goes through the apps.',
      from: { path: '^packages/(?:core/src/[a-z]+|api-client/src)/(catalog|contribution|identity)/' },
      to: {
        path: '^packages/(?:core/src/[a-z]+|api-client/src)/(?:catalog|contribution|identity)/',
        pathNot: '^packages/(?:core/src/[a-z]+|api-client/src)/$1/',
      },
    },
    {
      name: 'api-client-not-apps',
      severity: 'error',
      comment: 'The API client is an adapter: it implements the ports of core and never knows the apps or UI frameworks.',
      from: { path: '^packages/api-client' },
      to: { path: ['^apps/', '^packages/ui-tokens', 'node_modules/(react|react-native|expo[^/]*)/'] },
    },
    {
      name: 'packages-not-apps',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'apps-not-http-dtos',
      severity: 'error',
      comment:
        'HTTP DTOs (generated OpenAPI schema) stay in api-client: app code works with core types. Only e2e fixtures may use them.',
      from: { path: '^apps/[^/]+/src/' },
      to: { path: '^packages/api-client/src/generated/' },
    },
    {
      name: 'apps-not-cross-import',
      severity: 'error',
      comment: 'The web and mobile apps share code through packages/*, never directly.',
      from: { path: '^apps/([^/]+)/' },
      to: { path: '^apps/', pathNot: '^apps/$1/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(node_modules|dist|coverage|[.]expo|[.]features-gen|playwright-report|test-results)' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types'],
    },
  },
};
