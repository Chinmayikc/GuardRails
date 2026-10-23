"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, Blocks, Inbox, LayoutDashboard, Laptop, Plus, Radar, Search, Settings, ShieldCheck } from "lucide-react";
import TeamWorkspace from "@/app/TeamWorkspace";
import { browserDb } from "@/lib/supabase";
import { browserAuthHeaders } from "@/lib/browserAuth";
import { sampleAlerts, sampleDecisions, sampleWatches } from "@/app/workspace/sampleData";
import Overview from "@/app/workspace/views/Overview";
import type { MonitoringHealth, Team } from "@/app/workspace/types";
import "./workspace.module.css";
import styles from "./teamWorkspace.module.css";

export default function WorkspacePage() {
  const db = useMemo(() => browserDb(), []);
  // Anonymous visitors see the gate immediately; the session check runs in the
  // background and only swaps in the workspace once a session is confirmed.
  const [state, setState] = useState<"checking" | "ready" | "signed-out" | "error">("checking");

  useEffect(() => {
    document.body.classList.add("guardrails-workspace-mode");
    return () => document.body.classList.remove("guardrails-workspace-mode");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void browserAuthHeaders(db)
        .then((headers) => setState(headers.Authorization ? "ready" : "signed-out"))
        .catch(() => setState("error"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [db]);

  if (state === "ready") return <TeamWorkspace />;
  return <PublicWorkspaceDemo />;
}

function PublicWorkspaceDemo() {
  const demoTeam: Team = { id: "public-demo", name: "Sample workspace", slug: "sample-workspace", role: "viewer" };
  const health: MonitoringHealth = { status: "healthy", last_checked_at: "2026-08-06T12:17:00.000Z", next_check_at: "2026-08-06T18:17:00.000Z", cadence_hours: 6, error: null };
  const openDecisions = sampleDecisions.filter((item) => item.decision === "review");
  return <div className={styles.app}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}><ShieldCheck/><strong>GuardRails</strong></div>
      <div className={styles.switcher}><span>SW</span><div><strong>Sample workspace</strong><small>Public demo · Read only</small></div></div>
      <nav aria-label="Workspace navigation">
        {[[LayoutDashboard, "Overview"], [Inbox, "Review inbox"], [Laptop, "Inventory"], [Radar, "Trust ledger"], [Blocks, "Extensions"], [Activity, "Activity"], [Settings, "Settings"]].map(([Icon, label], index) => <button key={String(label)} className={index === 0 ? styles.navActive : ""} disabled={index !== 0}><Icon/><span>{String(label)}</span></button>)}
      </nav>
      <div className={styles.sidebarBottom}><div className={styles.account}><span>SD</span><div><strong>Sample data</strong><small>Illustrative · Read only</small></div></div></div>
    </aside>
    <main className={styles.main}>
      <header className={styles.topbar}><div className={styles.search}><Search/><span>Search extensions, decisions, or people…</span></div><div className={styles.topActions}><Link href="/registry"><Plus/> Browse registry</Link></div></header>
      <div className={styles.content}>
        <div className={styles.sampleBanner}><Radar/><span><strong>Public dashboard demo</strong>Illustrative sample data only. No real team workspace is accessed.</span></div>
        <Overview team={demoTeam} decisions={openDecisions} alerts={sampleAlerts} watches={sampleWatches} badges={[]} health={health} overdue={1} failed={0} loading={false} sampleMode onSample={() => {}} onNavigate={() => {}} canExitSample={false}/>
      </div>
    </main>
  </div>;
}
