export interface PlanConfig {
  name: string;
  price: number;
  currency: string;
  maxWebsites: number;
  checkIntervalMinutes: number;
  features: string[];
  limits: {
    websites: number;
    scanInterval: number;
    teamMembers: number;
    reportRetentionDays: number;
  };
}

export const PLANS: Record<string, PlanConfig> = {
  free: {
    name: 'Free',
    price: 0,
    currency: 'USD',
    maxWebsites: 2,
    checkIntervalMinutes: 30,
    features: [
      'Uptime monitoring',
      'SSL certificate monitoring',
      'DNS monitoring',
      'API health checks',
      'Form validation testing',
      'JavaScript error detection',
      'Plugin failure detection',
      'HTTP error detection',
      'In-app alerts only',
      'Basic dashboard access',
      'Basic incident history',
    ],
    limits: {
      websites: 2,
      scanInterval: 30,
      teamMembers: 1,
      reportRetentionDays: 7,
    },
  },
  starter: {
    name: 'Starter',
    price: 2,
    currency: 'USD',
    maxWebsites: 5,
    checkIntervalMinutes: 15,
    features: [
      'Everything in Free',
      'Email alerts',
      'Daily & weekly reports',
      'Incident history tracking',
      'Standard dashboard access',
    ],
    limits: {
      websites: 5,
      scanInterval: 15,
      teamMembers: 1,
      reportRetentionDays: 30,
    },
  },
  pro: {
    name: 'Pro',
    price: 9,
    currency: 'USD',
    maxWebsites: 30,
    checkIntervalMinutes: 5,
    features: [
      'Everything in Starter',
      'Health score (0-100) per website',
      'Downtime history tracking',
      'Error trend analysis',
      'Performance insights',
      'Priority monitoring queue',
      'Faster scan execution',
      'Advanced reporting dashboard',
    ],
    limits: {
      websites: 30,
      scanInterval: 5,
      teamMembers: 3,
      reportRetentionDays: 90,
    },
  },
  business: {
    name: 'Business',
    price: 15,
    currency: 'USD',
    maxWebsites: 100,
    checkIntervalMinutes: 1,
    features: [
      'Everything in Pro',
      'Team invites',
      'Role-based access (Admin, Editor, Viewer)',
      'Shared dashboards',
      'Multi-client / multi-project support',
      'Deep performance analytics',
      'Incident timeline tracking',
      'Root-cause analysis',
      'Historical trend intelligence',
      'Failure correlation engine',
      'Executive-level reporting',
      'Analytics export (PDF/CSV)',
    ],
    limits: {
      websites: 100,
      scanInterval: 1,
      teamMembers: 10,
      reportRetentionDays: 365,
    },
  },
};

export function getPlanById(planId: string): PlanConfig {
  return PLANS[planId] || PLANS.free;
}

export function getPlanPrice(planId: string): number {
  return PLANS[planId]?.price || 0;
}

export function getPlanInterval(planId: string): number {
  return PLANS[planId]?.checkIntervalMinutes || 30;
}
