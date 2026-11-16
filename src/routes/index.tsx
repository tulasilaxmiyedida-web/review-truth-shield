import { createFileRoute } from "@tanstack/react-router";
import {
  Activity, ArrowDownToLine, ArrowRight, Bell, Check, ChevronDown, CircleHelp,
  Clock3, Database, FileChartColumn, FileUp, Filter, History, LayoutDashboard,
  ListFilter, LoaderCircle, Menu, MessageSquareText, Search, Settings2, Shield,
  ShieldAlert, ShieldCheck, Sparkles, Trash2, Upload, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  classifyReviews, parseCsv, SAMPLE_REVIEWS, similarity,
  type AnalysisSession, type ParsedCsv, type ReviewCategory, type ReviewRow,
} from "@/lib/review-shield";

const STORAGE_KEY = "reviewshield.workspace.v1";
const NAV = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Upload Reviews", icon: FileUp },
  { label: "Detection Engine", icon: ShieldCheck },
  { label: "Compare Reviews", icon: MessageSquareText },
  { label: "Analytics", icon: FileChartColumn },
  { label: "History", icon: History },
  { label: "Reports", icon: ArrowDownToLine },
  { label: "Settings", icon: Settings2 },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReviewShield — Review analysis workspace" },
      { name: "description", content: "Analyze customer review datasets with transparent heuristic risk estimates, similarity checks, and data-backed reports." },
      { property: "og:title", content: "ReviewShield — Review analysis workspace" },
      { property: "og:description", content: "A review analysis workspace for importing, comparing, and assessing customer feedback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewShieldApp,
});

type StoredWorkspace = { datasetName: string; headers: string[]; rows: ReviewRow[]; history: AnalysisSession[] };
const EMPTY: StoredWorkspace = { datasetName: "", headers: [], rows: [], history: [] };

function ReviewShieldApp() {
  const [workspace, setWorkspace] = useState<StoredWorkspace>(EMPTY);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState("Dashboard");
  const [textColumn, setTextColumn] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All categories");
  const [sort, setSort] = useState("Highest risk");
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [selectedHistory, setSelectedHistory] = useState<AnalysisSession | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredWorkspace;
        setWorkspace({ ...EMPTY, ...parsed });
        setTextColumn(parsed.headers[0] ?? "");
      }
    } catch {
      toast.error("Saved workspace could not be read. You can import your data again.");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  }, [workspace, ready]);

  const analyzed = workspace.rows.filter((row) => Boolean(row.category));
  const counts = useMemo(() => analyzed.reduce(
    (acc, row) => { if (row.category) acc[row.category] += 1; return acc; },
    { Genuine: 0, Suspicious: 0, Fake: 0 },
  ), [analyzed]);
  const averageRisk = analyzed.length
    ? Math.round(analyzed.reduce((sum, row) => sum + (row.risk ?? 0), 0) / analyzed.length)
    : 0;
  const results = useMemo(() => {
    const filtered = analyzed.filter((row) => {
      const matchesQuery = `${row.text} ${row.reason ?? ""} ${row.category ?? ""}`.toLowerCase().includes(query.toLowerCase());
      return matchesQuery && (filter === "All categories" || row.category === filter);
    });
    return [...filtered].sort((a, b) => sort === "Lowest risk"
      ? (a.risk ?? 0) - (b.risk ?? 0)
      : sort === "Review text" ? a.text.localeCompare(b.text) : (b.risk ?? 0) - (a.risk ?? 0));
  }, [analyzed, filter, query, sort]);
  const selectedA = workspace.rows.find((row) => row.id === compareA);
  const selectedB = workspace.rows.find((row) => row.id === compareB);
  const comparison = selectedA && selectedB ? similarity(selectedA.text, selectedB.text) : null;
  const pieData = [
    { name: "Genuine", value: counts.Genuine, fill: "var(--color-success)" },
    { name: "Suspicious", value: counts.Suspicious, fill: "var(--color-warning)" },
    { name: "Fake", value: counts.Fake, fill: "var(--color-destructive)" },
  ].filter((entry) => entry.value > 0);
  const trendData = useMemo(() => {
    const groups = new Map<string, { day: string; total: number; fake: number }>();
    for (const row of analyzed) {
      const dateRaw = Object.entries(row.source).find(([key]) => /^(date|created_at|timestamp)$/i.test(key))?.[1];
      const parsed = dateRaw ? new Date(dateRaw) : new Date(row.analyzedAt ?? "");
      const day = Number.isNaN(parsed.getTime()) ? "Undated" : parsed.toLocaleDateString("en", { month: "short", day: "numeric" });
      const group = groups.get(day) ?? { day, total: 0, fake: 0 };
      group.total += 1;
      if (row.category === "Fake") group.fake += 1;
      groups.set(day, group);
    }
    return [...groups.values()].slice(-10);
  }, [analyzed]);
  const ratingData = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const row of analyzed) {
      const value = Object.entries(row.source).find(([key]) => /^(rating|stars)$/i.test(key))?.[1];
      if (value) grouped.set(value, (grouped.get(value) ?? 0) + 1);
    }
    return [...grouped.entries()].sort(([a], [b]) => Number(a) - Number(b)).map(([rating, total]) => ({ rating: `${rating} star`, total }));
  }, [analyzed]);
  const suspiciousWords = useMemo(() => {
    const ignored = new Set("this that with from have were your their there would could about after before product works very best they them just really more than when what been good great very well also into over only does because arrived using used use took its and the for but not was are you our my it is to of a in on at by as an be no if".split(" "));
    const tally = new Map<string, number>();
    for (const row of analyzed.filter((review) => review.category !== "Genuine")) {
      for (const word of row.text.toLowerCase().match(/[a-z]{4,}/g) ?? []) {
        if (!ignored.has(word)) tally.set(word, (tally.get(word) ?? 0) + 1);
      }
    }
    return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [analyzed]);

  async function loadCsv(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) { toast.error("Choose a CSV file to import."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("This file exceeds the 10 MB upload limit."); return; }
    try {
      const parsed: ParsedCsv = parseCsv(await file.text());
      const rows = parsed.rows.map((source, index) => ({ id: `${Date.now()}-${index}`, text: "", source }));
      setWorkspace({ datasetName: file.name, headers: parsed.headers, rows, history: workspace.history });
      setTextColumn(parsed.headers.find((header) => /review|comment|text|feedback/i.test(header)) ?? parsed.headers[0] ?? "");
      setCompareA(""); setCompareB(""); setSelectedHistory(null);
      setPage("Upload Reviews");
      toast.success(`${rows.length} rows imported. Choose the review column to continue.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read this CSV file.");
    }
  }

  function loadSample() {
    const headers = Object.keys(SAMPLE_REVIEWS[0]?.source ?? {});
    const rows = SAMPLE_REVIEWS.map((row) => ({ ...row, text: row.source.review ?? "" }));
    setWorkspace({ ...workspace, datasetName: "reviewshield-sample.csv", headers, rows });
    setTextColumn("review"); setCompareA(""); setCompareB(""); setSelectedHistory(null);
    setPage("Upload Reviews");
    toast.success("Sample dataset loaded. Review the preview, then analyze it.");
  }

  function selectTextColumn(column: string) {
    setTextColumn(column);
    setWorkspace((current) => ({ ...current, rows: current.rows.map((row) => ({ ...row, text: row.source[column] ?? "", category: undefined, risk: undefined, reason: undefined, analyzedAt: undefined })) }));
  }

  function runAnalysis() {
    if (!workspace.rows.length) { toast.error("Import a CSV or load the sample dataset first."); return; }
    if (!textColumn || !workspace.rows.some((row) => (row.source[textColumn] ?? "").trim())) { toast.error("Choose a review text column containing review text."); return; }
    const prepared = workspace.rows.map((row) => ({ ...row, text: row.source[textColumn] ?? "" })).filter((row) => row.text.trim());
    if (!prepared.length) { toast.error("No non-empty reviews were found in that column."); return; }
    const reviews = classifyReviews(prepared);
    const summary = reviews.reduce((acc, row) => { if (row.category) acc[row.category] += 1; return acc; }, { Genuine: 0, Suspicious: 0, Fake: 0 });
    const session: AnalysisSession = {
      id: `${Date.now()}`, name: workspace.datasetName || "Imported reviews", createdAt: new Date().toISOString(),
      total: reviews.length, genuine: summary.Genuine, suspicious: summary.Suspicious, fake: summary.Fake, reviews,
    };
    setWorkspace((current) => ({ ...current, rows: reviews, history: [session, ...current.history] }));
    setSelectedHistory(null); setPage("Detection Engine");
    toast.success(`${reviews.length} reviews analyzed and added to history.`);
  }

  function clearDataset() {
    setWorkspace((current) => ({ ...current, datasetName: "", headers: [], rows: [] }));
    setCompareA(""); setCompareB("");
    if (fileInput.current) fileInput.current.value = "";
    toast.success("Active dataset cleared. Saved analysis history is unchanged.");
  }

  function exportCsv() {
    if (!analyzed.length) { toast.error("Analyze a dataset before exporting a report."); return; }
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const lines = [["review", "category", "heuristic_risk_score", "reason", "analyzed_at"], ...analyzed.map((row) => [row.text, row.category ?? "", row.risk ?? 0, row.reason ?? "", row.analyzedAt ?? ""])];
    downloadFile(`${lines.map((line) => line.map(escape).join(",")).join("\r\n")}`, "reviewshield-report.csv", "text/csv;charset=utf-8");
    toast.success("CSV report downloaded.");
  }

  function exportHistory(session: AnalysisSession) {
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const lines = [["review", "category", "heuristic_risk_score", "reason", "analyzed_at"], ...session.reviews.map((row) => [row.text, row.category ?? "", row.risk ?? 0, row.reason ?? "", row.analyzedAt ?? ""])];
    downloadFile(lines.map((line) => line.map(escape).join(",")).join("\r\n"), `${session.name.replace(/[^a-z0-9-]/gi, "-")}-report.csv`, "text/csv;charset=utf-8");
  }

  function clearHistory() {
    setWorkspace((current) => ({ ...current, history: [] }));
    setSelectedHistory(null);
    toast.success("Saved analysis history cleared.");
  }

  function removeHistory(id: string) {
    setWorkspace((current) => ({ ...current, history: current.history.filter((item) => item.id !== id) }));
    if (selectedHistory?.id === id) setSelectedHistory(null);
    toast.success("Analysis session removed.");
  }

  const title = selectedHistory && (page === "History" || page === "Reports") ? "Session details" : page;

  return (
    <div className="app-shell min-h-screen bg-background text-foreground">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand-lockup"><div className="brand-mark"><Shield className="size-5" /></div><div><div className="brand-name">ReviewShield</div><div className="brand-caption">REVIEW INTELLIGENCE</div></div></div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {NAV.map(({ label, icon: Icon }) => (
            <Button key={label} variant="ghost" className={`nav-item ${page === label ? "nav-active" : ""}`} onClick={() => { setPage(label); setSelectedHistory(null); setMobileNav(false); }}>
              <Icon className="size-[17px]" /><span>{label}</span>{label === "Detection Engine" && analyzed.length > 0 && <span className="nav-count">{analyzed.length}</span>}
            </Button>
          ))}
        </nav>
        <div className="sidebar-bottom"><div className="shield-status"><span className="status-dot" /><span>Workspace ready</span></div><div className="sidebar-footnote">Review patterns. Protect trust.</div></div>
      </aside>
      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><Button variant="ghost" size="icon" className="menu-trigger" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu /></Button><div className="crumb">Workspace <span>/</span> <strong>{title}</strong></div></div>
          <div className="topbar-right">
            <label className="searchbox"><Search className="size-4" /><Input aria-label="Search reviews" placeholder="Search reviews…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <div className="notification-wrap"><Button variant="ghost" size="icon" aria-label="Notifications" title="Notifications" onClick={() => setNoticeOpen((open) => !open)}><Bell className="size-[18px]" />{analyzed.length > 0 && <span className="notification-dot" />}</Button>{noticeOpen && <div className="notification-popover"><strong>Workspace activity</strong><p>{analyzed.length ? `${analyzed.length} reviews in the current analysis.` : "No reviews analyzed yet."}</p><p>{workspace.history.length} saved {workspace.history.length === 1 ? "session" : "sessions"}</p></div>}</div>
            <div className="profile-chip"><div className="avatar-initials">RS</div><div><strong>Analyst</strong><span>Review team</span></div><ChevronDown className="size-3.5 text-muted-foreground" /></div>
          </div>
        </header>
        <section className="page-content">
          {page === "Dashboard" && <>
            <PageHeading eyebrow="OVERVIEW" title="Review dashboard" subtitle="A clear view of your review dataset and its risk signals." action={<Button onClick={() => setPage("Upload Reviews")}><Upload /> Upload reviews</Button>} />
            {!analyzed.length ? <EmptyState onUpload={() => setPage("Upload Reviews")} onSample={loadSample} /> : <>
              <div className="metrics-grid">
                <Metric icon={MessageSquareText} label="Reviews analyzed" value={analyzed.length} detail={workspace.datasetName || "Active dataset"} />
                <Metric icon={ShieldCheck} label="Genuine" value={counts.Genuine} detail={`${percent(counts.Genuine, analyzed.length)}% of analyzed`} tone="success" />
                <Metric icon={ShieldAlert} label="Suspicious" value={counts.Suspicious} detail={`${percent(counts.Suspicious, analyzed.length)}% of analyzed`} tone="warning" />
                <Metric icon={Activity} label="Fake signals" value={counts.Fake} detail={`${percent(counts.Fake, analyzed.length)}% of analyzed`} tone="danger" />
                <Metric icon={CircleHelp} label="Average risk" value={`${averageRisk}%`} detail="Heuristic estimate · not model accuracy" tone="accent" />
              </div>
              <div className="chart-grid">
                <Panel title="Detection distribution" subtitle="Classification of analyzed reviews" className="distribution-panel">
                  {pieData.length ? <div className="distribution-layout"><div className="pie-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={3} stroke="none">{pieData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}</Pie><ChartTooltip formatter={(value) => [`${value} reviews`, "Count"]} /></PieChart></ResponsiveContainer><div className="pie-center"><strong>{analyzed.length}</strong><span>reviews</span></div></div><div className="legend-list">{["Genuine", "Suspicious", "Fake"].map((name) => <div className="legend-row" key={name}><span className={`legend-dot ${name.toLowerCase()}`} /><span>{name}</span><strong>{counts[name as ReviewCategory]}</strong></div>)}</div></div> : <ChartEmpty />}
                </Panel>
                <Panel title="Review activity" subtitle="Observed dates from your imported data"><ChartFrame data={trendData} empty={analyzed.length === 0}><BarChart data={trendData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} /><ChartTooltip /><Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Reviews" /></BarChart></ChartFrame></Panel>
              </div>
              <div className="chart-grid second-charts"><Panel title="Fake review signals" subtitle="Fake-classified reviews by observed date"><ChartFrame data={trendData} empty={!analyzed.length}><LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} /><ChartTooltip /><Line type="monotone" dataKey="fake" stroke="var(--color-destructive)" strokeWidth={2.5} dot={{ r: 3 }} name="Fake signals" /></LineChart></ChartFrame></Panel><Panel title="Recent analysis" subtitle="Latest classified reviews" action={<Button variant="ghost" size="sm" onClick={() => setPage("Detection Engine")}>View all <ArrowRight /></Button>}><ReviewList rows={[...analyzed].reverse().slice(0, 4)} /></Panel></div>
            </>}
          </>}

          {page === "Upload Reviews" && <>
            <PageHeading eyebrow="DATA INTAKE" title="Upload reviews" subtitle="Import a CSV dataset and choose the column containing review text." />
            <div className="upload-layout">
              <Panel title="Add a dataset" subtitle="CSV files up to 10 MB" className="upload-panel">
                <input ref={fileInput} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void loadCsv(file); }} />
                <div className={`dropzone ${isDragging ? "dropzone-active" : ""}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); const file = event.dataTransfer.files[0]; if (file) void loadCsv(file); }}>
                  <div className="drop-icon"><FileUp /></div><strong>Drop a CSV file here</strong><span>or browse files from your device</span>
                  <Button variant="outline" onClick={() => fileInput.current?.click()}><Upload /> Browse files</Button>
                </div>
                <div className="upload-or"><span />OR<span /></div>
                <Button variant="secondary" className="sample-button" onClick={loadSample}><Database /> Load sample dataset <ArrowRight /></Button>
                <div className="upload-hint"><ShieldCheck /> Your data stays in this browser. Review scores are heuristic estimates.</div>
              </Panel>
              <Panel title="Analysis checklist" subtitle="From import to report">
                <div className="checklist">{["Import a CSV or load sample data", "Preview rows and select review text", "Analyze with transparent rules", "Inspect results and export a report"].map((item, index) => <div key={item} className="check-item"><span>{index + 1}</span><p>{item}</p>{index === 0 && workspace.rows.length > 0 && <Check className="check-done" />}</div>)}</div>
              </Panel>
            </div>
            {workspace.rows.length > 0 && <Panel title="Dataset preview" subtitle={`${workspace.datasetName} · ${workspace.rows.length} rows`} action={<Button variant="outline" size="sm" onClick={clearDataset}><Trash2 /> Clear dataset</Button>} className="preview-panel">
              <div className="column-picker"><label htmlFor="review-column">Review text column</label><Select value={textColumn} onValueChange={selectTextColumn}><SelectTrigger id="review-column" className="column-select"><SelectValue placeholder="Choose a column" /></SelectTrigger><SelectContent>{workspace.headers.map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}</SelectContent></Select><span>{workspace.rows.filter((row) => (row.source[textColumn] ?? "").trim()).length} non-empty reviews</span><Button onClick={runAnalysis}><Sparkles /> Analyze reviews</Button></div>
              <div className="table-scroll"><table className="data-table"><thead><tr>{workspace.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{workspace.rows.slice(0, 8).map((row) => <tr key={row.id}>{workspace.headers.map((header) => <td key={header} title={row.source[header]}>{row.source[header] || <span className="muted-cell">—</span>}</td>)}</tr>)}</tbody></table></div>
              {workspace.rows.length > 8 && <div className="table-foot">Showing 8 of {workspace.rows.length} rows</div>}
            </Panel>}
          </>}

          {page === "Detection Engine" && <>
            <PageHeading eyebrow="HEURISTIC ANALYSIS" title="Detection engine" subtitle="Explainable pattern checks, not a trained machine-learning model." action={<Button variant="outline" onClick={() => setPage("Upload Reviews")}><Upload /> Change dataset</Button>} />
            <div className="method-note"><ShieldCheck /><p><strong>Transparent risk estimates</strong><span>Scores flag patterns such as duplicate text, promotional wording, repeated words, very short content, and rating conflicts. They are not proof of fraud.</span></p><span className="method-tag">HEURISTIC</span></div>
            {!analyzed.length ? <EmptyState onUpload={() => setPage("Upload Reviews")} onSample={loadSample} /> : <>
              <div className="result-toolbar"><div className="result-total"><strong>{results.length}</strong> of {analyzed.length} reviews</div><div className="toolbar-controls"><label className="filter-select"><Filter /><select aria-label="Filter by category" value={filter} onChange={(event) => setFilter(event.target.value)}><option>All categories</option><option>Genuine</option><option>Suspicious</option><option>Fake</option></select></label><label className="filter-select"><ListFilter /><select aria-label="Sort results" value={sort} onChange={(event) => setSort(event.target.value)}><option>Highest risk</option><option>Lowest risk</option><option>Review text</option></select></label></div></div>
              <Panel title="Review classification" subtitle="Category, heuristic risk score, and detected patterns"><div className="table-scroll"><table className="data-table detection-table"><thead><tr><th>Review</th><th>Category</th><th>Risk estimate</th><th>Reason</th><th>Analyzed</th></tr></thead><tbody>{results.map((row) => <tr key={row.id}><td className="review-cell">{row.text}</td><td><CategoryBadge category={row.category ?? "Genuine"} /></td><td><div className="risk-cell"><div className="risk-meter"><span className={`risk-bar ${riskTone(row.risk ?? 0)}`} style={{ width: `${row.risk ?? 0}%` }} /></div><strong>{row.risk ?? 0}%</strong></div></td><td className="reason-cell">{row.reason}</td><td className="date-cell">{row.analyzedAt ? new Date(row.analyzedAt).toLocaleDateString() : "—"}</td></tr>)}</tbody></table>{results.length === 0 && <div className="empty-filter"><Search /> No reviews match these filters.</div>}</div></Panel>
            </>}
          </>}

          {page === "Compare Reviews" && <>
            <PageHeading eyebrow="TEXT SIMILARITY" title="Compare reviews" subtitle="Compare two reviews from your active dataset and inspect shared language." />
            {!workspace.rows.length ? <EmptyState onUpload={() => setPage("Upload Reviews")} onSample={loadSample} /> : <>
              <Panel title="Choose reviews" subtitle="Similarity uses shared unique words (Jaccard index)."><div className="compare-selectors"><div><label htmlFor="compare-a">Review one</label><Select value={compareA} onValueChange={setCompareA}><SelectTrigger id="compare-a"><SelectValue placeholder="Select a review" /></SelectTrigger><SelectContent>{workspace.rows.map((row) => <SelectItem key={row.id} value={row.id}>{row.text.slice(0, 64) || "Empty review"}</SelectItem>)}</SelectContent></Select></div><div className="compare-arrow"><ArrowRight /></div><div><label htmlFor="compare-b">Review two</label><Select value={compareB} onValueChange={setCompareB}><SelectTrigger id="compare-b"><SelectValue placeholder="Select a review" /></SelectTrigger><SelectContent>{workspace.rows.filter((row) => row.id !== compareA).map((row) => <SelectItem key={row.id} value={row.id}>{row.text.slice(0, 64) || "Empty review"}</SelectItem>)}</SelectContent></Select></div></div></Panel>
              {selectedA && selectedB && comparison && <><div className="similarity-summary"><div className="similarity-score"><strong>{comparison.percent}%</strong><span>word similarity</span></div><div><strong>{comparison.percent >= 50 ? "Potentially similar reviews" : "No strong word overlap"}</strong><span>{comparison.percent >= 50 ? "Shared wording may warrant a closer look; similarity alone does not establish duplication." : "These reviews have limited shared vocabulary."}</span></div><div className="common-words"><span>Shared words</span><div>{comparison.commonWords.length ? comparison.commonWords.map((word) => <span key={word}>{word}</span>) : <em>No common words</em>}</div></div></div><div className="compare-cards"><ReviewCompareCard label="REVIEW ONE" review={selectedA} /><ReviewCompareCard label="REVIEW TWO" review={selectedB} /></div></>}
            </>}
          </>}

          {page === "Analytics" && <>
            <PageHeading eyebrow="DATA INSIGHTS" title="Analytics" subtitle="Metrics and trends calculated only from analyzed dataset fields." action={analyzed.length > 0 ? <Button variant="outline" onClick={exportCsv}><ArrowDownToLine /> Export CSV</Button> : undefined} />
            {!analyzed.length ? <EmptyState onUpload={() => setPage("Upload Reviews")} onSample={loadSample} /> : <>
              <div className="metrics-grid analytics-metrics"><Metric label="Reviews analyzed" value={analyzed.length} detail="Current analyzed dataset" /><Metric label="Genuine share" value={`${percent(counts.Genuine, analyzed.length)}%`} detail={`${counts.Genuine} reviews`} tone="success" /><Metric label="Suspicious share" value={`${percent(counts.Suspicious, analyzed.length)}%`} detail={`${counts.Suspicious} reviews`} tone="warning" /><Metric label="Fake signal share" value={`${percent(counts.Fake, analyzed.length)}%`} detail={`${counts.Fake} reviews`} tone="danger" /><Metric label="Average risk" value={`${averageRisk}%`} detail="Heuristic estimate" tone="accent" /></div>
              <div className="chart-grid"><Panel title="Detection distribution" subtitle="Counts by heuristic category">{pieData.length ? <div className="distribution-layout"><div className="pie-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={3} stroke="none">{pieData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}</Pie><ChartTooltip /></PieChart></ResponsiveContainer><div className="pie-center"><strong>{analyzed.length}</strong><span>reviews</span></div></div><div className="legend-list">{["Genuine", "Suspicious", "Fake"].map((name) => <div className="legend-row" key={name}><span className={`legend-dot ${name.toLowerCase()}`} /><span>{name}</span><strong>{counts[name as ReviewCategory]}</strong></div>)}</div></div> : <ChartEmpty />}</Panel><Panel title="Trend by observed date" subtitle="Dates from the imported dataset, or analysis date when absent"><ChartFrame data={trendData} empty={!analyzed.length}><LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} /><ChartTooltip /><Line type="monotone" dataKey="total" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} name="Total" /><Line type="monotone" dataKey="fake" stroke="var(--color-destructive)" strokeWidth={2} dot={{ r: 3 }} name="Fake signals" /></LineChart></ChartFrame></Panel></div>
              <div className="chart-grid second-charts"><Panel title="Rating distribution" subtitle="Only included when a rating or stars column exists">{ratingData.length ? <ChartFrame data={ratingData}><BarChart data={ratingData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="rating" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} /><ChartTooltip /><Bar dataKey="total" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Reviews" /></BarChart></ChartFrame> : <ChartEmpty message="No rating or stars column found in this dataset." />}</Panel><Panel title="Frequent terms in flagged reviews" subtitle="Words in suspicious and fake reviews"><KeywordList words={suspiciousWords} /></Panel></div>
              <div className="insight-band"><div className="insight-icon"><Activity /></div><div><strong>Dataset coverage</strong><p>{ratingData.length ? "Rating distribution uses provided rating values." : "No rating values were found; rating analytics are omitted."} {workspace.rows.some((row) => Object.keys(row.source).some((key) => /^(date|created_at|timestamp)$/i.test(key))) ? "Date trends use dataset dates." : "Date trends use the current analysis time because no date field was supplied."}</p></div></div>
            </>}
          </>}

          {page === "History" && <>
            <PageHeading eyebrow="SAVED SESSIONS" title={selectedHistory ? "Session details" : "Analysis history"} subtitle={selectedHistory ? `${selectedHistory.name} · ${formatDate(selectedHistory.createdAt)}` : "Previous analysis sessions saved in this browser."} action={workspace.history.length > 0 && !selectedHistory ? <Button variant="outline" onClick={clearHistory}><Trash2 /> Clear history</Button> : selectedHistory ? <Button variant="outline" onClick={() => setSelectedHistory(null)}><ArrowRight className="rotate-180" /> All sessions</Button> : undefined} />
            {selectedHistory ? <SessionDetails session={selectedHistory} onExport={() => exportHistory(selectedHistory)} /> : workspace.history.length === 0 ? <EmptyState title="No saved sessions" message="Completed analyses are saved here automatically on this device." onUpload={() => setPage("Upload Reviews")} onSample={loadSample} /> : <Panel title="Saved analysis sessions" subtitle={`${workspace.history.length} sessions stored on this device`}><div className="table-scroll"><table className="data-table history-table"><thead><tr><th>Analysis date</th><th>Dataset</th><th>Total</th><th>Genuine</th><th>Suspicious</th><th>Fake</th><th>Actions</th></tr></thead><tbody>{workspace.history.map((session) => <tr key={session.id}><td>{formatDate(session.createdAt)}</td><td className="dataset-name">{session.name}</td><td>{session.total}</td><td><span className="table-count success-text">{session.genuine}</span></td><td><span className="table-count warning-text">{session.suspicious}</span></td><td><span className="table-count danger-text">{session.fake}</span></td><td><div className="row-actions"><Button variant="outline" size="sm" onClick={() => setSelectedHistory(session)}>View details</Button><Button variant="ghost" size="icon" aria-label={`Delete ${session.name}`} title="Delete session" onClick={() => removeHistory(session.id)}><Trash2 /></Button></div></td></tr>)}</tbody></table></div></Panel>}
          </>}

          {page === "Reports" && <>
            <PageHeading eyebrow="EXPORT & SHARE" title={selectedHistory ? "Session report" : "Reports"} subtitle={selectedHistory ? `${selectedHistory.name} · ${formatDate(selectedHistory.createdAt)}` : "Review your latest analysis and download an export."} action={selectedHistory ? <Button variant="outline" onClick={() => setSelectedHistory(null)}><ArrowRight className="rotate-180" /> Current report</Button> : undefined} />
            {selectedHistory ? <SessionDetails session={selectedHistory} onExport={() => exportHistory(selectedHistory)} /> : !analyzed.length ? <EmptyState title="No report to generate" message="Analyze a dataset first. Reports are based on actual review results." onUpload={() => setPage("Upload Reviews")} onSample={loadSample} /> : <>
              <div className="report-actions"><div><strong>Current analysis report</strong><span>{workspace.datasetName || "Active dataset"} · {analyzed.length} reviews</span></div><div><Button variant="outline" onClick={exportCsv}><ArrowDownToLine /> Download CSV</Button><Button onClick={() => window.print()}><FileChartColumn /> Print / Save PDF</Button></div></div>
              <div className="report-sheet"><div className="report-title"><div className="brand-mark"><Shield className="size-5" /></div><div><strong>ReviewShield</strong><span>REVIEW ANALYSIS REPORT</span></div><time>{new Date().toLocaleDateString()}</time></div><h2>Analysis summary</h2><p className="report-intro">{workspace.datasetName || "Active dataset"} · {analyzed.length} reviews analyzed using transparent heuristic rules.</p><div className="report-stat-grid"><ReportStat label="Total reviews" value={analyzed.length} /><ReportStat label="Genuine" value={counts.Genuine} tone="success" /><ReportStat label="Suspicious" value={counts.Suspicious} tone="warning" /><ReportStat label="Fake signals" value={counts.Fake} tone="danger" /><ReportStat label="Average risk" value={`${averageRisk}%`} /></div><div className="report-chart-row"><div><h3>Detection distribution</h3><div className="distribution-layout"><div className="pie-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" innerRadius={54} outerRadius={76} paddingAngle={3} stroke="none">{pieData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}</Pie></PieChart></ResponsiveContainer><div className="pie-center"><strong>{analyzed.length}</strong><span>reviews</span></div></div><div className="legend-list">{["Genuine", "Suspicious", "Fake"].map((name) => <div className="legend-row" key={name}><span className={`legend-dot ${name.toLowerCase()}`} /><span>{name}</span><strong>{counts[name as ReviewCategory]}</strong></div>)}</div></div></div><div><h3>Common flagged patterns</h3><ul className="pattern-list">{suspiciousWords.length ? suspiciousWords.slice(0, 6).map(([word, total]) => <li key={word}><span>{word}</span><strong>{total}</strong></li>) : <li>No flagged terms detected.</li>}</ul></div></div><p className="report-disclaimer">Category and risk values are heuristic estimates based on visible text patterns. They are not a machine-learning prediction or proof of review fraud.</p></div>
            </>}
          </>}

          {page === "Settings" && <>
            <PageHeading eyebrow="PREFERENCES" title="Settings" subtitle="Workspace information and local data controls." />
            <div className="settings-grid"><Panel title="About ReviewShield" subtitle="Review analysis workspace"><div className="about-block"><div className="brand-mark"><Shield className="size-5" /></div><div><strong>ReviewShield</strong><p>Review pattern analysis for thoughtful, transparent dataset review.</p><span className="version-tag">HEURISTIC ENGINE · VERSION 1.0</span></div></div><div className="setting-row"><span>Theme</span><strong>Navy & white</strong></div><div className="setting-row"><span>Analysis method</span><strong>Transparent rules</strong></div><div className="setting-row"><span>Storage</span><strong>Local browser storage</strong></div></Panel><Panel title="Data management" subtitle="Manage the data stored on this device"><div className="data-management"><div><strong>Active dataset</strong><span>{workspace.rows.length ? `${workspace.datasetName} · ${workspace.rows.length} rows` : "No dataset loaded"}</span></div><Button variant="outline" disabled={!workspace.rows.length} onClick={clearDataset}><Trash2 /> Clear dataset</Button></div><div className="data-management"><div><strong>Analysis history</strong><span>{workspace.history.length} saved {workspace.history.length === 1 ? "session" : "sessions"}</span></div><Button variant="destructive" disabled={!workspace.history.length} onClick={clearHistory}><Trash2 /> Clear history</Button></div><div className="storage-note"><Database /> Active reviews and history are saved in this browser only. Clearing browser storage removes saved data.</div></Panel></div>
          </>}
        </section>
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action && <div className="heading-action">{action}</div>}</div>;
}

function Panel({ title, subtitle, action, className = "", children }: { title: string; subtitle?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && <div>{action}</div>}</div>{children}</section>;
}

function Metric({ icon: Icon, label, value, detail, tone = "default" }: { icon?: typeof Shield; label: string; value: string | number; detail: string; tone?: string }) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span>{Icon && <span className={`metric-icon ${tone}`}><Icon /></span>}</div><div className="metric-value">{value}</div><div className="metric-detail">{detail}</div></div>;
}

function EmptyState({ onUpload, onSample, title = "Start with a review dataset", message = "Import your CSV or load sample reviews to see real analysis results." }: { onUpload: () => void; onSample: () => void; title?: string; message?: string }) {
  return <div className="empty-state"><div className="empty-icon"><Shield /></div><h2>{title}</h2><p>{message}</p><div><Button onClick={onUpload}><Upload /> Upload reviews</Button><Button variant="outline" onClick={onSample}><Database /> Load sample data</Button></div></div>;
}

function CategoryBadge({ category }: { category: ReviewCategory }) {
  return <span className={`category-badge ${category.toLowerCase()}`}><span />{category}</span>;
}

function ReviewList({ rows }: { rows: ReviewRow[] }) {
  return <div className="recent-list">{rows.length ? rows.map((row) => <div className="recent-item" key={row.id}><div className={`recent-icon ${row.category?.toLowerCase() ?? "genuine"}`}>{row.category === "Fake" ? <ShieldAlert /> : row.category === "Suspicious" ? <Shield /> : <ShieldCheck />}</div><div className="recent-text"><p>{row.text}</p><span>{row.reason}</span></div><CategoryBadge category={row.category ?? "Genuine"} /></div>) : <ChartEmpty />}</div>;
}

function ReviewCompareCard({ label, review }: { label: string; review: ReviewRow }) {
  return <Panel title={label} subtitle={review.category ? "Analyzed review" : "Imported review"}><p className="compare-review-text">{review.text}</p><div className="compare-meta">{review.category && <CategoryBadge category={review.category} />}{review.risk !== undefined && <span>{review.risk}% heuristic risk</span>}<span>{Object.entries(review.source).filter(([key]) => !/review|comment|text|feedback/i.test(key)).slice(0, 2).map(([key, value]) => `${key}: ${value}`).join(" · ")}</span></div></Panel>;
}

function KeywordList({ words }: { words: [string, number][] }) {
  if (!words.length) return <ChartEmpty message="No flagged review terms in this dataset." />;
  return <div className="keyword-list">{words.map(([word, count]) => <div key={word}><span>{word}</span><div className="keyword-meter"><span style={{ width: `${Math.max(12, (count / (words[0]?.[1] ?? 1)) * 100)}%` }} /></div><strong>{count}</strong></div>)}</div>;
}

function SessionDetails({ session, onExport }: { session: AnalysisSession; onExport: () => void }) {
  const suspicious = session.reviews.filter((row) => row.category !== "Genuine");
  return <><div className="metrics-grid session-metrics"><Metric label="Total reviews" value={session.total} detail={session.name} /><Metric label="Genuine" value={session.genuine} detail={`${percent(session.genuine, session.total)}% of session`} tone="success" /><Metric label="Suspicious" value={session.suspicious} detail={`${percent(session.suspicious, session.total)}% of session`} tone="warning" /><Metric label="Fake signals" value={session.fake} detail={`${percent(session.fake, session.total)}% of session`} tone="danger" /></div><Panel title="Session review results" subtitle={`Analyzed ${formatDate(session.createdAt)}`} action={<Button variant="outline" size="sm" onClick={onExport}><ArrowDownToLine /> Export CSV</Button>}><div className="table-scroll"><table className="data-table detection-table"><thead><tr><th>Review</th><th>Category</th><th>Risk estimate</th><th>Reason</th></tr></thead><tbody>{session.reviews.map((row) => <tr key={row.id}><td className="review-cell">{row.text}</td><td><CategoryBadge category={row.category ?? "Genuine"} /></td><td>{row.risk ?? 0}%</td><td className="reason-cell">{row.reason}</td></tr>)}</tbody></table></div></Panel><div className="insight-band"><ShieldAlert /><div><strong>{suspicious.length} reviews flagged for further review</strong><p>Flagging is based on heuristic patterns only and is not proof of fraudulent activity.</p></div></div></>;
}

function ReportStat({ label, value, tone = "default" }: { label: string; value: string | number; tone?: string }) {
  return <div className="report-stat"><span>{label}</span><strong className={`${tone}-text`}>{value}</strong></div>;
}

function ChartFrame({ children, data, empty = false }: { children: React.ReactElement; data: unknown[]; empty?: boolean }) {
  if (empty || !data.length) return <ChartEmpty />;
  return <div className="chart-frame"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}

function ChartEmpty({ message = "Analyze reviews to show dataset insights." }: { message?: string }) {
  return <div className="chart-empty"><Activity /><span>{message}</span></div>;
}

function percent(value: number, total: number) { return total ? Math.round((value / total) * 100) : 0; }
function formatDate(value: string) { return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
function riskTone(value: number) { return value >= 70 ? "danger" : value >= 35 ? "warning" : "success"; }
function downloadFile(contents: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}