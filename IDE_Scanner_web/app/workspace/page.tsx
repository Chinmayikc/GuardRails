"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Eye, ShieldCheck } from "lucide-react";
import TeamWorkspace from "@/app/TeamWorkspace";
import { browserDb } from "@/lib/supabase";
import { browserAuthHeaders } from "@/lib/browserAuth";
import { sampleAlerts, sampleDecisions, sampleWatches } from "@/app/workspace/sampleData";
import styles from "./workspace.module.css";

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

function displayName(watch: (typeof sampleWatches)[number]) {
  const extensions = watch.extensions;
  const record = Array.isArray(extensions) ? extensions[0] : extensions;
  return record?.display_name || watch.extension_id;
}

function PublicWorkspaceDemo() {
  return <main className={styles.gate}>
    <section className={styles.gateCopy}><span><i/> GuardRails workspace · public demo</span><h1>Keep every release decision beside its evidence.</h1><p>Explore a read-only example of how a team reviews extension changes, tracks baselines, and routes important signals. No sign-in is needed to explore this demo.</p><div className={styles.stateActions}><Link href="/account?next=/workspace">Open your private workspace <ArrowRight/></Link><Link href="/registry">Browse public reports</Link></div><small>Fictional sample data · Your real team inventory stays private</small></section>
    <section className={styles.gatePreview} aria-label="Read-only public workspace demo">
      <header><span>Sample workspace</span><em><Eye size={13}/> PUBLIC · READ ONLY</em></header>
      <div className={styles.previewMetrics}>
        <article><strong>{sampleDecisions.length}</strong><span>Need review</span></article>
        <article><strong>{sampleWatches.length}</strong><span>Monitored</span></article>
        <article><strong>{sampleAlerts.filter((alert) => alert.state === "open").length}</strong><span>Open alert</span></article>
      </div>
      <section className={styles.demoSection} aria-label="Sample review queue"><h2>Review queue <span>{sampleDecisions.length}</span></h2>{sampleDecisions.map((decision) => { const watch = sampleWatches.find((item) => item.extension_id === decision.extension_id); return <article className={styles.demoRow} key={decision.id}><span className={styles.demoMark}><ShieldCheck size={15}/></span><div><strong>{watch ? displayName(watch) : decision.extension_id}</strong><small>{decision.extension_id} · version {decision.version}</small></div><em>Review</em></article>; })}</section>
      <section className={styles.demoSection} aria-label="Sample monitored extensions"><h2>Monitored extensions <span>{sampleWatches.length}</span></h2>{sampleWatches.map((watch) => <article className={styles.demoRow} key={watch.extension_id}><span className={styles.demoMark}><Eye size={15}/></span><div><strong>{displayName(watch)}</strong><small>{watch.extension_id} · baseline {watch.baseline_version}</small></div><em className={styles.safe}>Watching</em></article>)}</section>
      {sampleAlerts[0] ? <aside className={styles.demoAlert}><span>Open alert · HIGH</span><strong>{sampleAlerts[0].title}</strong><p>{sampleAlerts[0].summary}</p></aside> : null}
      <p className={styles.previewNote}>All names and events here are illustrative sample data. This page cannot read or change any real team workspace.</p>
    </section>
  </main>;
}
