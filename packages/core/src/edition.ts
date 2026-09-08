// Community/Pro/Team/Enterprise boundary. Today only `community.*` is ever
// enabled — everything else is a defined type with no backing
// implementation, so the door is open without half-built paid features.

export type Feature =
  | 'community.inventory'
  | 'community.doctor'
  | 'community.scanner'
  | 'community.optimize.recommend'
  | 'pro.optimize.autoApply'
  | 'pro.history'
  | 'pro.sync'
  | 'pro.advancedConflicts'
  | 'pro.advancedContext'
  | 'pro.advancedRules'
  | 'team.sharedProfiles'
  | 'team.policies'
  | 'team.githubIntegration'
  | 'team.auditTrail'
  | 'enterprise.sso'
  | 'enterprise.rbac'
  | 'enterprise.fleet'
  | 'enterprise.privateDeployment';

const COMMUNITY_FEATURES: readonly Feature[] = [
  'community.inventory',
  'community.doctor',
  'community.scanner',
  'community.optimize.recommend',
];

export function isEnabled(feature: Feature): boolean {
  return (COMMUNITY_FEATURES as readonly string[]).includes(feature);
}
