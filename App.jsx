import { useState, useEffect, useCallback, useMemo } from "react";

const TARIFF_RATES = {
  "R-1/450VA": { name: "R-1 / 450 VA (Subsidi)", rate: 415, va: 450, mcb: 2 },
  "R-1/900VA": { name: "R-1 / 900 VA (Subsidi)", rate: 605, va: 900, mcb: 4 },
  "R-1/900VA-RTM": { name: "R-1 / 900 VA (Non-Subsidi)", rate: 1352, va: 900, mcb: 4 },
  "R-1/1300VA": { name: "R-1 / 1300 VA", rate: 1444.70, va: 1300, mcb: 6 },
  "R-1/2200VA": { name: "R-1 / 2200 VA", rate: 1444.70, va: 2200, mcb: 10 },
  "R-2/3500VA": { name: "R-2 / 3500 VA", rate: 1699.53, va: 3500, mcb: 16 },
  "R-2/4400VA": { name: "R-2 / 4400 VA", rate: 1699.53, va: 4400, mcb: 20 },
  "R-2/5500VA": { name: "R-2 / 5500 VA", rate: 1699.53, va: 5500, mcb: 25 },
  "R-3/6600VA+": { name: "R-3 / 6600 VA ke atas", rate: 1699.53, va: 6600, mcb: 32 },
};

const VOLTAGE = 220;

const CATEGORY_COLORS = {
  cooling: "#0EA5E9", kitchen: "#F59E0B", laundry: "#8B5CF6",
  entertainment: "#EC4899", electronics: "#06B6D4", lighting: "#FCD34D",
  bathroom: "#14B8A6", utility: "#6B7280", custom: "#F97316",
};
const CATEGORY_LABELS = {
  cooling: "Pendingin", kitchen: "Dapur", laundry: "Laundry",
  entertainment: "Hiburan", electronics: "Elektronik", lighting: "Pencahayaan",
  bathroom: "Kamar Mandi", utility: "Utilitas", custom: "Lainnya",
};
const CATEGORY_ICONS = {
  cooling: "❄️", kitchen: "🍳", laundry: "👕", entertainment: "📺",
  electronics: "💻", lighting: "💡", bathroom: "🚿", utility: "🔧", custom: "🔌",
};

function formatRupiah(n) { return "Rp " + Math.round(n).toLocaleString("id-ID"); }
function formatKwh(k) { return k < 0.01 ? (k * 1000).toFixed(1) + " Wh" : k.toFixed(2) + " kWh"; }

/* ─── Responsive hook ─── */
function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

/* ─── Persistent Storage via REST API ─── */

async function apiGet(key) {
  try {
    const res = await fetch(`/api/storage/${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.value ?? null;
  } catch { return null; }
}
async function apiSet(key, value) {
  try {
    await fetch(`/api/storage/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
  } catch (e) { console.error("Storage write error:", e); }
}
async function apiDelete(key) {
  try {
    await fetch(`/api/storage/${encodeURIComponent(key)}`, { method: "DELETE" });
  } catch (e) { console.error("Storage delete error:", e); }
}

function useStorage(key, def) {
  const [value, setValue] = useState(def);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await apiGet(key);
      if (!cancelled && raw !== null) { try { setValue(JSON.parse(raw)); } catch {} }
      if (!cancelled) setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [key]);
  const persist = useCallback(async (nv) => {
    setValue((prev) => {
      const v = typeof nv === "function" ? nv(prev) : nv;
      apiSet(key, JSON.stringify(v));
      return v;
    });
  }, [key]);
  return [value, persist, loaded];
}

/* ─── UI Primitives ─── */

function TabButton({ active, onClick, children, badge, isMobile }) {
  return (
    <button onClick={onClick} style={{
      padding: isMobile ? "12px 12px" : "10px 16px",
      border: "none",
      borderBottom: active ? "2px solid #16A34A" : "2px solid transparent",
      background: "transparent",
      color: active ? "#16A34A" : "#94A3B8",
      fontFamily: "'DM Sans',sans-serif",
      fontWeight: active ? 700 : 500,
      fontSize: isMobile ? 12 : 13,
      cursor: "pointer",
      transition: "all .2s",
      display: "flex", alignItems: "center", gap: 5,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>
      {children}
      {badge > 0 && (
        <span style={{ background: "#16A34A", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>{badge}</span>
      )}
    </button>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ background: "#1E293B", borderRadius: 14, padding: 16, border: "1px solid #334155", cursor: onClick ? "pointer" : "default", transition: "all .2s", ...style }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = "#16A34A"; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.borderColor = "#334155"; }}
    >{children}</div>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>{label}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: color || "#F1F5F9", fontFamily: "'Space Mono',monospace", wordBreak: "break-all" }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>{sub}</div>}
        </div>
        {icon && <span style={{ fontSize: 22, opacity: .7, flexShrink: 0, marginLeft: 8 }}>{icon}</span>}
      </div>
    </Card>
  );
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height: 6, background: "#0F172A", borderRadius: 3, flex: 1, minWidth: 0 }}>
      <div style={{ height: "100%", width: pct + "%", background: color || "#16A34A", borderRadius: 3, transition: "width .4s ease" }} />
    </div>
  );
}

function Modal({ open, onClose, title, children, isMobile }) {
  if (!open) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.75)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 16, backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1E293B",
          borderRadius: isMobile ? "20px 20px 0 0" : 16,
          padding: isMobile ? "24px 16px 32px" : 28,
          maxWidth: 520, width: "100%",
          border: "1px solid #334155",
          maxHeight: isMobile ? "92vh" : "85vh",
          overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontFamily: "'Space Mono',monospace", fontSize: 15, color: "#F1F5F9" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "#334155", border: "none", color: "#94A3B8", width: 36, height: 36, borderRadius: 10, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", suffix, placeholder, min, step }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} min={min} step={step}
          style={{ width: "100%", padding: "11px 14px", background: "#0F172A", border: "1px solid #334155", borderRadius: 10, color: "#F1F5F9", fontFamily: "'DM Sans',sans-serif", fontSize: 15, outline: "none" }}
          onFocus={e => e.target.style.borderColor = "#16A34A"}
          onBlur={e => e.target.style.borderColor = "#334155"}
        />
        {suffix && <span style={{ fontSize: 13, color: "#64748B", whiteSpace: "nowrap", fontWeight: 600 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>{label}</label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "11px 14px", background: "#0F172A", border: "1px solid #334155", borderRadius: 10, color: "#F1F5F9", fontFamily: "'DM Sans',sans-serif", fontSize: 15, outline: "none", cursor: "pointer" }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", style: s, disabled }) {
  const base = { padding: "11px 20px", border: "none", borderRadius: 10, fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer", transition: "all .2s", opacity: disabled ? .5 : 1 };
  const v = {
    primary: { background: "#16A34A", color: "#fff" },
    secondary: { background: "#334155", color: "#CBD5E1" },
    danger: { background: "#DC2626", color: "#fff" },
    ghost: { background: "transparent", color: "#94A3B8", padding: "8px 12px" },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...v[variant], ...s }}>{children}</button>;
}

const catOpts = Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: `${CATEGORY_ICONS[v]} ${l}` }));

/* ─── Dashboard Charts ─── */

function CategoryBreakdown({ devices, rate, isMobile }) {
  const cats = {};
  devices.forEach(d => {
    const c = d.category || "custom";
    if (!cats[c]) cats[c] = 0;
    cats[c] += (d.watt * d.hoursPerDay * 30 * (d.qty || 1)) / 1000 * rate;
  });
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const mx = sorted[0]?.[1] || 1;
  if (!sorted.length) return <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: 20 }}>Belum ada perangkat</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sorted.map(([c, cost]) => (
        <div key={c}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: CATEGORY_COLORS[c], fontWeight: 700 }}>{CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}</span>
            <span style={{ fontSize: 12, color: "#CBD5E1", fontFamily: "'Space Mono',monospace" }}>{formatRupiah(cost)}</span>
          </div>
          <MiniBar value={cost} max={mx} color={CATEGORY_COLORS[c]} />
        </div>
      ))}
    </div>
  );
}

function TopConsumers({ devices, rate }) {
  const sorted = [...devices].sort((a, b) => (b.watt * b.hoursPerDay * (b.qty || 1)) - (a.watt * a.hoursPerDay * (a.qty || 1))).slice(0, 5);
  const mx = sorted[0] ? sorted[0].watt * sorted[0].hoursPerDay * (sorted[0].qty || 1) * 30 / 1000 : 1;
  if (!sorted.length) return <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: 20 }}>Belum ada perangkat</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sorted.map((d, i) => {
        const kwh = d.watt * d.hoursPerDay * (d.qty || 1) * 30 / 1000;
        const c = d.category || "custom";
        return (
          <div key={d.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: i === 0 ? "#EF4444" : i < 3 ? "#F59E0B" : "#475569", width: 20, textAlign: "center", fontWeight: 800, flexShrink: 0 }}>#{i + 1}</span>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{CATEGORY_ICONS[c]}</span>
              <span style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
              <span style={{ fontSize: 11, color: "#16A34A", fontFamily: "'Space Mono',monospace", flexShrink: 0 }}>{formatRupiah(kwh * rate)}/bln</span>
            </div>
            <div style={{ paddingLeft: 28 }}>
              <MiniBar value={kwh} max={mx} color={CATEGORY_COLORS[c]} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Simulation ─── */

function SimulationTab({ selectedTariff, simDevices, setSimDevices, pfEnabled, setPfEnabled, pfValue, setPfValue, isMobile }) {
  const [sn, setSn] = useState("");
  const [sw, setSw] = useState("");
  const [sq, setSq] = useState("1");
  const [pfInput, setPfInput] = useState(String(pfValue));

  const tariff = TARIFF_RATES[selectedTariff];
  const maxVA = tariff?.va || 1300;
  const mcbAmp = tariff?.mcb || 6;

  // Clamp PF to valid range 0.01–1.00
  const PF = Math.min(1, Math.max(0.01, parseFloat(pfValue) || 0.85));
  const maxWattPF = maxVA * PF;

  const totalW = simDevices.reduce((s, d) => d.on ? s + d.watt * (d.qty || 1) : s, 0);
  const totalAmp = totalW / VOLTAGE;

  const ampPct = mcbAmp > 0 ? (totalAmp / mcbAmp) * 100 : 0;
  const ampOver = totalAmp > mcbAmp;
  const ampWarn = ampPct > 75 && !ampOver;
  const ampColor = ampOver ? "#EF4444" : ampWarn ? "#F59E0B" : "#16A34A";

  const wattPct = maxWattPF > 0 ? (totalW / maxWattPF) * 100 : 0;
  const wattOver = totalW > maxWattPF;
  const wattWarn = wattPct > 75 && !wattOver;
  const wattColor = wattOver ? "#EF4444" : wattWarn ? "#F59E0B" : "#16A34A";

  // Status is based on Ampere always; PF only when enabled
  const anyOver = ampOver || (pfEnabled && wattOver);
  const anyWarn = (ampWarn || (pfEnabled && wattWarn)) && !anyOver;
  const statusColor = anyOver ? "#EF4444" : anyWarn ? "#F59E0B" : "#16A34A";

  function addSim() {
    if (!sn || !sw) return;
    setSimDevices(p => [...p, { id: Date.now() + Math.random(), name: sn, watt: parseFloat(sw), qty: parseInt(sq) || 1, on: true }]);
    setSn(""); setSw(""); setSq("1");
  }

  function handlePfInput(val) {
    setPfInput(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0 && n <= 1) setPfValue(n);
  }

  const suggestedUpgrade = Object.values(TARIFF_RATES).find(t =>
    t.mcb > totalAmp && (!pfEnabled || t.va * PF > totalW)
  );

  // Common PF presets
  const PF_PRESETS = [
    { label: "Resistif (1.0)", value: 1.0, hint: "Setrika, Pemanas, Lampu pijar" },
    { label: "LED (0.95)", value: 0.95, hint: "Lampu LED, charger" },
    { label: "Motor kecil (0.85)", value: 0.85, hint: "Default umum" },
    { label: "AC/Kulkas (0.75)", value: 0.75, hint: "Kompresor, motor besar" },
    { label: "Motor tua (0.6)", value: 0.6, hint: "Mesin cuci lama, pompa" },
  ];

  function Toggle({ enabled, onToggle, size = "normal" }) {
    const w = size === "small" ? 36 : 44;
    const h = size === "small" ? 20 : 26;
    const knob = size === "small" ? 14 : 20;
    const top = size === "small" ? 3 : 3;
    const onLeft = size === "small" ? 19 : 21;
    return (
      <button
        onClick={onToggle}
        style={{ width: w, height: h, borderRadius: h / 2, border: "none", cursor: "pointer", background: enabled ? "#16A34A" : "#334155", position: "relative", transition: "background .2s", flexShrink: 0 }}
      >
        <div style={{ width: knob, height: knob, borderRadius: knob / 2, background: "#fff", position: "absolute", top, left: enabled ? onLeft : 3, transition: "left .2s" }} />
      </button>
    );
  }

  function GaugeBar({ label, current, max, unit, pct, color, icon, dimmed }) {
    const isOver = current > max;
    const isWarn = pct > 75 && !isOver;
    return (
      <div style={{ marginBottom: 14, opacity: dimmed ? 0.35 : 1, transition: "opacity .3s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>{icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: dimmed ? "#475569" : "#CBD5E1", textTransform: "uppercase", letterSpacing: .5 }}>{label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, fontFamily: "'Space Mono',monospace", color: dimmed ? "#475569" : color }}>
              {typeof current === "number" && current % 1 !== 0 ? current.toFixed(1) : current}{unit}
            </span>
            <span style={{ fontSize: 11, color: "#475569" }}>/ {typeof max === "number" ? max.toFixed(0) : max}{unit}</span>
            {!dimmed && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: color + "22", color }}>{Math.min(pct, 199).toFixed(0)}%</span>}
          </div>
        </div>
        <div style={{ height: 22, background: "#0F172A", borderRadius: 11, overflow: "hidden", position: "relative" }}>
          <div style={{
            height: "100%", width: dimmed ? 0 : Math.min(pct, 100) + "%",
            background: isOver
              ? "repeating-linear-gradient(45deg,#EF4444,#EF4444 8px,#DC2626 8px,#DC2626 16px)"
              : isWarn ? "linear-gradient(90deg,#16A34A,#F59E0B)"
              : "linear-gradient(90deg,#16A34A,#22C55E)",
            borderRadius: 11, transition: "width .5s ease",
          }} />
          {!dimmed && <div style={{ position: "absolute", left: "80%", top: 0, bottom: 0, width: 2, background: "#F59E0B66" }} />}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Gauge Card */}
      <Card style={{ marginBottom: 14, border: `1px solid ${statusColor}44` }}>
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 2 }}>Kapasitas Listrik</div>
            <div style={{ fontSize: 13, color: "#CBD5E1" }}>
              {tariff?.name} — MCB <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{mcbAmp}A</span> · <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{maxVA} VA</span>
            </div>
          </div>
        </div>

        {/* Ampere gauge — always shown */}
        <GaugeBar label="Arus (Ampere)" icon="⚡" current={totalAmp} max={mcbAmp} unit="A" pct={ampPct} color={ampColor} dimmed={false} />

        {/* PF gauge — header with toggle */}
        <div style={{ borderTop: "1px solid #1E293B", paddingTop: 14, marginTop: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: pfEnabled ? 12 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>🔌</span>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: pfEnabled ? "#CBD5E1" : "#475569", textTransform: "uppercase", letterSpacing: .5 }}>Daya (Power Factor)</span>
                <span style={{ fontSize: 10, color: "#475569", marginLeft: 8 }}>— opsional</span>
              </div>
            </div>
            <Toggle enabled={pfEnabled} onToggle={() => setPfEnabled(v => !v)} />
          </div>

          {/* PF settings panel — visible when enabled */}
          {pfEnabled && (
            <div style={{ background: "#0F172A", borderRadius: 10, padding: 14, marginBottom: 14, border: "1px solid #334155" }}>
              {/* Manual PF input */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Nilai Power Factor</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="number" value={pfInput} min="0.01" max="1" step="0.01"
                    onChange={e => handlePfInput(e.target.value)}
                    style={{ width: 90, padding: "8px 12px", background: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#F1F5F9", fontFamily: "'Space Mono',monospace", fontSize: 16, fontWeight: 700, outline: "none", textAlign: "center" }}
                    onFocus={e => e.target.style.borderColor = "#16A34A"}
                    onBlur={e => { e.target.style.borderColor = "#334155"; setPfInput(String(PF)); }}
                  />
                  <div style={{ flex: 1 }}>
                    <input
                      type="range" min="0.01" max="1" step="0.01" value={PF}
                      onChange={e => { const v = parseFloat(e.target.value); setPfValue(v); setPfInput(String(v)); }}
                      style={{ width: "100%", accentColor: "#16A34A", cursor: "pointer" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", marginTop: 2 }}>
                      <span>0.01</span><span style={{ color: "#94A3B8", fontWeight: 700 }}>PF = {PF.toFixed(2)}</span><span>1.00</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Presets */}
              <div>
                <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Preset Umum</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {PF_PRESETS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => { setPfValue(p.value); setPfInput(String(p.value)); }}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: Math.abs(PF - p.value) < 0.001 ? "#16A34A22" : "#1E293B",
                        borderLeft: Math.abs(PF - p.value) < 0.001 ? "3px solid #16A34A" : "3px solid transparent",
                        transition: "all .15s",
                      }}
                    >
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: Math.abs(PF - p.value) < 0.001 ? "#22C55E" : "#CBD5E1" }}>{p.label}</div>
                        <div style={{ fontSize: 10, color: "#64748B" }}>{p.hint}</div>
                      </div>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 800, color: Math.abs(PF - p.value) < 0.001 ? "#22C55E" : "#475569" }}>
                        {(maxVA * p.value).toFixed(0)}W
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PF gauge bar — shown when enabled */}
          {pfEnabled && (
            <GaugeBar
              label={`Daya efektif (PF ${PF.toFixed(2)})`} icon="🔌"
              current={totalW} max={maxWattPF} unit="W"
              pct={wattPct} color={wattColor} dimmed={false}
            />
          )}

          {/* Disabled placeholder */}
          {!pfEnabled && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "#0F172A", border: "1px dashed #334155", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "#475569" }}>Bar Power Factor dinonaktifkan — aktifkan toggle untuk menggunakan kalkulasi PF</span>
            </div>
          )}
        </div>

        {/* Status badge */}
        <div style={{ marginTop: 14, background: anyOver ? "#7F1D1D" : anyWarn ? "#78350F" : "#14532D", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: statusColor }}>
            {anyOver ? "⚠️ OVERCAPACITY!" : anyWarn ? "⚡ Mendekati Batas" : "✅ Aman"}
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: ampColor, fontWeight: 700 }}>{totalAmp.toFixed(1)}A/{mcbAmp}A</span>
            {pfEnabled && <>
              <span style={{ color: "#334155" }}>|</span>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: wattColor, fontWeight: 700 }}>{totalW}W/{maxWattPF.toFixed(0)}W</span>
            </>}
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: pfEnabled ? "1fr 1fr" : "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Card style={{ background: "#0F172A" }}>
          <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>Total Beban</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#F59E0B", fontFamily: "'Space Mono',monospace" }}>{totalW.toLocaleString("id-ID")}W</div>
          <div style={{ fontSize: 11, color: "#06B6D4", fontFamily: "'Space Mono',monospace" }}>{totalAmp.toFixed(1)}A</div>
        </Card>
        <Card style={{ background: "#0F172A" }}>
          <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>Sisa Ampere</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: ampOver ? "#EF4444" : "#16A34A", fontFamily: "'Space Mono',monospace" }}>
            {ampOver ? "-" : ""}{Math.abs(mcbAmp - totalAmp).toFixed(1)}A
          </div>
          <div style={{ fontSize: 11, color: "#64748B" }}>{ampOver ? "Kelebihan!" : "Tersedia"}</div>
        </Card>
        {pfEnabled && <>
          <Card style={{ background: "#0F172A" }}>
            <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>Sisa Watt (PF {PF.toFixed(2)})</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: wattOver ? "#EF4444" : "#16A34A", fontFamily: "'Space Mono',monospace" }}>
              {wattOver ? "-" : ""}{Math.abs(maxWattPF - totalW).toFixed(0)}W
            </div>
            <div style={{ fontSize: 11, color: "#64748B" }}>{wattOver ? "Kelebihan!" : "Tersedia"}</div>
          </Card>
          <Card style={{ background: "#0F172A" }}>
            <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>Kapasitas Efektif</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#8B5CF6", fontFamily: "'Space Mono',monospace" }}>{maxWattPF.toFixed(0)}W</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>{maxVA}VA × PF {PF.toFixed(2)}</div>
          </Card>
        </>}
        <Card style={{ background: "#0F172A", gridColumn: pfEnabled ? "auto" : "auto" }}>
          <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>Perangkat</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#06B6D4", fontFamily: "'Space Mono',monospace" }}>
            {simDevices.filter(d => d.on).length}<span style={{ fontSize: 13, color: "#475569" }}>/{simDevices.length}</span>
          </div>
          <div style={{ fontSize: 11, color: "#64748B" }}>aktif / total</div>
        </Card>
      </div>

      {/* Add device — stacks on mobile */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginBottom: 12, textTransform: "uppercase", letterSpacing: .5 }}>Tambah Perangkat Simulasi</div>
        {isMobile ? (
          <div>
            <InputField label="Nama" value={sn} onChange={setSn} placeholder="Contoh: Kompor Induksi" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InputField label="Watt" value={sw} onChange={setSw} type="number" suffix="W" />
              <InputField label="Unit" value={sq} onChange={setSq} type="number" min="1" />
            </div>
            <Btn onClick={addSim} disabled={!sn || !sw} style={{ width: "100%" }}>+ Tambah</Btn>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr .7fr auto", gap: 10, alignItems: "end" }}>
            <InputField label="Nama" value={sn} onChange={setSn} placeholder="Contoh: Kompor Induksi" />
            <InputField label="Watt" value={sw} onChange={setSw} type="number" suffix="W" />
            <InputField label="Unit" value={sq} onChange={setSq} type="number" min="1" />
            <div style={{ marginBottom: 14 }}><Btn onClick={addSim} disabled={!sn || !sw}>+ Tambah</Btn></div>
          </div>
        )}

        {simDevices.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {simDevices.map(d => {
              const dAmp = (d.watt * (d.qty || 1)) / VOLTAGE;
              return (
                <div key={d.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                  background: d.on ? "#16A34A11" : "#0F172A", borderRadius: 10,
                  border: `1px solid ${d.on ? "#16A34A33" : "#1E293B"}`, transition: "all .2s",
                }}>
                  {/* Toggle */}
                  <button
                    onClick={() => setSimDevices(p => p.map(x => x.id === d.id ? { ...x, on: !x.on } : x))}
                    style={{ width: 44, height: 26, borderRadius: 13, border: "none", cursor: "pointer", background: d.on ? "#16A34A" : "#334155", position: "relative", transition: "background .2s", flexShrink: 0 }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 3, left: d.on ? 21 : 3, transition: "left .2s" }} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: d.on ? "#E2E8F0" : "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.name}{(d.qty || 1) > 1 && <span style={{ fontSize: 11, color: "#64748B", marginLeft: 5 }}>×{d.qty}</span>}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", color: d.on ? "#06B6D4" : "#475569" }}>{dAmp.toFixed(1)}A</div>
                  </div>
                  <span style={{ fontSize: 13, fontFamily: "'Space Mono',monospace", color: d.on ? "#F59E0B" : "#475569", flexShrink: 0 }}>
                    {(d.watt * (d.qty || 1)).toLocaleString("id-ID")}W
                  </span>
                  <button
                    onClick={() => setSimDevices(p => p.filter(x => x.id !== d.id))}
                    style={{ background: "#334155", border: "none", color: "#94A3B8", width: 34, height: 34, borderRadius: 8, cursor: "pointer", fontSize: 14, flexShrink: 0 }}
                  >🗑</button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#475569", fontSize: 13 }}>Tambahkan perangkat untuk simulasi beban listrik</div>
        )}
      </Card>

      {/* Info */}
      <Card style={{ background: anyOver ? "#7F1D1D22" : "#0F172A", border: `1px solid ${anyOver ? "#EF444444" : "#334155"}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: anyOver ? "#FCA5A5" : "#94A3B8", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>
          {anyOver ? "🔴 Rekomendasi" : "💡 Mengapa 2 Bar?"}
        </div>
        {anyOver ? (
          <div style={{ fontSize: 13, color: "#FCA5A5", lineHeight: 1.7 }}>
            {ampOver && <div style={{ marginBottom: 8 }}><span style={{ fontWeight: 700 }}>⚡ Arus:</span> Total <strong>{totalAmp.toFixed(1)}A</strong> melebihi MCB <strong>{mcbAmp}A</strong>. MCB akan <strong>trip</strong>.</div>}
            {wattOver && <div style={{ marginBottom: 8 }}><span style={{ fontWeight: 700 }}>🔌 Daya:</span> Total <strong>{totalW.toLocaleString("id-ID")}W</strong> melebihi kapasitas efektif <strong>{maxWattPF.toFixed(0)}W</strong> (PF {PF}).</div>}
            <div style={{ marginTop: 10, padding: "12px 14px", background: "#7F1D1D44", borderRadius: 10, border: "1px solid #EF444433", fontSize: 12, lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Solusi:</div>
              • Matikan beberapa perangkat berdaya besar<br />
              • Hindari AC + setrika + kompor induksi bersamaan<br />
              • Toggle OFF untuk cek kombinasi aman<br />
              {suggestedUpgrade && <>• Upgrade ke <strong>{suggestedUpgrade.name} (MCB {suggestedUpgrade.mcb}A)</strong></>}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.8 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
              <span style={{ flexShrink: 0 }}>⚡</span>
              <div><strong style={{ color: "#06B6D4" }}>Bar Ampere</strong> — Arus aktual (Watt ÷ {VOLTAGE}V). MCB trip jika >{mcbAmp}A.</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ flexShrink: 0 }}>🔌</span>
              <div><strong style={{ color: "#F59E0B" }}>Bar Daya (PF {PF})</strong> — {maxVA} VA ≈ <strong>{maxWattPF.toFixed(0)}W</strong> daya nyata.</div>
            </div>
            <div style={{ marginTop: 10, padding: "10px 12px", background: "#334155", borderRadius: 8, fontSize: 12, color: "#CBD5E1" }}>
              💡 Bar Watt (PF) biasanya penuh duluan.
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ─── Usage Analysis ─── */

function UsageAnalysis({ logs, rate, onDelete }) {
  if (!logs.length) return (
    <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: 30 }}>
      Belum ada data aktivitas. Tambahkan aktivitas untuk mulai analisis.
    </div>
  );

  const activities = logs.map(log => {
    const kwhPerUse = (log.watt * log.durationMin) / 60000;
    const costPerUse = kwhPerUse * rate;
    return { ...log, kwhPerUse, costPerUse };
  });
  const byExpensive = [...activities].sort((a, b) => b.costPerUse - a.costPerUse);
  const byCheapest = [...activities].sort((a, b) => a.costPerUse - b.costPerUse);
  const maxCost = byExpensive[0]?.costPerUse || 1;
  const catTotals = {};
  activities.forEach(a => {
    const c = a.category || "custom";
    if (!catTotals[c]) catTotals[c] = { count: 0, totalCost: 0, totalKwh: 0 };
    catTotals[c].count += a.count;
    catTotals[c].totalCost += a.costPerUse * a.count;
    catTotals[c].totalKwh += a.kwhPerUse * a.count;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginBottom: 14, textTransform: "uppercase", letterSpacing: .5 }}>⚡ Ranking Biaya per Aktivitas</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {byExpensive.map((a, i) => {
            const c = a.category || "custom";
            return (
              <div key={a.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: i === 0 ? "#EF4444" : i < 3 ? "#F59E0B" : "#475569", width: 22, textAlign: "center", fontWeight: 800, flexShrink: 0 }}>#{i + 1}</span>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{CATEGORY_ICONS[c]}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? "#EF4444" : "#FCD34D", fontFamily: "'Space Mono',monospace", flexShrink: 0 }}>{formatRupiah(a.costPerUse)}</span>
                </div>
                <div style={{ paddingLeft: 30 }}>
                  <MiniBar value={a.costPerUse} max={maxCost} color={i === 0 ? "#EF4444" : i < 3 ? "#F59E0B" : CATEGORY_COLORS[c]} />
                  <div style={{ fontSize: 10, color: "#64748B", marginTop: 3 }}>{a.watt}W · {a.durationMin}mnt · {formatKwh(a.kwhPerUse)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {byCheapest.length >= 2 && (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>🏆 Paling Hemat</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#14532D33", borderRadius: 10, border: "1px solid #16A34A33" }}>
            <span style={{ fontSize: 26 }}>{CATEGORY_ICONS[byCheapest[0].category || "custom"]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#22C55E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{byCheapest[0].name}</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>{byCheapest[0].watt}W · {byCheapest[0].durationMin} menit</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#16A34A", fontFamily: "'Space Mono',monospace" }}>{formatRupiah(byCheapest[0].costPerUse)}</div>
              <div style={{ fontSize: 10, color: "#64748B" }}>per penggunaan</div>
            </div>
          </div>
        </Card>
      )}

      {Object.keys(catTotals).length > 1 && (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginBottom: 12, textTransform: "uppercase", letterSpacing: .5 }}>📊 Ringkasan per Kategori</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(catTotals).sort((a, b) => b[1].totalCost - a[1].totalCost).map(([c, data]) => (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#0F172A", borderRadius: 8 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{CATEGORY_ICONS[c]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: CATEGORY_COLORS[c] }}>{CATEGORY_LABELS[c]}</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>{data.count} kali · {formatKwh(data.totalKwh)}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#FCD34D", fontFamily: "'Space Mono',monospace", flexShrink: 0 }}>{formatRupiah(data.totalCost)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginBottom: 12, textTransform: "uppercase", letterSpacing: .5 }}>📋 Semua Aktivitas</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...logs].sort((a, b) => b.timestamp - a.timestamp).map(log => {
            const kwh = (log.watt * log.durationMin) / 60000;
            const cost = kwh * rate;
            const c = log.category || "custom";
            return (
              <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", background: "#0F172A", borderRadius: 10, border: "1px solid #1E293B" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{CATEGORY_ICONS[c]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{log.name}</span>
                    <span style={{ fontSize: 10, color: "#64748B" }}>×{log.count}</span>
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: CATEGORY_COLORS[c] + "22", color: CATEGORY_COLORS[c], fontWeight: 700 }}>{CATEGORY_LABELS[c]}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{log.watt}W · {log.durationMin}mnt · {formatRupiah(cost)}/kali</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontFamily: "'Space Mono',monospace", color: "#FCD34D" }}>{formatRupiah(cost * log.count)}</div>
                  <div style={{ fontSize: 10, color: "#64748B" }}>total</div>
                </div>
                <button
                  onClick={() => onDelete(log.id)}
                  style={{ background: "#334155", border: "none", color: "#94A3B8", width: 34, height: 34, borderRadius: 8, cursor: "pointer", fontSize: 14, flexShrink: 0 }}
                >🗑</button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════ MAIN ═══════════ */

export default function ElectricityMonitor() {
  const width = useWindowWidth();
  const isMobile = width < 640;

  const [devices, setDevices, d1] = useStorage("elmon:devices", []);
  const [usageLogs, setUsageLogs, d2] = useStorage("elmon:usage-logs", []);
  const [selectedTariff, setSelectedTariff, d3] = useStorage("elmon:tariff", "R-1/1300VA");
  const [simDevices, setSimDevices, d4] = useStorage("elmon:sim-devices", []);
  const [pfEnabled, setPfEnabled, d5] = useStorage("elmon:pf-enabled", false);
  const [pfValue, setPfValue, d6] = useStorage("elmon:pf-value", 0.85);

  const [tab, setTab] = useState("dashboard");
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [addUsageOpen, setAddUsageOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [fn, setFn] = useState(""); const [fw, setFw] = useState(""); const [fh, setFh] = useState("");
  const [fq, setFq] = useState("1"); const [fc, setFc] = useState("custom");
  const [un, setUn] = useState(""); const [uw, setUw] = useState(""); const [ud, setUd] = useState("");
  const [uc, setUc] = useState("1"); const [ucat, setUcat] = useState("custom");

  const loaded = d1 && d2 && d3 && d4 && d5 && d6;
  const rate = TARIFF_RATES[selectedTariff]?.rate || 1444.70;

  const totalKwh = useMemo(() => devices.reduce((s, d) => s + (d.watt * d.hoursPerDay * 30 * (d.qty || 1)) / 1000, 0), [devices]);
  const totalCost = totalKwh * rate;
  const logsCost = useMemo(() => usageLogs.reduce((s, l) => s + ((l.watt * l.durationMin * l.count) / 60000) * rate, 0), [usageLogs, rate]);

  function resetDF() { setFn(""); setFw(""); setFh(""); setFq("1"); setFc("custom"); }

  function saveDevice() {
    if (!fn || !fw || !fh) return;
    if (editDevice) {
      setDevices(p => p.map(d => d.id === editDevice.id ? { ...d, name: fn, watt: parseFloat(fw), hoursPerDay: parseFloat(fh), qty: parseInt(fq) || 1, category: fc } : d));
      setEditDevice(null);
    } else {
      setDevices(p => [...p, { id: Date.now() + Math.random(), name: fn, watt: parseFloat(fw), hoursPerDay: parseFloat(fh), qty: parseInt(fq) || 1, category: fc }]);
    }
    resetDF(); setAddDeviceOpen(false);
  }

  function openEdit(d) {
    setFn(d.name); setFw(String(d.watt)); setFh(String(d.hoursPerDay)); setFq(String(d.qty || 1)); setFc(d.category || "custom");
    setEditDevice(d); setAddDeviceOpen(true);
  }

  function saveUsage() {
    if (!un || !uw || !ud) return;
    setUsageLogs(p => [...p, { id: Date.now() + Math.random(), name: un, watt: parseFloat(uw), durationMin: parseFloat(ud), count: parseInt(uc) || 1, category: ucat, timestamp: Date.now() }]);
    setUn(""); setUw(""); setUd(""); setUc("1"); setUcat("custom");
    setAddUsageOpen(false);
  }

  async function clearAll() {
    if (!confirm("Hapus semua data?")) return;
    await apiDelete("elmon:devices");
    await apiDelete("elmon:usage-logs");
    await apiDelete("elmon:tariff");
    await apiDelete("elmon:sim-devices");
    await apiDelete("elmon:pf-enabled");
    await apiDelete("elmon:pf-value");
    setDevices([]); setUsageLogs([]); setSimDevices([]); setSelectedTariff("R-1/1300VA");
    setPfEnabled(false); setPfValue(0.85);
  }

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <div style={{ color: "#16A34A", fontWeight: 700 }}>Memuat data...</div>
      </div>
    </div>
  );

  const pad = isMobile ? 12 : 20;

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", fontFamily: "'DM Sans',sans-serif", color: "#E2E8F0" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0F172A,#1a2744)", borderBottom: "1px solid #1E293B", padding: `14px ${pad}px`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: isMobile ? 14 : 16, color: "#16A34A" }}>PLN Monitor</div>
              <div style={{ fontSize: 10, color: "#475569" }}>{TARIFF_RATES[selectedTariff]?.name}</div>
            </div>
          </div>
          <Btn variant="ghost" onClick={() => setSettingsOpen(true)}>⚙️</Btn>
        </div>
      </div>

      {/* Tabs — full width scroll on mobile */}
      <div style={{ borderBottom: "1px solid #1E293B", background: "#0F172A", position: "sticky", top: isMobile ? 57 : 63, zIndex: 99 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", overflowX: "auto", padding: `0 ${isMobile ? 4 : 16}px`, scrollbarWidth: "none" }}>
          {[
            { key: "dashboard", label: "📊 Dashboard", badge: 0 },
            { key: "devices", label: "🔌 Perangkat", badge: devices.length },
            { key: "usage", label: "📝 Analisis", badge: usageLogs.length },
            { key: "simulation", label: "🧪 Simulasi", badge: 0 },
          ].map(t => (
            <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)} badge={t.badge} isMobile={isMobile}>
              {t.label}
            </TabButton>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: `${pad}px ${pad}px ${isMobile ? 80 : pad}px` }}>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <StatCard label="Estimasi Bulanan" value={formatRupiah(totalCost)} sub={`${totalKwh.toFixed(1)} kWh`} color="#16A34A" icon="💰" />
              <StatCard label="Estimasi Harian" value={formatRupiah(totalCost / 30)} sub={`${(totalKwh / 30).toFixed(1)} kWh`} color="#0EA5E9" icon="📅" />
              <StatCard label="Tarif/kWh" value={formatRupiah(rate)} sub="per kWh" color="#FCD34D" icon="⚡" />
              <StatCard label="Aktivitas" value={formatRupiah(logsCost)} sub={`${usageLogs.length} aktivitas`} color="#F59E0B" icon="📝" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Card>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginBottom: 14, textTransform: "uppercase", letterSpacing: .5 }}>Biaya per Kategori</div>
                <CategoryBreakdown devices={devices} rate={rate} isMobile={isMobile} />
              </Card>
              <Card>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginBottom: 14, textTransform: "uppercase", letterSpacing: .5 }}>Top 5 Pemakan Listrik</div>
                <TopConsumers devices={devices} rate={rate} />
              </Card>
            </div>
            {!devices.length && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#475569" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Belum ada perangkat</div>
                <div style={{ fontSize: 13, marginBottom: 16 }}>Mulai tambahkan perangkat elektronik rumah Anda</div>
                <Btn onClick={() => setTab("devices")}>+ Tambah Perangkat</Btn>
              </div>
            )}
          </div>
        )}

        {/* DEVICES */}
        {tab === "devices" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#64748B" }}>{devices.length} perangkat</div>
              <Btn onClick={() => { resetDF(); setEditDevice(null); setAddDeviceOpen(true); }}>+ Tambah</Btn>
            </div>
            {!devices.length ? (
              <Card style={{ textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🔌</div>
                <div style={{ color: "#64748B", fontSize: 14 }}>Belum ada perangkat.</div>
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {devices.map(d => {
                  const kwh = (d.watt * d.hoursPerDay * 30 * (d.qty || 1)) / 1000;
                  const c = d.category || "custom";
                  return (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#1E293B", borderRadius: 12, border: "1px solid #334155" }}>
                      <span style={{ fontSize: 24, flexShrink: 0 }}>{CATEGORY_ICONS[c]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9" }}>{d.name}</span>
                          {(d.qty || 1) > 1 && <span style={{ fontSize: 10, background: "#334155", padding: "1px 7px", borderRadius: 99, color: "#94A3B8" }}>×{d.qty}</span>}
                          {!isMobile && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 99, background: CATEGORY_COLORS[c] + "22", color: CATEGORY_COLORS[c], fontWeight: 700 }}>{CATEGORY_LABELS[c]}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{d.watt}W · {d.hoursPerDay}jam/hari</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#16A34A", fontFamily: "'Space Mono',monospace", marginTop: 2 }}>{formatRupiah(kwh * rate)}<span style={{ fontSize: 10, color: "#64748B", fontWeight: 400 }}>/bln</span></div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => openEdit(d)} style={{ background: "#334155", border: "none", color: "#94A3B8", width: 36, height: 36, borderRadius: 10, cursor: "pointer", fontSize: 14 }}>✏️</button>
                        <button onClick={() => setDevices(p => p.filter(x => x.id !== d.id))} style={{ background: "#334155", border: "none", color: "#94A3B8", width: 36, height: 36, borderRadius: 10, cursor: "pointer", fontSize: 14 }}>🗑</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* USAGE */}
        {tab === "usage" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#64748B" }}>Biaya per aktivitas</div>
              <Btn onClick={() => setAddUsageOpen(true)}>+ Tambah</Btn>
            </div>
            <UsageAnalysis logs={usageLogs} rate={rate} onDelete={id => setUsageLogs(p => p.filter(l => l.id !== id))} />
          </div>
        )}

        {/* SIMULATION */}
        {tab === "simulation" && <SimulationTab selectedTariff={selectedTariff} simDevices={simDevices} setSimDevices={setSimDevices} pfEnabled={pfEnabled} setPfEnabled={setPfEnabled} pfValue={pfValue} setPfValue={setPfValue} isMobile={isMobile} />}
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Add/Edit Device */}
      <Modal open={addDeviceOpen} onClose={() => { setAddDeviceOpen(false); setEditDevice(null); resetDF(); }} title={editDevice ? "Edit Perangkat" : "Tambah Perangkat"} isMobile={isMobile}>
        <InputField label="Nama Perangkat" value={fn} onChange={setFn} placeholder="Contoh: AC Kamar Tidur" />
        {/* On mobile: stack all fields; on desktop: 2 columns */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <InputField label="Daya (Watt)" value={fw} onChange={setFw} type="number" suffix="W" min="0" />
          <InputField label="Jam per Hari" value={fh} onChange={setFh} type="number" suffix="jam" min="0" step="0.25" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <InputField label="Jumlah Unit" value={fq} onChange={setFq} type="number" min="1" />
          <SelectField label="Kategori" value={fc} onChange={setFc} options={catOpts} />
        </div>
        {fw && fh && (
          <div style={{ background: "#0F172A", borderRadius: 10, padding: 14, marginBottom: 14, border: "1px solid #334155" }}>
            <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 6 }}>Estimasi Biaya</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#16A34A", fontFamily: "'Space Mono',monospace" }}>
              {formatRupiah((parseFloat(fw) * parseFloat(fh) * 30 * (parseInt(fq) || 1)) / 1000 * rate)}
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}> /bulan</span>
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{formatKwh((parseFloat(fw) * parseFloat(fh) * 30 * (parseInt(fq) || 1)) / 1000)} per bulan</div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="secondary" onClick={() => { setAddDeviceOpen(false); setEditDevice(null); resetDF(); }}>Batal</Btn>
          <Btn onClick={saveDevice} disabled={!fn || !fw || !fh}>{editDevice ? "💾 Simpan" : "+ Tambah"}</Btn>
        </div>
      </Modal>

      {/* Add Usage */}
      <Modal open={addUsageOpen} onClose={() => setAddUsageOpen(false)} title="Tambah Aktivitas" isMobile={isMobile}>
        <InputField label="Nama Aktivitas" value={un} onChange={setUn} placeholder="Contoh: Rebus Air, Masak Nasi" />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <InputField label="Daya (Watt)" value={uw} onChange={setUw} type="number" suffix="W" min="0" />
          <InputField label="Durasi per Kali" value={ud} onChange={setUd} type="number" suffix="menit" min="0" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <InputField label="Berapa Kali" value={uc} onChange={setUc} type="number" suffix="kali" min="1" />
          <SelectField label="Kategori" value={ucat} onChange={setUcat} options={catOpts} />
        </div>
        {uw && ud && (
          <div style={{ background: "#0F172A", borderRadius: 10, padding: 14, marginBottom: 14, border: "1px solid #334155" }}>
            <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 6 }}>Estimasi Biaya</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#FCD34D", fontFamily: "'Space Mono',monospace" }}>
              {formatRupiah(((parseFloat(uw) * parseFloat(ud)) / 60000) * rate * (parseInt(uc) || 1))}
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{formatKwh(((parseFloat(uw) * parseFloat(ud)) / 60000) * (parseInt(uc) || 1))} total</div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="secondary" onClick={() => setAddUsageOpen(false)}>Batal</Btn>
          <Btn onClick={saveUsage} disabled={!un || !uw || !ud}>+ Tambah</Btn>
        </div>
      </Modal>

      {/* Settings */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Pengaturan" isMobile={isMobile}>
        <SelectField
          label="Golongan Tarif PLN" value={selectedTariff} onChange={v => setSelectedTariff(v)}
          options={Object.entries(TARIFF_RATES).map(([k, v]) => ({ value: k, label: `${v.name} — ${formatRupiah(v.rate)}/kWh` }))}
        />
        <div style={{ background: "#0F172A", borderRadius: 10, padding: 14, marginBottom: 20, border: "1px solid #334155" }}>
          <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 4 }}>Tarif saat ini</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#FCD34D", fontFamily: "'Space Mono',monospace" }}>{formatRupiah(rate)}<span style={{ fontSize: 12, color: "#64748B" }}> /kWh</span></div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Kapasitas: {TARIFF_RATES[selectedTariff]?.va} VA · MCB {TARIFF_RATES[selectedTariff]?.mcb}A · {VOLTAGE}V</div>
        </div>
        <div style={{ borderTop: "1px solid #334155", paddingTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>Zona Bahaya</div>
          <Btn variant="danger" onClick={clearAll} style={{ width: "100%" }}>🗑 Hapus Semua Data</Btn>
        </div>
      </Modal>
    </div>
  );
}
