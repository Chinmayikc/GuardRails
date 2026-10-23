"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity, ArrowRight, BadgeCheck, Bot, Check, ChevronDown, Clock3,
  Download, GitBranch, LayoutDashboard, LockKeyhole, Search, ShieldAlert,
  ShieldCheck, Sparkles, Users, X,
} from "lucide-react";
import { findings as seed, type AccessFinding } from "./data";

type FilterKey = "All findings" | "Critical" | "High" | "Medium";
type ReviewResult = {
  findings: AccessFinding[];
  provider: "sample" | "aws";
  explanation?: string;
  explanationSource?: "bedrock" | "rules";
  runId?: string;
};

export default function AccessRiskDashboard() {
  const [filter, setFilter] = useState<FilterKey>("All findings");
  const [selectedId, setSelectedId] = useState<string | null>(seed[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [result, setResult] = useState<ReviewResult>({ findings: seed, provider: "sample" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selected = selectedId ? result.findings.find((item) => item.id === selectedId) : undefined;
  const openFindings = result.findings.filter((item) => !dismissed.includes(item.id));
  const elevatedCount = openFindings.filter((item) => item.severity === "Critical" || item.severity === "High").length;
  const dormantCount = openFindings.filter((item) => item.daysUnused >= 30).length;
  const visible = useMemo(
    () => openFindings.filter((item) =>
      (filter === "All findings" || item.severity === filter) &&
      `${item.person} ${item.app} ${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase()),
    ),
    [filter, query, openFindings],
  );

  async function runReview() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/access-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", findings: result.findings }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Review could not finish.");
      const next: ReviewResult = {
        findings: payload.findings ?? result.findings,
        provider: payload.provider === "aws" ? "aws" : "sample",
        explanation: payload.explanation,
        explanationSource: payload.explanationSource,
        runId: payload.runId,
      };
      setResult(next);
      setDismissed([]);
      setSelectedId(next.findings[0]?.id ?? null);
      setMessage(next.provider === "aws"
        ? `AWS review saved. ${next.explanationSource === "bedrock" ? "Bedrock" : "Rules-based"} explanation generated.`
        : "Sample review complete. No live tenant data was processed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  }

  function exportReview() {
    const blob = new Blob([JSON.stringify({
      exportedAt: new Date().toISOString(),
      source: result.provider,
      runId: result.runId,
      findings: result.findings,
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "abscissa-access-risk-review.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="accessRiskApp">
      <aside className="riskSidebar">
        <div className="riskBrand">
          <span className="riskBrandMark"><ShieldCheck size={20} /></span>
          <span><b>Abscissa</b><small>SECURITY WORKSPACE</small></span>
          <Link href="/" aria-label="Exit access risk demo"><X size={15} /></Link>
        </div>
        <div className="riskOrg"><div className="orgLogo">N</div><span><b>Northstar Labs</b><small>Synthetic workspace</small></span><ChevronDown size={15} /></div>
        <div className="riskNavLabel">WORKSPACE</div>
        <a className="riskNavItem" href="#overview"><LayoutDashboard />Overview</a>
        <a className="riskNavItem active" href="#findings"><ShieldAlert />Access findings<span className="navCount">{openFindings.length}</span></a>
        <a className="riskNavItem" href="#sources"><Users />People &amp; access</a>
        <a className="riskNavItem" href="#sources"><GitBranch />Connected apps</a>
        <a className="riskNavItem" href="#findings"><Activity />Activity timeline</a>
        <div className="riskSidebarBottom">
          <div className="secureNote"><LockKeyhole /><span><b>{result.provider === "aws" ? "Evidence protected" : "Demo-only data"}</b><small>{result.provider === "aws" ? "KMS-encrypted · 30d retention" : "No live tenant data linked"}</small></span></div>
          <div className="riskProfile"><div className="profileAvatar">DE</div><span><b>Demo reviewer</b><small>Human approval required</small></span><ChevronDown size={14} /></div>
        </div>
      </aside>

      <section className="riskMain">
        <header className="riskTopbar"><div className="breadcrumbs">Workspace <span>/</span> Access risk</div><div className="topbarRight"><span className={`cloudStatus ${result.provider === "aws" ? "connected" : ""}`}><i />{result.provider === "aws" ? "AWS connected" : "Synthetic data"}</span><div className="topbarAvatar" aria-label="Demo reviewer">DE</div></div></header>
        <div className="riskContent" id="overview">
          <div className="riskHeading"><div><div className="eyebrow"><span className="eyebrowDot" />IDENTITY POSTURE <span className="eyebrowDivider">/</span> DEMO WORKSPACE</div><h1>Access risk overview</h1><p>Find access that no longer fits the work. Every signal is grounded in evidence, with a human decision in control.</p></div><button className="exportButton" onClick={exportReview}><Download size={16} /> Export review</button></div>
          <div className="demoBanner"><div className="demoIcon"><Sparkles size={16} /></div><div><b>{result.provider === "aws" ? "AWS-backed review" : "Synthetic demo workspace"}</b><span>{result.provider === "aws" ? `Evidence saved to encrypted S3. Explanation: ${result.explanationSource === "bedrock" ? "Amazon Bedrock" : "deterministic rules"}.` : "All identities and activity below are fictional. No SaaS tenant is connected."}</span></div><span className="demoMode">{result.provider === "aws" ? "AWS MODE" : "SAMPLE DATA"}</span></div>
          <div className="metricGrid">
            <article className="metricCard"><div className="metricLabel">Open findings <ShieldAlert /></div><div className="metricValue">{openFindings.length}</div><div className="metricFoot">In this {result.provider === "aws" ? "review run" : "synthetic dataset"}</div></article>
            <article className="metricCard"><div className="metricLabel">Elevated findings <LockKeyhole /></div><div className="metricValue">{elevatedCount}</div><div className="metricFoot">Critical or high severity</div></article>
            <article className="metricCard"><div className="metricLabel">Dormant 30+ days <Clock3 /></div><div className="metricValue">{dormantCount}</div><div className="metricFoot">Evidence-based review candidates</div></article>
            <article className="metricCard"><div className="metricLabel">Human review actions <BadgeCheck /></div><div className="metricValue">{reviewed.length}</div><div className="metricFoot">Recorded in this browser session</div></article>
          </div>

          <div className="riskWorkspace">
            <section className="findingPanel" id="findings">
              <header className="panelHeader"><div><h2>Needs your attention</h2><p>Ranked by exposure and strength of evidence</p></div><span className="filterButton">Priority order</span></header>
              <div className="filterTabs" role="tablist" aria-label="Filter by severity">{(["All findings", "Critical", "High", "Medium"] as FilterKey[]).map((item) => <button role="tab" aria-selected={filter === item} className={filter === item ? "selected" : ""} key={item} onClick={() => setFilter(item)}>{item}<span>{item === "All findings" ? openFindings.length : openFindings.filter((f) => f.severity === item).length}</span></button>)}</div>
              <label className="findingSearch"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, apps, or signals" /><kbd>/</kbd></label>
              <div className="findingList">{visible.map((finding) => <button key={finding.id} className={`findingRow ${selected?.id === finding.id ? "chosen" : ""}`} onClick={() => setSelectedId(finding.id)}><span className={`severityMark ${finding.severity.toLowerCase()}`} /><span className="findingInfo"><b>{finding.title}</b><span>{finding.person} <i>·</i> {finding.app}</span><small><span className={`severityPill ${finding.severity.toLowerCase()}`}>{finding.severity}</span><span>{finding.category}</span><span><Clock3 size={12} /> {finding.lastUsed}</span></small></span><ArrowRight className="rowArrow" size={16} /></button>)}{visible.length === 0 && <div className="emptyFindings">No findings match this filter.</div>}</div>
              <footer className="listFoot">Showing {visible.length} of {openFindings.length} findings <button onClick={() => { setFilter("All findings"); setQuery(""); }}>View all <ArrowRight size={13} /></button></footer>
            </section>

            {selected && <section className="detailPanel"><div className="detailTop"><div className="detailId">FINDING {selected.id}<span className={`severityPill ${selected.severity.toLowerCase()}`}>{selected.severity} PRIORITY</span></div><button aria-label="Close detail" className="closeDetail" onClick={() => setSelectedId(null)}><X size={16} /></button></div><h2>{selected.title}</h2><p className="detailSub">{selected.person} <span>·</span> {selected.department} <span>·</span> {selected.app}</p><div className="principalCard"><div className="personAvatar">{selected.initials}</div><div><b>{selected.person}</b><span>{selected.department} · Fictional demo identity</span></div><span className="roleTag">{selected.role}</span></div><div className="evidenceHeading"><h3>Why this was flagged</h3><span><BadgeCheck size={13} /> SAMPLE EVIDENCE</span></div><ul className="evidenceList">{selected.evidence.map((line) => <li key={line}><span><Check size={12} /></span>{line}</li>)}</ul><div className="recommendation"><div className="recommendIcon"><Bot size={17} /></div><div><b>Recommended next step</b><p>{selected.recommendation}</p><small><Sparkles size={12} /> Evidence-grounded · reviewer decides</small></div></div>{result.explanation && <div className="decisionNote"><Sparkles size={14} />{result.explanation}</div>}<div className="decisionNote"><LockKeyhole size={14} /> Abscissa never revokes access automatically.</div><div className="decisionActions"><button className="reviewButton" onClick={() => { setReviewed((items) => items.includes(selected.id) ? items : [...items, selected.id]); setMessage(`${selected.id} marked for human review in this demo session.`); }}><Check size={15} />{reviewed.includes(selected.id) ? "Queued for review" : "Mark for review"}</button><button className="dismissButton" onClick={() => { setDismissed((items) => items.includes(selected.id) ? items : [...items, selected.id]); setSelectedId(result.findings.find((item) => item.id !== selected.id && !dismissed.includes(item.id))?.id ?? null); setMessage(`${selected.id} hidden for this demo session only.`); }}>Dismiss</button></div></section>}
          </div>

          <div className="riskBottom"><section className="sourcePanel" id="sources"><div><span className="sourceIcon"><GitBranch size={17} /></span><div><b>Illustrative identity sources</b><small>Example app names only · no connectors configured</small></div></div><div className="sourceLogos"><span className="sourceLogo github">GH</span><span className="sourceLogo slack">#</span><span className="sourceLogo google">G</span><span className="sourceLogo aws">aws</span></div><span className="filterButton">Demo labels</span></section><section className="reviewPanel"><div className="reviewCopy"><span className="reviewIcon"><Sparkles size={17} /></span><div><b>Run an access review</b><small>{result.provider === "aws" ? "Analyze this review and store its evidence in AWS." : "Explore the sample flow; configure AWS to persist evidence."}</small></div></div><button className="runButton" onClick={runReview} disabled={busy}>{busy ? <><Activity size={15} className="spin" /> Reviewing…</> : <><Sparkles size={15} /> Run review</>}</button></section></div>
          {message && <div className="riskToast" role="status"><Check size={15} />{message}<button aria-label="Dismiss message" onClick={() => setMessage("")}><X size={14} /></button></div>}
          <footer className="riskFooter"><span>ABSCISSA ACCESS INTELLIGENCE <i>·</i> EVIDENCE BEFORE ACTION</span><a href="#findings">Methodology <ArrowRight size={12} /></a><span>{result.runId ? `Run ${result.runId}` : "Synthetic data · no live identities connected"}</span></footer>
        </div>
      </section>
    </main>
  );
}
