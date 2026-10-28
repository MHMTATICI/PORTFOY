import { useState, useMemo, useEffect, useGrokTheme } from "./grok-canvas-shim";
import type { ChangeEvent, CSSProperties, ReactNode } from "./grok-canvas-shim";

type Tx = { id: number; date: string; type: "AL" | "SAT" | "YATIRMA" | "CEKME" | "DUZELT" | "TEMETTU"; ticker: string; qty: number; price: number; amount: number; pocket: string; opening?: boolean; note?: string };

const C = { bg: "#070b16", card: "#0e1527", card2: "#121b31", border: "#1f2a44", text: "#e6ebf5", sub: "#8a96b0", green: "#22c55e", red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6", greenBg: "#0f2a1c", amberBg: "#2a210b", redBg: "#2a1111", blueBg: "#0f1d3a" };

const NAMES: Record<string, string> = { NVDA: "NVIDIA", MU: "Micron", NBIS: "Nebius", SPCX: "SpaceX", BE: "Bloom Energy", META: "Meta", CBRS: "Cerebras", RKLB: "Rocket Lab", CRDO: "Credo", CLS: "Celestica", ARKK: "ARK Innovation", VGIT: "Vanguard Orta Vade Hazine", TLT: "iShares 20+ Yıl Hazine", BSV: "Vanguard Kısa Vade Tahvil", GLD: "SPDR Gold", FTGC: "First Trust Emtia", IBIT: "iShares Bitcoin", SOLZ: "Solana ETF", SPMO: "S&P 500 Momentum", QQQ: "Invesco QQQ", VOO: "Vanguard S&P 500" };

// Platformda 28 Eki 08:32 TSİ görünen fiyat ve günlük %
const PX0: Record<string, [number, number]> = { ARKK: [84.78, 3.59], BSV: [76.78, 0.03], CBRS: [119.31, 10.10], CLS: [276.07, 11.93], CRDO: [167.43, 10.77], FTGC: [30.44, -0.49], GLD: [372.28, 1.21], IBIT: [45.70, 1.06], META: [620.19, -1.64], MU: [928.76, 2.77], NBIS: [170.47, 11.22], NVDA: [217.94, 0.90], QQQ: [721.25, 1.27], RKLB: [58.31, 8.34], SOLZ: [10.00, 0.76], SPCX: [148.58, 1.14], SPMO: [142.58, 1.44], TLT: [81.63, -0.06], VGIT: [57.38, -0.02], VOO: [707.52, 0.58], BE: [218.50, 7.15] };
const STAGE0: Record<string, string> = { ARKK: "2", BSV: "4", CBRS: "—", CLS: "3", CRDO: "3", FTGC: "2", GLD: "4", IBIT: "2", META: "3", MU: "2", NBIS: "3", NVDA: "2", QQQ: "2", RKLB: "4", SOLZ: "2", SPCX: "—", SPMO: "3", TLT: "4", VGIT: "4", VOO: "2", BE: "3" };

const RAW: [string, string, number, number][] = [
  ["2026-10-19","VGIT",3,57.72],["2026-10-19","SPMO",2,144.64],["2026-10-19","GLD",1,382.10],["2026-10-19","ARKK",3,83.85],["2026-10-19","TLT",3,80.36],["2026-10-19","BSV",3,77.2667],["2026-10-19","QQQ",2,724.45],["2026-10-19","VOO",3,708.6867],["2026-10-19","FTGC",16,31.2013],["2026-10-19","SOLZ",11,10.5373],
  ["2026-10-20","MU",1,914.31],["2026-10-20","NVDA",4,217.335],["2026-10-20","CBRS",7,122.51],
  ["2026-10-21","SPCX",3,161.55],["2026-10-21","NVDA",1,223.80],["2026-10-21","NBIS",4,172.475],
  ["2026-10-22","NVDA",2,212.44],["2026-10-22","IBIT",10,46.156],["2026-10-22","MU",2,863.18],["2026-10-22","META",1,642.90],["2026-10-22","SPCX",2,145.90],
  ["2026-10-23","RKLB",10,51.61],["2026-10-23","CRDO",4,152.825],["2026-10-23","NVDA",4,213.325],["2026-10-23","NBIS",6,160.7717],["2026-10-23","IBIT",8,46.3925],["2026-10-23","BE",4,193.525],["2026-10-23","BE",4,203.545],
  ["2026-10-27","MU",1,932.65],["2026-10-27","TLT",2,82.65],["2026-10-27","META",1,625.60],["2026-10-27","CLS",4,274.6325],["2026-10-27","VGIT",3,58.07],["2026-10-27","NVDA",3,218.72],["2026-10-27","GLD",2,372.90],["2026-10-27","FTGC",16,30.54],["2026-10-27","ARKK",3,85.34],["2026-10-27","VOO",3,708.7733],["2026-10-27","SPMO",2,143.63],["2026-10-27","BSV",3,77.46],["2026-10-27","QQQ",1,722.50],
];
function initial(): Tx[] {
  const t: Tx[] = [
    { id: 1, date: "2026-10-19", type: "YATIRMA", ticker: "", qty: 0, price: 0, amount: 10000, pocket: "" },
    { id: 2, date: "2026-10-22", type: "YATIRMA", ticker: "", qty: 0, price: 0, amount: 10000, pocket: "" },
    { id: 3, date: "2026-10-22", type: "TEMETTU", ticker: "SOLZ", qty: 0, price: 0, amount: 0.16, pocket: "", note: "SOLZ temettü" },
    { id: 4, date: "2026-10-27", type: "YATIRMA", ticker: "", qty: 0, price: 0, amount: 10000, pocket: "" },
  ];
  RAW.forEach((r, i) => t.push({ id: 10 + i, date: r[0], type: "AL", ticker: r[1], qty: r[2], price: r[3], amount: r[2] * r[3], pocket: "P1 Yatırım" }));
  return t;
}
const KEY = "alanim-v2";
function load<T>(k: string, d: T): T { try { const s = window.localStorage.getItem(k); return s ? (JSON.parse(s) as T) : d; } catch { return d; } }
function save(k: string, v: unknown) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch { /* yok */ } }

const usd = (n: number, d = 2) => (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const sgn = (n: number, d = 2) => (n >= 0 ? "+" : "") + usd(n, d);
const pct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
const col = (n: number) => (n >= 0 ? C.green : C.red);
const TODAY = "2026-10-28";

const sans = "'Geist Variable', ui-sans-serif, system-ui, sans-serif";
const card: CSSProperties = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 };
const lbl: CSSProperties = { fontSize: 11, letterSpacing: "0.08em", color: C.sub, textTransform: "uppercase", fontWeight: 600 };
const inp: CSSProperties = { background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 9px", fontSize: 14, width: "100%", boxSizing: "border-box", fontFamily: sans };
const pill = (fg: string, bg: string): CSSProperties => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: bg, color: fg, fontSize: 11, fontWeight: 600 });
const btn = (fg: string, bg: string, solid = false): CSSProperties => ({ background: solid ? fg : bg, color: solid ? "#06120a" : fg, border: `1px solid ${fg}55`, borderRadius: 10, padding: "9px 14px", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: sans });
const fig: CSSProperties = { fontFamily: sans, fontVariantNumeric: "tabular-nums" };
const stageCol = (s: string) => (s === "2" ? [C.green, C.greenBg] : s === "3" ? [C.amber, C.amberBg] : s === "4" ? [C.red, C.redBg] : [C.sub, C.card2]);

type SortK = "tk" | "st" | "lot" | "avg" | "px" | "val" | "dpl" | "dpp" | "plp" | "pl";

export default function App() {
  useGrokTheme();
  const [txs, setTxs] = useState<Tx[]>(() => load<Tx[]>(KEY + "-tx", initial()));
  const [px, setPx] = useState<Record<string, [number, number]>>(() => load(KEY + "-px", PX0));
  const [stage, setStage] = useState<Record<string, string>>(() => load(KEY + "-st", STAGE0));
  const [sort, setSort] = useState<[SortK, number]>(["val", -1]);
  const [panel, setPanel] = useState<"" | "islem" | "nakit" | "liste" | "sim">("");
  const [period, setPeriod] = useState("All");
  const [showTx, setShowTx] = useState(true);
  const [showF, setShowF] = useState(false);
  // İşlem formu
  const [side, setSide] = useState<"AL" | "SAT">("AL");
  const [fTk, setFTk] = useState(""); const [fPocket, setFPocket] = useState("P1 Yatırım"); const [fOpen, setFOpen] = useState(false);
  const [fQty, setFQty] = useState(""); const [fPx, setFPx] = useState(""); const [fDate, setFDate] = useState(TODAY); const [fWhy, setFWhy] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  // Nakit formu
  const [cType, setCType] = useState<"YATIRMA" | "CEKME" | "DUZELT">("YATIRMA"); const [cAmt, setCAmt] = useState(""); const [cDate, setCDate] = useState(TODAY); const [cNote, setCNote] = useState("");
  const [msg, setMsg] = useState("");
  // Simülatör
  const [simTk, setSimTk] = useState("NVDA"); const [simPct, setSimPct] = useState("-10");
  // Karar günlüğü
  const [journal, setJournal] = useState<{ tk: string; k: string; note: string; d: string }[]>(() => load(KEY + "-j", [] as { tk: string; k: string; note: string; d: string }[]));
  const [jTk, setJTk] = useState(""); const [jK, setJK] = useState("Aldım"); const [jNote, setJNote] = useState("");

  useEffect(() => { save(KEY + "-tx", txs); save(KEY + "-px", px); save(KEY + "-st", stage); save(KEY + "-j", journal); }, [txs, px, stage, journal]);

  const m = useMemo(() => {
    let cash = 0, deposits = 0, divs = 0;
    const pos: Record<string, { qty: number; cost: number; bq: number; bc: number }> = {};
    const flows: { date: string; amt: number }[] = [];
    [...txs].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id).forEach((t) => {
      if (t.type === "YATIRMA") { cash += t.amount; deposits += t.amount; flows.push({ date: t.date, amt: t.amount }); }
      else if (t.type === "CEKME") { cash -= t.amount; deposits -= t.amount; flows.push({ date: t.date, amt: -t.amount }); }
      else if (t.type === "DUZELT" || t.type === "TEMETTU") { cash += t.amount; if (t.type === "TEMETTU") divs += t.amount; flows.push({ date: t.date, amt: t.amount }); }
      else {
        const p = pos[t.ticker] || (pos[t.ticker] = { qty: 0, cost: 0, bq: 0, bc: 0 });
        if (t.type === "AL") { p.qty += t.qty; p.cost += t.amount; p.bq += t.qty; p.bc += t.amount; if (!t.opening) cash -= t.amount; }
        else { const avg = p.bq ? p.bc / p.bq : 0; p.cost -= avg * t.qty; p.qty -= t.qty; cash += t.amount; }
      }
    });
    const rows = Object.entries(pos).filter(([, p]) => p.qty > 1e-9).map(([tk, p]) => {
      const [price, dp] = px[tk] ?? [p.bc / p.bq, 0];
      const prev = price / (1 + dp / 100);
      const avg = p.bc / p.bq;
      const val = p.qty * price, inv = avg * p.qty;
      return { tk, st: stage[tk] ?? "—", lot: p.qty, avg, px: price, val, dpl: p.qty * (price - prev), dpp: dp, pl: val - inv, plp: inv ? ((val - inv) / inv) * 100 : 0, inv, placeholder: !px[tk] };
    });
    const stocks = rows.reduce((s, r) => s + r.val, 0);
    const total = stocks + cash;
    const today = rows.reduce((s, r) => s + r.dpl, 0);
    const yday = total - today;
    const inflow = (from: string) => flows.filter((f) => f.date >= from).reduce((s, f) => s + f.amt, 0);
    const posIn = (from: string) => flows.filter((f) => f.date >= from && f.amt > 0).reduce((s, f) => s + f.amt, 0);
    return { cash, deposits, divs, rows, stocks, total, today, yday, inflow, posIn, inv: rows.reduce((s, r) => s + r.inv, 0) };
  }, [txs, px, stage]);

  const allFix = { pl: m.total - m.deposits, pc: m.deposits > 0 ? ((m.total - m.deposits) / m.deposits) * 100 : 0, inflow: m.deposits };

  const sorted = [...m.rows].sort((a, b) => { const k = sort[0]; const av = a[k], bv = b[k]; return (typeof av === "string" ? String(av).localeCompare(String(bv)) : (av as number) - (bv as number)) * sort[1]; });
  const tot = { val: m.stocks, dpl: m.today, pl: m.stocks - m.inv, inv: m.inv };

  const resetForm = () => { setFTk(""); setFQty(""); setFPx(""); setFWhy(""); setFOpen(false); setEditId(null); setFDate(TODAY); };
  const saveTrade = () => {
    const tk = fTk.trim().toUpperCase(), q = parseFloat(fQty), p = parseFloat(fPx);
    if (!tk || !(q > 0) || !(p > 0)) { setMsg("Hisse, adet ve fiyat gerekli."); return; }
    const held = m.rows.find((r) => r.tk === tk)?.lot ?? 0;
    if (side === "SAT" && editId === null && q > held + 1e-9) { setMsg(`Elde ${held} lot ${tk} var.`); return; }
    const t: Tx = { id: editId ?? Date.now(), date: fDate, type: side, ticker: tk, qty: q, price: p, amount: q * p, pocket: fPocket, opening: side === "AL" && fOpen, note: fWhy };
    setTxs(editId !== null ? txs.map((x) => (x.id === editId ? t : x)) : [...txs, t]);
    if (!px[tk]) setPx({ ...px, [tk]: [p, 0] });
    setMsg(editId !== null ? "İşlem düzeltildi." : "İşlem eklendi."); resetForm(); setPanel("");
  };
  const saveCash = () => {
    const a = parseFloat(cAmt);
    if (isNaN(a) || (cType !== "DUZELT" && !(a > 0))) { setMsg("Tutar girin."); return; }
    const amount = cType === "DUZELT" ? a - m.cash : a; // düzelt: yeni bakiye girilir
    setTxs([...txs, { id: Date.now(), date: cDate, type: cType, ticker: "", qty: 0, price: 0, amount, pocket: "", note: cNote }]);
    setCAmt(""); setCNote(""); setMsg("Nakit işlemi kaydedildi."); setPanel("");
  };
  const editTx = (t: Tx) => { if (t.type !== "AL" && t.type !== "SAT") return; setSide(t.type); setFTk(t.ticker); setFQty(String(t.qty)); setFPx(String(t.price)); setFDate(t.date); setFPocket(t.pocket || "P1 Yatırım"); setFOpen(!!t.opening); setFWhy(t.note ?? ""); setEditId(t.id); setPanel("islem"); };

  const buyCount = txs.filter((t) => t.type === "AL" || t.type === "SAT").length;
  const typeLbl: Record<string, [string, string, string]> = { AL: ["ALIM", C.green, C.greenBg], SAT: ["SATIM", C.red, C.redBg], YATIRMA: ["YATIRMA", C.amber, C.amberBg], CEKME: ["ÇEKME", C.amber, C.amberBg], DUZELT: ["DÜZELTME", C.amber, C.amberBg], TEMETTU: ["TEMETTÜ", C.amber, C.amberBg] };
  const txSorted = [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const fmtD = (d: string) => { const [, mo, da] = d.split("-"); return `${parseInt(da)} ${["", "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"][parseInt(mo)]}`; };

  // Donut (alt portföy: P1 + nakit)
  const parts = [{ l: "P1 Yatırım", v: m.stocks, c: C.green }, { l: "P2 Moonshot", v: 0, c: C.blue }, { l: "P4 Trade", v: 0, c: "#a855f7" }, { l: "Nakit", v: m.cash, c: C.amber }];
  let acc = 0;
  const arcs = parts.filter((p) => p.v > 0).map((p) => { const a0 = (acc / m.total) * Math.PI * 2; acc += p.v; const a1 = (acc / m.total) * Math.PI * 2; const r = 70, cx = 90, cy = 90; const large = a1 - a0 > Math.PI ? 1 : 0; return { c: p.c, d: `M ${cx + r * Math.sin(a0)} ${cy - r * Math.cos(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.sin(a1)} ${cy - r * Math.cos(a1)}` }; });

  const th = (k: SortK, t: string, left = false) => <th key={k} onClick={() => setSort([k, sort[0] === k ? -sort[1] : -1])} style={{ ...lbl, padding: "10px 8px", textAlign: left ? "left" : "right", cursor: "pointer", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{t}{sort[0] === k ? (sort[1] < 0 ? " ▼" : " ▲") : ""}</th>;
  const td: CSSProperties = { padding: "9px 8px", textAlign: "right", borderBottom: `1px solid ${C.border}`, fontSize: 13, whiteSpace: "nowrap" };

  const perfBox = (title: string, p: { pl: number; pc: number; inflow: number }, badge?: ReactNode, extra?: ReactNode) => (
    <div style={card}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}><span style={lbl}>{title}</span>{badge}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: col(p.pl), marginTop: 8, ...fig }}>{sgn(p.pl, 0)} <span style={{ fontSize: 15 }}>{pct(p.pc)}</span></div>
      {extra}
      <div style={{ fontSize: 12, color: C.sub, marginTop: 8 }}>ℹ yatırılan toplam para {usd(p.inflow, 0)} · kâr = güncel toplam − yatırılan</div>
    </div>
  );

  const chartPl = allFix;
  const ath = Math.max(m.deposits, m.total);

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", padding: "24px 18px", fontFamily: sans, boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={{ ...lbl, color: C.blue }}>Haddini Aş · Terminal · Benim Alanım</div>
          <h1 style={{ margin: "6px 0 0", fontSize: 30 }}>Alanım</h1>
          <div style={{ color: C.sub, fontSize: 13, marginTop: 4 }}>Sayfa aracı kuruma canlı bağlı değildir; fiyatlar elle girilir/düzenlenir. Giriş fiyatı = ENBD booked amount ÷ adet.</div>
        </div>

        {/* Özet kutuları */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          <div style={card}>
            <div style={lbl}>Toplam Portföy</div>
            <div style={{ fontSize: 36, fontWeight: 800, marginTop: 6, ...fig }}>{usd(m.total)}</div>
            <div style={{ color: C.sub, fontSize: 13, marginTop: 4 }}>Hisse {usd(m.stocks, 0)} · Opsiyon $0 · Nakit <span style={{ color: C.amber }}>{usd(m.cash)}</span></div>
          </div>
          <div style={{ ...card, background: m.today >= 0 ? C.greenBg : C.redBg, borderColor: col(m.today) + "55" }}>
            <div style={lbl}>Bugün</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: col(m.today), marginTop: 6, ...fig }}>{sgn(m.today)} · {pct((m.today / m.yday) * 100)}</div>
            <div style={{ color: C.sub, fontSize: 13, marginTop: 4 }}>hisse {sgn(m.today)} · opsiyon $0</div>
          </div>
        </div>
        <div style={{ color: C.sub, fontSize: 13 }}>Yatırılan toplam para {usd(m.deposits, 0)} · Dünkü değer (türetilmiş) {usd(m.yday)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {perfBox("Toplam Kâr/Zarar (yatırılan paraya göre)", allFix)}
        </div>

        {/* Butonlar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button style={btn(C.green, C.greenBg, true)} onClick={() => { resetForm(); setPanel(panel === "islem" ? "" : "islem"); }}>➕ İşlem Ekle</button>
          <button style={btn(C.amber, C.amberBg)} onClick={() => setPanel(panel === "nakit" ? "" : "nakit")}>💵 Nakit İşlemi</button>
          <button style={btn(C.blue, C.blueBg)} onClick={() => setPanel(panel === "liste" ? "" : "liste")}>⇄ İşlemlerim ({buyCount})</button>
          <button style={btn(C.red, C.redBg)} onClick={() => setPanel(panel === "sim" ? "" : "sim")}>🧮 Simülatör</button>
          {msg && <span style={{ color: C.sub, fontSize: 13, alignSelf: "center" }}>{msg}</span>}
        </div>

        {panel === "islem" && (
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={btn(C.green, side === "AL" ? C.greenBg : C.card2)} onClick={() => setSide("AL")}>Alış</button>
              <button style={btn(C.red, side === "SAT" ? C.redBg : C.card2)} onClick={() => setSide("SAT")}>Satış</button>
              {editId !== null && <span style={pill(C.amber, C.amberBg)}>düzeltme modu</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <label><div style={lbl}>Hisse</div><input style={inp} value={fTk} placeholder="NVDA" onChange={(e: ChangeEvent<HTMLInputElement>) => setFTk(e.target.value)} /></label>
              <label><div style={lbl}>Adet</div><input style={inp} type="number" value={fQty} onChange={(e: ChangeEvent<HTMLInputElement>) => setFQty(e.target.value)} /></label>
              <label><div style={lbl}>Fiyat</div><input style={inp} type="number" value={fPx} onChange={(e: ChangeEvent<HTMLInputElement>) => setFPx(e.target.value)} /></label>
              <label><div style={lbl}>Tarih</div><input style={inp} value={fDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setFDate(e.target.value)} /></label>
            </div>
            <div><div style={lbl}>Cep</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>{["P1 Yatırım", "P2 Moonshot", "P4 Trade"].map((p) => <button key={p} style={btn(C.blue, fPocket === p ? C.blueBg : C.card2)} onClick={() => setFPocket(p)}>{p}</button>)}</div></div>
            {side === "AL" && <label style={{ fontSize: 13, color: C.sub, display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={fOpen} onChange={(e: ChangeEvent<HTMLInputElement>) => setFOpen(e.target.checked)} /> Bu hisse zaten portföyümde vardı (açılış) — nakitten düşülmez</label>}
            <label><div style={lbl}>Neden?</div><input style={inp} value={fWhy} onChange={(e: ChangeEvent<HTMLInputElement>) => setFWhy(e.target.value)} /></label>
            <div style={{ display: "flex", gap: 8 }}><button style={btn(C.green, C.greenBg, true)} onClick={saveTrade}>Kaydet</button><button style={btn(C.sub, C.card2)} onClick={() => { resetForm(); setPanel(""); }}>Vazgeç</button></div>
          </div>
        )}

        {panel === "nakit" && (
          <div style={{ ...card, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ color: C.sub, fontSize: 13 }}>Defterdeki nakit: <span style={{ color: C.amber, fontWeight: 700 }}>{usd(m.cash)}</span></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {([["YATIRMA", "Para yatırdım"], ["CEKME", "Para çektim"], ["DUZELT", "Bakiyeyi düzelt"]] as [typeof cType, string][]).map(([k, l]) => <button key={k} style={btn(C.amber, cType === k ? C.amberBg : C.card2)} onClick={() => setCType(k)}>{l}</button>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <label><div style={lbl}>{cType === "DUZELT" ? "Yeni bakiye" : "Tutar"}</div><input style={inp} type="number" value={cAmt} onChange={(e: ChangeEvent<HTMLInputElement>) => setCAmt(e.target.value)} /></label>
              <label><div style={lbl}>Tarih</div><input style={inp} value={cDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setCDate(e.target.value)} /></label>
              <label><div style={lbl}>Not</div><input style={inp} value={cNote} onChange={(e: ChangeEvent<HTMLInputElement>) => setCNote(e.target.value)} /></label>
            </div>
            <div><button style={btn(C.amber, C.amberBg)} onClick={saveCash}>Kaydet</button></div>
          </div>
        )}

        {panel === "liste" && (
          <div style={{ ...card, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Tarih", "Tür", "Hisse", "Cep", "Adet", "Fiyat", "Tutar", ""].map((h, i) => <th key={i} style={{ ...lbl, padding: 8, textAlign: i < 4 ? "left" : "right", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
              <tbody>{txSorted.map((t) => { const [l, fg, bg] = typeLbl[t.type]; return (
                <tr key={t.id}>
                  <td style={{ ...td, textAlign: "left" }}>{fmtD(t.date)}</td>
                  <td style={{ ...td, textAlign: "left" }}><span style={pill(fg, bg)}>{l}</span>{t.opening ? <span style={{ ...pill(C.sub, C.card2), marginLeft: 4 }}>açılış</span> : null}</td>
                  <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{t.ticker || "—"}</td>
                  <td style={{ ...td, textAlign: "left", color: C.sub }}>{t.pocket || "Nakit"}</td>
                  <td style={{ ...td, ...fig }}>{t.qty || "—"}</td><td style={{ ...td, ...fig }}>{t.price ? usd(t.price, 4) : "—"}</td>
                  <td style={{ ...td, ...fig }}>{usd(t.amount)}</td>
                  <td style={td}>{(t.type === "AL" || t.type === "SAT") && <button style={{ ...btn(C.blue, C.blueBg), padding: "3px 8px", fontSize: 12 }} onClick={() => editTx(t)}>düzelt</button>} <button style={{ ...btn(C.red, C.redBg), padding: "3px 8px", fontSize: 12 }} onClick={() => setTxs(txs.filter((x) => x.id !== t.id))}>sil</button></td>
                </tr>); })}</tbody>
            </table>
            <div style={{ marginTop: 10 }}><button style={btn(C.sub, C.card2)} onClick={() => { setTxs(initial()); setMsg("Ekstre verisine dönüldü."); }}>Ekstre verisine sıfırla</button></div>
          </div>
        )}

        {panel === "sim" && (() => { const r = m.rows.find((x) => x.tk === simTk.toUpperCase()); const ch = (parseFloat(simPct) || 0) / 100; const d = r ? r.val * ch : 0; return (
          <div style={{ ...card, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            <label><div style={lbl}>Hisse</div><input style={{ ...inp, width: 110 }} value={simTk} onChange={(e: ChangeEvent<HTMLInputElement>) => setSimTk(e.target.value)} /></label>
            <label><div style={lbl}>Fiyat değişimi %</div><input style={{ ...inp, width: 110 }} type="number" value={simPct} onChange={(e: ChangeEvent<HTMLInputElement>) => setSimPct(e.target.value)} /></label>
            <div style={{ fontSize: 14 }}>{r ? <>Pozisyon etkisi <b style={{ color: col(d) }}>{sgn(d)}</b> · yeni toplam {usd(m.total + d)} ({pct((d / m.total) * 100)})</> : <span style={{ color: C.sub }}>Portföyde yok</span>}</div>
          </div>); })()}

        <div style={{ ...lbl, display: "flex", gap: 8, alignItems: "center" }}><span style={pill(C.green, C.greenBg)}>SON KAPANIŞ</span> Fiyatlar: 28 Eki 08:32 TSİ</div>

        {/* Alt portföy dağılımı */}
        <div style={{ ...card, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18, alignItems: "center" }}>
          <div>
            <div style={lbl}>Alt Portföy Dağılımı</div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
              <thead><tr>{["Cep", "Değer", "Pay"].map((h, i) => <th key={h} style={{ ...lbl, padding: 8, textAlign: i ? "right" : "left", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
              <tbody>{parts.map((p) => <tr key={p.l}><td style={{ ...td, textAlign: "left" }}><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 9, background: p.c, marginRight: 8 }} />{p.l}</td><td style={{ ...td, ...fig }}>{usd(p.v)}</td><td style={{ ...td, ...fig }}>{((p.v / m.total) * 100).toFixed(1)}%</td></tr>)}</tbody>
            </table>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 8 }}>Nakit tek havuzdur, ceplere ayrılmaz.</div>
          </div>
          <svg viewBox="0 0 180 180" width="100%" style={{ maxHeight: 220 }}>
            <circle cx={90} cy={90} r={70} fill="none" stroke={C.card2} strokeWidth={22} />
            {arcs.map((a, i) => <path key={i} d={a.d} fill="none" stroke={a.c} strokeWidth={22} />)}
            <text x={90} y={84} textAnchor="middle" fill={C.sub} fontSize={10} fontWeight={600}>TOPLAM</text>
            <text x={90} y={104} textAnchor="middle" fill={C.text} fontSize={18} fontWeight={800} style={fig}>${(m.total / 1000).toFixed(0)}K</text>
          </svg>
        </div>

        {/* Performans grafiği */}
        <div style={card}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Toplam Portföy Performansı</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{["1H", "MTD", "1A", "3A", "YTD", "All"].map((p) => <button key={p} onClick={() => setPeriod(p)} style={{ ...btn(C.blue, period === p ? C.blueBg : C.card2), padding: "4px 10px", fontSize: 12 }}>{p}</button>)}</div>
          </div>
          <svg viewBox="0 0 1200 220" width="100%" style={{ marginTop: 12 }}>
            {[0, 1, 2, 3].map((i) => <line key={i} x1={60} x2={1170} y1={20 + i * 60} y2={20 + i * 60} stroke={C.border} />)}
            {[[32000, 20], [21000, 110], [10000, 200]].map(([v, y]) => <text key={v} x={52} y={y + 4} textAnchor="end" fill={C.sub} fontSize={12} style={fig}>${v / 1000}K</text>)}
            {(() => { const y = (v: number) => 200 - ((v - 10000) / 22000) * 180; const x0 = 60, x1 = 1170; const y0v = m.deposits; return (<>
              <path d={`M ${x0} ${y(y0v)} L ${x1} ${y(m.total)} L ${x1} 200 L ${x0} 200 Z`} fill={C.green} opacity={0.12} />
              <line x1={x0} y1={y(y0v)} x2={x1} y2={y(m.total)} stroke={C.green} strokeWidth={2.5} />
              <circle cx={x0} cy={y(y0v)} r={5} fill={C.green} /><circle cx={x1} cy={y(m.total)} r={5} fill={C.green} />
              <text x={x0 + 8} y={y(y0v) - 10} fill={C.text} fontSize={13} style={fig}>Yatırılan {usd(y0v, 0)}</text>
              <text x={x1 - 8} y={y(m.total) - 12} textAnchor="end" fill={C.text} fontSize={13} style={fig}>28 Eki {usd(m.total, 0)}</text></>); })()}
          </svg>
          <div style={{ fontSize: 12, color: C.sub }}>Çizgi: yatırılan toplam para ile bugünkü toplam değer arasındadır. Ara günler uydurulmadı.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 14 }}>
            {[["Şimdi", usd(m.total), C.text], ["Yatırılan para", usd(m.deposits, 0), C.text], ["Kâr/Zarar (yatırılana göre)", `${sgn(chartPl.pl, 0)} · ${pct(chartPl.pc)}`, col(chartPl.pl)], ["ATH'den uzaklık", pct(((m.total - ath) / ath) * 100), m.total >= ath ? C.green : C.red]].map(([l, v, c]) => (
              <div key={l} style={{ ...card, background: C.card2 }}><div style={lbl}>{l}</div><div style={{ fontSize: 20, fontWeight: 700, color: c, marginTop: 6, ...fig }}>{v}</div></div>))}
          </div>
        </div>

        {/* Son işlemler */}
        <div style={card}>
          <div onClick={() => setShowTx(!showTx)} style={{ cursor: "pointer", fontSize: 17, fontWeight: 700 }}>{showTx ? "▾" : "▸"} Son İşlemler</div>
          {showTx && <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>{txSorted.slice(0, 10).map((t) => { const [l, fg, bg] = typeLbl[t.type]; return (
            <div key={t.id} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.sub, width: 50 }}>{fmtD(t.date)}</span><span style={pill(fg, bg)}>{l}</span>
              <b>{t.ticker}</b>{t.qty ? <span style={fig}>{t.qty} × {usd(t.price, 2)}</span> : null}<span style={{ marginLeft: "auto", ...fig }}>{usd(t.amount)}</span>
            </div>); })}</div>}
        </div>

        {/* P1 Yatırım */}
        <div style={card}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}><span style={{ fontSize: 17, fontWeight: 700 }}>P1 Yatırım</span><span style={pill(C.green, C.greenBg)}>{m.rows.length} pozisyon</span><span style={{ color: C.sub, fontSize: 13, ...fig }}>{usd(m.stocks)}</span></div>
          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{th("tk", "Hisse", true)}{th("st", "Weinstein")}{th("lot", "Lot")}{th("avg", "Ort. Maliyet")}{th("px", "Bugünkü Fiyat")}{th("val", "Poz. Değeri")}{th("dpl", "Günlük K/Z $")}{th("dpp", "Günlük %")}{th("plp", "K/Z %")}{th("pl", "Anlık K/Z $")}</tr></thead>
              <tbody>
                {sorted.map((r) => { const [sf, sb] = stageCol(r.st); return (
                  <tr key={r.tk}>
                    <td style={{ ...td, textAlign: "left" }}><b>{r.tk}</b> <span style={{ color: C.sub, fontSize: 11 }}>{NAMES[r.tk] ?? ""}{r.placeholder ? " · fiyat güncellenmeli" : ""}</span></td>
                    <td style={td}><select value={r.st} onChange={(e: ChangeEvent<HTMLSelectElement>) => setStage({ ...stage, [r.tk]: e.target.value })} style={{ ...pill(sf, sb), border: "none", cursor: "pointer", fontFamily: sans }}>{["—", "1", "2", "3", "4"].map((s) => <option key={s} value={s}>{s === "—" ? "—" : "Evre " + s}</option>)}</select></td>
                    <td style={{ ...td, ...fig }}>{r.lot}</td>
                    <td style={{ ...td, ...fig }}>{usd(r.avg)}</td>
                    <td style={{ ...td, ...fig }}><input type="number" step="0.01" value={String(r.px)} onChange={(e: ChangeEvent<HTMLInputElement>) => { const v = parseFloat(e.target.value); if (!isNaN(v)) { const prev = r.px / (1 + r.dpp / 100); setPx({ ...px, [r.tk]: [v, (v / prev - 1) * 100] }); } }} style={{ ...inp, width: 90, textAlign: "right", padding: "3px 6px" }} /></td>
                    <td style={{ ...td, ...fig }}>{usd(r.val)}</td>
                    <td style={{ ...td, ...fig, color: col(r.dpl) }}>{sgn(r.dpl)}</td>
                    <td style={{ ...td, ...fig, color: col(r.dpp) }}>{pct(r.dpp)}</td>
                    <td style={{ ...td, ...fig, color: col(r.plp) }}>{pct(r.plp)}</td>
                    <td style={{ ...td, ...fig, color: col(r.pl) }}>{sgn(r.pl)}</td>
                  </tr>); })}
                <tr style={{ fontWeight: 700 }}>
                  <td style={{ ...td, textAlign: "left" }}>TOPLAM</td><td style={td} /><td style={td} /><td style={td} /><td style={td} />
                  <td style={{ ...td, ...fig }}>{usd(tot.val)}</td><td style={{ ...td, ...fig, color: col(tot.dpl) }}>{sgn(tot.dpl)}</td><td style={{ ...td, ...fig, color: col(tot.dpl) }}>{pct((tot.dpl / (tot.val - tot.dpl)) * 100)}</td>
                  <td style={{ ...td, ...fig, color: col(tot.pl) }}>{pct((tot.pl / tot.inv) * 100)}</td><td style={{ ...td, ...fig, color: col(tot.pl) }}>{sgn(tot.pl)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 8 }}>Weinstein evreleri platformdan alınan değerdir, elle düzenlenebilir. Nakit tek havuzdur, ceplere ayrılmaz.</div>
        </div>

        {/* Gösterge açıklamaları */}
        <div style={card}>
          <div style={lbl}>Gösterge Açıklamaları</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10, fontSize: 13 }}>
            <span style={pill(C.green, C.greenBg)}>Evre 2 · yükseliş</span><span style={pill(C.amber, C.amberBg)}>Evre 3 · tepe/dağıtım</span><span style={pill(C.red, C.redBg)}>Evre 4 · düşüş</span><span style={pill(C.amber, C.amberBg)}>Nakit</span>
          </div>
          <div onClick={() => setShowF(!showF)} style={{ cursor: "pointer", color: C.blue, marginTop: 12, fontSize: 14 }}>{showF ? "▾" : "▸"} Nasıl hesaplanır? (her sayının formülü)</div>
          {showF && <ul style={{ color: C.sub, fontSize: 13, lineHeight: 1.8, marginTop: 8 }}>
            <li>Pozisyon değeri = lot × fiyat. Toplam portföy = hisse + opsiyon ($0) + nakit.</li>
            <li>Nakit = para girişleri + temettüler − alımlar + satışlar (açılış işaretli alımlar düşülmez).</li>
            <li>Ort. maliyet = Σ(adet × fiyat) ÷ Σ adet (alımlar). Anlık K/Z = poz. değeri − yatırılan.</li>
            <li>Önceki kapanış = fiyat ÷ (1 + günlük %). BUGÜN $ = Σ lot × (fiyat − önceki kapanış); Dünkü değer = toplam − BUGÜN $; BUGÜN % = BUGÜN $ ÷ dünkü değer.</li>
            <li>Toplam Kâr/Zarar = güncel toplam portföy − yatırılan toplam para (para girişleri − çekimler). % = kâr ÷ yatırılan para. Örnek: yatırılan 30.000 $, toplam 30.500 $ ise +500 $, %1,67.</li>
                      </ul>}
        </div>

        {/* Karar günlüğü */}
        <div style={card}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Karar Günlüğü</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}>
            <input style={{ ...inp, width: 110 }} placeholder="Hisse" value={jTk} onChange={(e: ChangeEvent<HTMLInputElement>) => setJTk(e.target.value)} />
            {["Aldım", "Sattım", "İzliyorum"].map((k) => <button key={k} style={{ ...btn(C.blue, jK === k ? C.blueBg : C.card2), padding: "6px 10px" }} onClick={() => setJK(k)}>{k}</button>)}
            <input style={{ ...inp, flex: "1 1 200px", width: "auto" }} placeholder="Not" value={jNote} onChange={(e: ChangeEvent<HTMLInputElement>) => setJNote(e.target.value)} />
            <button style={btn(C.green, C.greenBg, true)} onClick={() => { if (!jTk.trim()) return; setJournal([{ tk: jTk.trim().toUpperCase(), k: jK, note: jNote, d: TODAY }, ...journal]); setJTk(""); setJNote(""); }}>Kaydet</button>
          </div>
          {journal.map((j, i) => <div key={i} style={{ fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}><span style={{ color: C.sub }}>{fmtD(j.d)}</span> · <b>{j.tk}</b> · {j.k} {j.note && `· ${j.note}`}</div>)}
        </div>
      </div>
    </div>
  );
}


