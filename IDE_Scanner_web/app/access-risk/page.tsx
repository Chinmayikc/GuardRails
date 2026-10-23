import type { Metadata } from "next";
import AccessRiskDashboard from "./dashboard";
import "./access-risk.css";

export const metadata: Metadata = {
  title: "SaaS Access Risk",
  description: "Find privilege drift across SaaS accounts with evidence-backed access reviews.",
};

export default function AccessRiskPage() {
  return <AccessRiskDashboard />;
}
