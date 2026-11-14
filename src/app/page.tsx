"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Cloud, FileCheck2, FileClock, FilePlus2, FileText, FolderKanban, LayoutDashboard, LockKeyhole, LogOut, Menu, MoreHorizontal, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, UploadCloud, WandSparkles, X } from "lucide-react";
import { defaultTaxonomy, sampleInvoices, type Classification, type Invoice, type Taxonomy } from "@/lib/types";
import { getSupabase, isCloudConfigured } from "@/lib/supabase";

type View = "overview" | "invoices" | "review" | "settings";
type Filter = "all" | "needs_review" | "approved";
const cloud = isCloudConfigured();
const storageKey = "sift-demo-invoices-v1";
const taxonomyKey = "sift-demo-taxonomy-v1";

function money(amount: number, currency = "USD") {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
}
function shortDate(date: string) {
  if (!date) return "—";
  const value = new Date(`${date.slice(0, 10)}T12:00:00`);
  return Number.isNaN(value.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(value);
}
function initials(value: string) { return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "?"; }
function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function emptyInvoice(file?: File): Invoice {
  return { id: crypto.randomUUID(), file_name: file?.name || "Manual entry", vendor: "", invoice_number: "", invoice_date: "", amount: 0, currency: "USD", type: defaultTaxonomy.types[0], department: "Unassigned", entity: defaultTaxonomy.entities[0], category: "Other", status: "needs_review", confidence: 0, source: "manual", notes: "", created_at: new Date().toISOString() };
}

export default function Home() {
  const [view, setView] = useState<View>("overview");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>(defaultTaxonomy);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!cloud);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSent, setLoginSent] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 4500); }

  useEffect(() => {
    if (!cloud) {
      // Browser storage is the demo workspace's external data source.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      try { setInvoices(JSON.parse(localStorage.getItem(storageKey) || "null") || sampleInvoices); } catch { setInvoices(sampleInvoices); }
      try { setTaxonomy(JSON.parse(localStorage.getItem(taxonomyKey) || "null") || defaultTaxonomy); } catch { setTaxonomy(defaultTaxonomy); }
      setStorageReady(true);
      return;
    }
    const supabase = getSupabase()!;
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user || null); setAuthReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!cloud || !user) return;
    const supabase = getSupabase()!;
    (async () => {
      const [{ data: rows, error }, { data: settings }] = await Promise.all([
        supabase.from("invoices").select("*").order("created_at", { ascending: false }),
        supabase.from("user_settings").select("taxonomy").eq("user_id", user.id).maybeSingle(),
      ]);
      if (error) notify(`Could not load invoices: ${error.message}`);
      setInvoices((rows as Invoice[] | null) || []);
      if (settings?.taxonomy && Object.keys(settings.taxonomy).length) setTaxonomy(settings.taxonomy as Taxonomy);
      setStorageReady(true);
    })();
  }, [user]);

  useEffect(() => { if (!cloud && storageReady) localStorage.setItem(storageKey, JSON.stringify(invoices)); }, [invoices, storageReady]);
  useEffect(() => { if (!cloud && storageReady) localStorage.setItem(taxonomyKey, JSON.stringify(taxonomy)); }, [taxonomy, storageReady]);

  const reviewCount = invoices.filter((invoice) => invoice.status === "needs_review").length;
  const approvedCount = invoices.filter((invoice) => invoice.status === "approved").length;
  const filtered = useMemo(() => invoices.filter((invoice) => {
    const matchesFilter = filter === "all" || invoice.status === filter;
    const matchesQuery = `${invoice.vendor} ${invoice.invoice_number} ${invoice.file_name} ${invoice.category} ${invoice.department}`.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  }), [invoices, filter, query]);
  const reviewItems = invoices.filter((invoice) => invoice.status === "needs_review");
  const sorted = [...invoices].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const categories = useMemo(() => {
    const totals = new Map<string, number>();
    invoices.forEach((invoice) => totals.set(invoice.category, (totals.get(invoice.category) || 0) + 1));
    return [...totals].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [invoices]);

  async function persistInvoice(invoice: Invoice, file?: File) {
    if (!cloud) { setInvoices((current) => [invoice, ...current.filter((item) => item.id !== invoice.id)]); return invoice; }
    if (!user) throw new Error("Please sign in first.");
    const supabase = getSupabase()!;
    let filePath = invoice.file_path;
    if (file) {
      filePath = `${user.id}/${invoice.id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const uploaded = await supabase.storage.from("invoices").upload(filePath, file, { contentType: file.type, upsert: true });
      if (uploaded.error) throw uploaded.error;
    }
    const record = { ...invoice, user_id: user.id, file_path: filePath || null, invoice_date: invoice.invoice_date || null };
    const { data, error } = await supabase.from("invoices").upsert(record).select().single();
    if (error) {
      if (file && filePath) await supabase.storage.from("invoices").remove([filePath]);
      throw error;
    }
    const saved = { ...data, invoice_date: data.invoice_date || "" } as Invoice;
    setInvoices((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    return saved;
  }

  async function deleteInvoice(invoice: Invoice) {
    if (cloud) {
      const supabase = getSupabase()!;
      const { error } = await supabase.from("invoices").delete().eq("id", invoice.id);
      if (error) { notify(error.message); return; }
      if (invoice.file_path) await supabase.storage.from("invoices").remove([invoice.file_path]);
    }
    setInvoices((current) => current.filter((item) => item.id !== invoice.id));
    setSelected(null);
    notify("Invoice deleted.");
  }

  async function openFile(invoice: Invoice) {
    if (!invoice.file_path) { notify("Original file is unavailable for this demo item."); return; }
    const { data, error } = await getSupabase()!.storage.from("invoices").createSignedUrl(invoice.file_path, 60);
    if (error || !data) notify("Could not open this file."); else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function downloadCsv() {
    const fields: (keyof Invoice)[] = ["vendor", "invoice_number", "invoice_date", "amount", "currency", "type", "department", "entity", "category", "status", "confidence", "file_name"];
    const rows = [fields.join(","), ...filtered.map((invoice) => fields.map((field) => csvCell(invoice[field])).join(","))];
    const url = URL.createObjectURL(new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "sift-invoices.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  async function saveTaxonomy(next: Taxonomy) {
    if (cloud && user) {
      const { error } = await getSupabase()!.from("user_settings").upsert({ user_id: user.id, taxonomy: next, updated_at: new Date().toISOString() });
      if (error) { notify(error.message); return; }
    }
    setTaxonomy(next); notify("Classification options saved.");
  }

  async function sendLogin(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    const { error } = await getSupabase()!.auth.signInWithOtp({ email: loginEmail, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) notify(error.message); else setLoginSent(true);
  }

  function navigate(next: View) { setView(next); setMenuOpen(false); setSelected(null); if (next === "review") setFilter("needs_review"); else if (next === "invoices") setFilter("all"); }

  if (!authReady) return <div className="loading-screen"><Image src="/icon-192.png" width={55} height={55} alt="Sift" /><span>Opening Sift...</span></div>;
  if (cloud && !user) return <div className="auth-page"><div className="auth-art"><div className="auth-art-inner"><Image src="/brand-icon.png" width={300} height={300} alt="" /><span>Every invoice, in its place.</span></div></div><div className="auth-content"><Brand /><div className="auth-card"><div className="eyebrow">WELCOME TO SIFT</div><h1>Bring clarity to every invoice.</h1><p>Capture invoices, get instant category suggestions and keep your records ready for review.</p>{loginSent ? <div className="login-success"><CheckCircle2 size={22} /><div><strong>Check your inbox</strong><span>We sent a sign-in link to {loginEmail}.</span></div></div> : <form onSubmit={sendLogin}><label htmlFor="login-email">Work email</label><input id="login-email" type="email" placeholder="you@company.com" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required /><button className="primary-button full" disabled={busy}>{busy ? "Sending..." : "Continue with email"}<ArrowRight size={18} /></button></form>}<div className="auth-foot"><LockKeyhole size={16} /> Your invoices stay private to your account.</div></div></div>{toast && <Toast message={toast} />}</div>;

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-top"><Brand /><button className="icon-button mobile-only" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
      <div className="workspace-chip"><div className="workspace-icon">W</div><div><strong>Workspace</strong><span>{cloud ? user?.email?.split("@")[0] : "Demo workspace"}</span></div><ChevronDown size={15} /></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        <NavButton active={view === "overview"} icon={<LayoutDashboard size={19} />} label="Overview" onClick={() => navigate("overview")} />
        <NavButton active={view === "invoices"} icon={<FileText size={19} />} label="All invoices" onClick={() => navigate("invoices")} />
        <NavButton active={view === "review"} icon={<FileClock size={19} />} label="Review queue" count={reviewCount} onClick={() => navigate("review")} />
      </nav>
      <div className="nav-label nav-label-second">PREFERENCES</div>
      <nav className="side-nav" aria-label="Preferences"><NavButton active={view === "settings"} icon={<Settings2 size={19} />} label="Classification settings" onClick={() => navigate("settings")} /></nav>
      <div className="sidebar-bottom"><div className="sidebar-help"><div className="help-icon"><Sparkles size={17} /></div><strong>A tidier way to work</strong><p>Turn a stack of invoices into an organized, review-ready list.</p><button onClick={() => setUploadOpen(true)}>Add an invoice <ArrowRight size={14} /></button></div><div className="sidebar-account"><div className="avatar">{cloud ? initials(user?.email || "U") : "D"}</div><div><strong>{cloud ? user?.email?.split("@")[0] : "Demo workspace"}</strong><span>{cloud ? "Cloud connected" : "Local preview"}</span></div>{cloud && <button className="icon-button" title="Sign out" aria-label="Sign out" onClick={() => getSupabase()!.auth.signOut()}><LogOut size={17} /></button>}</div></div>
    </aside>
    {menuOpen && <button className="menu-backdrop mobile-only" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
    <div className="main-column">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-only" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={22} /></button><div className="breadcrumb">Workspace <ChevronRight size={14} /><strong>{view === "overview" ? "Overview" : view === "invoices" ? "All invoices" : view === "review" ? "Review queue" : "Settings"}</strong></div></div><div className="topbar-right"><span className={`mode-pill ${cloud ? "mode-cloud" : ""}`}>{cloud ? <Cloud size={14} /> : <span className="mode-dot" />}{cloud ? "Cloud workspace" : "Demo mode"}</span><button className="top-avatar" aria-label="Account">{cloud ? initials(user?.email || "U") : "D"}</button></div></header>
      <main className="content">
        {view === "overview" && <><div className="page-heading"><div><div className="eyebrow">YOUR WORKSPACE</div><h1>Overview<span className="heading-sparkle">✦</span></h1><p>A clear picture of your invoices, all in one place.</p></div><button className="primary-button" onClick={() => setUploadOpen(true)}><Plus size={19} /> Add invoice</button></div>
          {!cloud && <div className="demo-banner"><div className="demo-banner-icon"><Sparkles size={18} /></div><div><strong>You’re exploring a demo workspace</strong><span>Sample invoices and edits stay in this browser. Uploaded files are not retained in demo mode.</span></div><button onClick={() => navigate("settings")}>Setup guide <ArrowRight size={15} /></button></div>}
          <div className="stat-grid"><StatCard label="Total invoices" value={invoices.length} icon={<FileText size={21} />} tone="blue" change="Across all categories" /><StatCard label="Needs review" value={reviewCount} icon={<FileClock size={21} />} tone="orange" change="Ready for your approval" /><StatCard label="Approved" value={approvedCount} icon={<FileCheck2 size={21} />} tone="green" change="Organized and complete" /><StatCard label="Categories used" value={new Set(invoices.map((invoice) => invoice.category)).size} icon={<FolderKanban size={21} />} tone="purple" change="Across your workspace" /></div>
          <div className="dashboard-grid"><section className="surface review-surface"><div className="section-heading"><div><h2>Needs your attention</h2><p>Check these suggestions before they become final.</p></div><button className="text-button" onClick={() => navigate("review")}>View all <ArrowRight size={16} /></button></div>{reviewItems.length ? <div className="review-list">{reviewItems.slice(0, 3).map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} onClick={() => setSelected(invoice)} compact />)}</div> : <EmptyState icon={<CheckCircle2 size={24} />} title="All caught up" description="New invoices that need review will appear here." />}<button className="review-bottom" onClick={() => navigate("review")}>Open review queue <ArrowRight size={16} /></button></section>
          <section className="surface category-surface"><div className="section-heading"><div><h2>By category</h2><p>Where your invoices are going.</p></div><button className="icon-button" aria-label="Classification settings" onClick={() => navigate("settings")}><MoreHorizontal size={20} /></button></div><div className="category-chart"><div className="donut" style={{ background: donutGradient(categories) }}><div><strong>{invoices.length}</strong><span>invoices</span></div></div></div><div className="legend">{categories.length ? categories.map(([name, count], index) => <div className="legend-item" key={name}><span className={`legend-dot dot-${index}`} /><span>{name}</span><strong>{count}</strong></div>) : <p>No categories yet</p>}</div></section></div>
          <section className="surface recent-surface"><div className="section-heading"><div><h2>Recent invoices</h2><p>Your latest uploads and classifications.</p></div><button className="text-button" onClick={() => navigate("invoices")}>View all <ArrowRight size={16} /></button></div><div className="invoice-list">{sorted.slice(0, 4).map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} onClick={() => setSelected(invoice)} />)}</div></section>
        </>}
        {(view === "invoices" || view === "review") && <><div className="page-heading"><div><div className="eyebrow">INVOICE LIBRARY</div><h1>{view === "review" ? "Review queue" : "All invoices"}</h1><p>{view === "review" ? "Make the final call on every suggested classification." : "Search, sort and manage every invoice in one place."}</p></div><button className="primary-button" onClick={() => setUploadOpen(true)}><Plus size={19} /> Add invoice</button></div><div className="list-toolbar"><div className="tab-group"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All <span>{invoices.length}</span></button><button className={filter === "needs_review" ? "active" : ""} onClick={() => setFilter("needs_review")}>Needs review <span>{reviewCount}</span></button><button className={filter === "approved" ? "active" : ""} onClick={() => setFilter("approved")}>Approved <span>{approvedCount}</span></button></div><div className="toolbar-actions"><label className="search-field"><Search size={18} /><input placeholder="Search invoices..." value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search invoices" /></label><button className="secondary-button export-button" onClick={downloadCsv} disabled={!filtered.length}><ArrowDownToLine size={17} /> Export CSV</button></div></div><section className="surface invoice-table"><div className="table-head"><span>INVOICE</span><span>CLASSIFICATION</span><span>AMOUNT</span><span>STATUS</span><span></span></div>{filtered.length ? filtered.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} onClick={() => setSelected(invoice)} />) : <EmptyState icon={<FileText size={25} />} title="No invoices found" description={query ? "Try a different search term." : "Add an invoice to start building your library."} action={<button className="primary-button" onClick={() => setUploadOpen(true)}><Plus size={17} /> Add invoice</button>} />}</section><div className="list-footer">Showing {filtered.length} of {invoices.length} invoices</div></>}
        {view === "settings" && <SettingsView taxonomy={taxonomy} onSave={saveTaxonomy} cloud={cloud} />}
      </main>
    </div>
    <nav className="bottom-nav" aria-label="Mobile navigation"><button className={view === "overview" ? "active" : ""} onClick={() => navigate("overview")}><LayoutDashboard size={21} /><span>Home</span></button><button className={view === "invoices" ? "active" : ""} onClick={() => navigate("invoices")}><FileText size={21} /><span>Invoices</span></button><button className="nav-add" onClick={() => setUploadOpen(true)} aria-label="Add invoice"><Plus size={24} /></button><button className={view === "review" ? "active" : ""} onClick={() => navigate("review")}><FileClock size={21} /><span>Review</span>{reviewCount > 0 && <i />}</button><button className={view === "settings" ? "active" : ""} onClick={() => navigate("settings")}><Settings2 size={21} /><span>Settings</span></button></nav>
    {uploadOpen && <UploadModal taxonomy={taxonomy} onClose={() => setUploadOpen(false)} onSave={async (invoice, file) => { await persistInvoice(invoice, file); setUploadOpen(false); notify("Invoice added to your review queue."); }} notify={notify} />}
    {selected && <InvoiceDetail invoice={selected} taxonomy={taxonomy} onClose={() => setSelected(null)} onSave={async (invoice) => { try { const saved = await persistInvoice(invoice); setSelected(saved); notify("Invoice updated."); } catch (error) { notify(error instanceof Error ? error.message : "Could not save invoice."); } }} onDelete={() => deleteInvoice(selected)} onOpenFile={() => openFile(selected)} />}
    {toast && <Toast message={toast} />}
  </div>;
}

function Brand() { return <div className="brand"><Image src="/icon-192.png" width={32} height={32} alt="" /><span>sift<span className="brand-period">.</span></span></div>; }
function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count?: number; onClick: () => void }) { return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span>{Boolean(count) && <b>{count}</b>}</button>; }
function StatCard({ label, value, icon, tone, change }: { label: string; value: number; icon: React.ReactNode; tone: string; change: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-change">{change}</div></div>; }
function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) { return <div className="empty-state"><div className="empty-icon">{icon}</div><strong>{title}</strong><span>{description}</span>{action}</div>; }
function Toast({ message }: { message: string }) { return <div role="status" className="toast"><CheckCircle2 size={18} />{message}</div>; }
function StatusBadge({ status }: { status: Invoice["status"] }) { return <span className={`status-badge ${status === "approved" ? "approved" : "pending"}`}><span />{status === "approved" ? "Approved" : "Needs review"}</span>; }
function InvoiceRow({ invoice, onClick, compact = false }: { invoice: Invoice; onClick: () => void; compact?: boolean }) { return <button className={`invoice-row ${compact ? "compact" : ""}`} onClick={onClick}><div className="row-vendor"><div className="vendor-avatar">{initials(invoice.vendor)}</div><div className="vendor-details"><strong>{invoice.vendor || "Unknown vendor"}</strong><span>{invoice.invoice_number || invoice.file_name} <span className="inline-dot">·</span> {shortDate(invoice.invoice_date)}</span></div></div><div className="row-category"><span>{invoice.category}</span><small>{invoice.department}</small></div><div className="row-amount">{money(invoice.amount, invoice.currency)}</div><div className="row-status"><StatusBadge status={invoice.status} /></div><ChevronRight className="row-arrow" size={18} /></button>; }
function donutGradient(items: [string, number][]) { const colors = ["#5865e8", "#89a0f4", "#afbaf9", "#dde2fc"]; const total = items.reduce((sum, item) => sum + item[1], 0); if (!total) return "#edf0f7"; let from = 0; const stops = items.map((item, index) => { const to = from + item[1] / total * 100; const stop = `${colors[index]} ${from}% ${to}%`; from = to; return stop; }); return `conic-gradient(${stops.join(", ")})`; }

function InvoiceFields({ invoice, taxonomy, onChange }: { invoice: Invoice; taxonomy: Taxonomy; onChange: (next: Invoice) => void }) {
  const change = (key: keyof Invoice, value: string | number) => onChange({ ...invoice, [key]: value });
  return <div className="form-grid"><label className="field"><span>Vendor</span><input value={invoice.vendor} onChange={(event) => change("vendor", event.target.value)} placeholder="e.g. Acme Supplies" /></label><label className="field"><span>Invoice number</span><input value={invoice.invoice_number} onChange={(event) => change("invoice_number", event.target.value)} placeholder="e.g. INV-001" /></label><label className="field"><span>Invoice date</span><input type="date" value={invoice.invoice_date || ""} onChange={(event) => change("invoice_date", event.target.value)} /></label><div className="field-row"><label className="field"><span>Amount</span><input type="number" min="0" step="0.01" value={invoice.amount || ""} onChange={(event) => change("amount", Number(event.target.value))} placeholder="0.00" /></label><label className="field currency-field"><span>Currency</span><select value={invoice.currency} onChange={(event) => change("currency", event.target.value)}><option>USD</option><option>EUR</option><option>GBP</option><option>NGN</option><option>DZD</option><option>CAD</option><option>AUD</option></select></label></div><div className="form-divider"><span>CLASSIFICATION</span></div><label className="field"><span>Invoice type</span><select value={invoice.type} onChange={(event) => change("type", event.target.value)}>{taxonomy.types.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Expense category</span><select value={invoice.category} onChange={(event) => change("category", event.target.value)}>{taxonomy.categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Department</span><select value={invoice.department} onChange={(event) => change("department", event.target.value)}>{taxonomy.departments.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Entity</span><select value={invoice.entity} onChange={(event) => change("entity", event.target.value)}>{taxonomy.entities.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field full-field"><span>Notes</span><textarea value={invoice.notes} onChange={(event) => change("notes", event.target.value)} placeholder="Add a note for your team..." rows={3} /></label></div>;
}

function UploadModal({ taxonomy, onClose, onSave, notify }: { taxonomy: Taxonomy; onClose: () => void; onSave: (invoice: Invoice, file?: File) => Promise<void>; notify: (message: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<Invoice>(emptyInvoice());
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function chooseFile(next?: File) {
    if (!next) return;
    if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(next.type) || next.size > 10 * 1024 * 1024) { notify("Choose a PDF, PNG, JPG or WebP under 10 MB."); return; }
    setFile(next); setDraft(emptyInvoice(next)); setNotice("");
  }
  async function classify() {
    if (!file) return;
    setWorking(true);
    try {
      const form = new FormData(); form.append("file", file); form.append("taxonomy", JSON.stringify(taxonomy));
      const headers: Record<string, string> = {};
      if (cloud) { const { data } = await getSupabase()!.auth.getSession(); if (data.session) headers.authorization = `Bearer ${data.session.access_token}`; }
      const response = await fetch("/api/classify", { method: "POST", body: form, headers });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Classification failed.");
      const classification = result.classification as Classification;
      setDraft({ ...emptyInvoice(file), ...classification, file_name: file.name });
      setNotice(result.notice || (classification.source === "groq" ? "AI suggestion ready. Check every field before saving." : "Suggestions ready. Check every field before saving."));
      setStep("review");
    } catch (error) { notify(error instanceof Error ? error.message : "Could not classify this invoice."); }
    finally { setWorking(false); }
  }
  async function save(status: Invoice["status"]) {
    if (!draft.vendor.trim()) { notify("Add the vendor before saving."); return; }
    setWorking(true);
    try { await onSave({ ...draft, status, vendor: draft.vendor.trim() }, file || undefined); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not save invoice."); setWorking(false); }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal upload-modal" role="dialog" aria-modal="true" aria-label="Add invoice"><div className="modal-header"><div><div className="eyebrow">NEW INVOICE</div><h2>{step === "upload" ? "Add an invoice" : "Review suggestions"}</h2><p>{step === "upload" ? "Upload a file to get started." : "Make sure the details look right before saving."}</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={21} /></button></div>{step === "upload" ? <div className="modal-body"><div className={`dropzone ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }}><div className="drop-icon"><UploadCloud size={28} /></div><strong>{file ? file.name : "Drag and drop your invoice"}</strong><span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Ready to classify` : "PDF, PNG, JPG or WebP · Up to 10 MB"}</span><button className="secondary-button" onClick={() => inputRef.current?.click()}>{file ? "Choose another file" : "Browse files"}</button><input ref={inputRef} type="file" accept=".pdf,image/png,image/jpeg,image/webp" hidden onChange={(event) => chooseFile(event.target.files?.[0])} /><input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(event) => chooseFile(event.target.files?.[0])} /></div><button className="camera-button" onClick={() => cameraRef.current?.click()}><FilePlus2 size={17} /> Take a photo with your phone</button><div className="upload-note"><ShieldCheck size={18} /><p>You review every suggestion. When AI is enabled, invoice content is sent to Groq for classification.</p></div></div> : <div className="modal-body review-form"><div className="suggestion-note"><WandSparkles size={19} /><div><strong>{draft.source === "groq" ? "AI suggested these details" : draft.source === "rules" ? "Basic rules suggested these details" : "Enter invoice details"}</strong><span>{notice || (draft.source === "manual" ? "Fill in the fields below, then save for review or approve." : "Check every field before saving.")}</span></div></div><InvoiceFields invoice={draft} taxonomy={taxonomy} onChange={setDraft} /></div>}<div className="modal-footer">{step === "upload" ? <><button className="secondary-button" onClick={() => { setDraft(emptyInvoice(file || undefined)); setStep("review"); }}>Enter manually</button><button className="primary-button" onClick={classify} disabled={!file || working}>{working ? "Classifying..." : "Classify invoice"}<ArrowRight size={17} /></button></> : <><button className="secondary-button" onClick={() => setStep("upload")}><ArrowLeft size={17} /> Back</button><div className="footer-right"><button className="secondary-button" onClick={() => save("needs_review")} disabled={working}>Save for review</button><button className="primary-button" onClick={() => save("approved")} disabled={working}><Check size={18} /> Approve & save</button></div></>}</div></div></div>;
}

function InvoiceDetail({ invoice, taxonomy, onClose, onSave, onDelete, onOpenFile }: { invoice: Invoice; taxonomy: Taxonomy; onClose: () => void; onSave: (invoice: Invoice) => Promise<void>; onDelete: () => void; onOpenFile: () => void }) {
  const [draft, setDraft] = useState(invoice);
  const [working, setWorking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Refresh the editor after a save returns the authoritative cloud row.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDraft(invoice), [invoice]);
  async function save(status: Invoice["status"]) { setWorking(true); try { await onSave({ ...draft, status }); } finally { setWorking(false); } }
  return <div className="detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="detail-panel" role="dialog" aria-modal="true" aria-label="Invoice details"><div className="detail-header"><button className="icon-button" onClick={onClose} aria-label="Close details"><ArrowLeft size={21} /></button><span>Invoice details</span><button className="icon-button" onClick={() => setConfirmDelete(true)} aria-label="Delete invoice"><Trash2 size={18} /></button></div><div className="detail-scroll"><div className="detail-hero"><div className="detail-doc-icon"><FileText size={26} /></div><h2>{draft.vendor || "Unknown vendor"}</h2><span>{draft.file_name}</span><StatusBadge status={draft.status} /></div><div className="detail-file"><div><FileText size={18} /><span>{draft.file_name}</span></div><button onClick={onOpenFile}>View file <ArrowRight size={15} /></button></div><div className="detail-section-head"><h3>Invoice information</h3><span>{draft.source === "groq" ? <><Sparkles size={14} /> AI suggested</> : draft.source === "rules" ? "Rule suggested" : draft.source === "sample" ? "Sample data" : "Manually entered"}</span></div><InvoiceFields invoice={draft} taxonomy={taxonomy} onChange={setDraft} />{draft.source === "groq" && <div className="confidence-note"><Activity size={16} /> AI confidence: {Math.round(draft.confidence * 100)}%. Always verify against the original invoice.</div>}</div><div className="detail-footer"><button className="secondary-button" onClick={() => save("needs_review")} disabled={working}>Save for review</button><button className="primary-button" onClick={() => save("approved")} disabled={working}><Check size={17} /> Approve invoice</button></div>{confirmDelete && <div className="confirm-overlay"><div className="confirm-card"><div className="confirm-icon"><Trash2 size={21} /></div><h3>Delete this invoice?</h3><p>This removes the invoice and its uploaded file from your workspace.</p><div><button className="secondary-button" onClick={() => setConfirmDelete(false)}>Cancel</button><button className="danger-button" onClick={onDelete}>Delete invoice</button></div></div></div>}</aside></div>;
}

function SettingsView({ taxonomy, onSave, cloud }: { taxonomy: Taxonomy; onSave: (next: Taxonomy) => Promise<void>; cloud: boolean }) {
  const [draft, setDraft] = useState<Taxonomy>(taxonomy);
  const [inputs, setInputs] = useState<Record<keyof Taxonomy, string>>({ types: "", departments: "", entities: "", categories: "" });
  const [saving, setSaving] = useState(false);
  // Settings can arrive after the cloud profile loads.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDraft(taxonomy), [taxonomy]);
  const sections: { key: keyof Taxonomy; title: string; description: string; placeholder: string }[] = [
    { key: "types", title: "Invoice types", description: "Describe what kind of document it is.", placeholder: "Add an invoice type" },
    { key: "departments", title: "Departments", description: "Route spend to the right team.", placeholder: "Add a department" },
    { key: "entities", title: "Entities", description: "Keep separate companies or branches organized.", placeholder: "Add an entity" },
    { key: "categories", title: "Expense categories", description: "Group similar costs for reporting.", placeholder: "Add a category" },
  ];
  function add(key: keyof Taxonomy) { const value = inputs[key].trim(); if (value && !draft[key].some((item) => item.toLowerCase() === value.toLowerCase())) setDraft({ ...draft, [key]: [...draft[key], value] }); setInputs({ ...inputs, [key]: "" }); }
  return <><div className="page-heading settings-heading"><div><div className="eyebrow">MAKE IT YOURS</div><h1>Classification settings</h1><p>Tell Sift how your business organizes invoices.</p></div><button className="primary-button" onClick={async () => { setSaving(true); await onSave(draft); setSaving(false); }} disabled={saving}><Check size={18} /> {saving ? "Saving..." : "Save changes"}</button></div><div className="settings-layout"><div><section className="surface settings-intro"><div className="settings-intro-icon"><SlidersHorizontal size={23} /></div><div><h2>Make suggestions fit your business</h2><p>These are the exact options used by the classifier and the review form. Keep the lists short and distinct for better results.</p></div></section>{sections.map((section) => <section className="surface taxonomy-card" key={section.key}><div className="section-heading"><div><h2>{section.title}</h2><p>{section.description}</p></div><span className="count-pill">{draft[section.key].length}</span></div><div className="tag-list">{draft[section.key].map((item) => <span className="taxonomy-tag" key={item}>{item}<button aria-label={`Remove ${item}`} onClick={() => setDraft({ ...draft, [section.key]: draft[section.key].filter((value) => value !== item) })} disabled={draft[section.key].length <= 1}><X size={14} /></button></span>)}</div><div className="add-option"><input placeholder={section.placeholder} value={inputs[section.key]} onChange={(event) => setInputs({ ...inputs, [section.key]: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") add(section.key); }} /><button onClick={() => add(section.key)}><Plus size={17} /> Add</button></div></section>)}</div><aside className="settings-side"><div className="surface guide-card"><div className="guide-icon"><CircleHelp size={20} /></div><h3>How classification works</h3><ol><li>Upload a PDF or image.</li><li>Sift suggests details and tags from your lists.</li><li>You review and approve the result.</li></ol><div className="guide-divider" /><strong>AI is optional</strong><p>With a Groq API key, Sift reads invoice images and digital PDFs. Without one, simple keyword rules still help organize files.</p></div><div className="surface connection-card"><div className="connection-heading"><span className="connection-indicator" /><strong>{cloud ? "Supabase connected" : "Demo workspace"}</strong></div><p>{cloud ? "Your invoices and classification options are saved to your private workspace." : "Your changes are saved in this browser. Connect Supabase to sync files and records across devices."}</p></div></aside></div></>;
}
