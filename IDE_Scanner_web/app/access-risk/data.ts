export type AccessFinding = {
  id: string;
  person: string;
  initials: string;
  title: string;
  app: string;
  role: string;
  severity: "Critical" | "High" | "Medium";
  category: string;
  lastUsed: string;
  daysUnused: number;
  evidence: string[];
  recommendation: string;
  department: string;
};

export const findings: AccessFinding[] = [
  { id: "AR-2048", person: "Jordan Lee", initials: "JL", title: "Production admin retained after team transfer", app: "GitHub Enterprise", role: "Organization owner", severity: "Critical", category: "Role drift", lastUsed: "Never in 90 days", daysUnused: 90, evidence: ["Moved from Platform to Design on Aug 14", "Owner role can manage 42 repositories", "No owner-level action recorded in 90 days"], recommendation: "Review ownership with the Platform lead. Downgrade to repository-specific access if no longer required.", department: "Design" },
  { id: "AR-2043", person: "Priya Nair", initials: "PN", title: "Dormant workspace administrator", app: "Slack", role: "Workspace admin", severity: "High", category: "Dormant access", lastUsed: "47 days ago", daysUnused: 47, evidence: ["Admin role is in the top 4% of workspace privileges", "Last admin action was 47 days ago", "Active in Slack 3 days ago with standard member activity"], recommendation: "Confirm ongoing admin duties. Remove elevated role while preserving standard workspace membership if not needed.", department: "Customer Success" },
  { id: "AR-2039", person: "Mateo Silva", initials: "MS", title: "Sensitive export scope exceeds observed use", app: "Google Workspace", role: "Drive data export", severity: "High", category: "Excess privilege", lastUsed: "12 days ago", daysUnused: 12, evidence: ["Can export shared-drive content across 8 teams", "Observed activity limited to one project drive", "No bulk export event found in the last 60 days"], recommendation: "Replace broad export access with project-drive access and review again after 30 days.", department: "Engineering" },
  { id: "AR-2031", person: "Avery Chen", initials: "AC", title: "External collaborator with lingering write access", app: "GitHub Enterprise", role: "Write on payments-api", severity: "Medium", category: "Stale membership", lastUsed: "31 days ago", daysUnused: 31, evidence: ["Collaborator account is outside the company domain", "Project owner marked the engagement complete 28 days ago", "Write access remains on a repository with payment code"], recommendation: "Ask the repository owner to confirm the engagement before removing write access.", department: "External" },
  { id: "AR-2027", person: "Samira Okafor", initials: "SO", title: "Unusual access-time pattern", app: "AWS IAM Identity Center", role: "PowerUserAccess", severity: "Medium", category: "Anomalous activity", lastUsed: "Today, 02:14 UTC", daysUnused: 0, evidence: ["Sign-in occurred outside the user's 30-day baseline", "Source region differs from the last 20 sign-ins", "No impossible-travel conclusion: location signal is low confidence"], recommendation: "Verify the sign-in with the user and review CloudTrail activity for the session before changing access.", department: "Finance" },
];
