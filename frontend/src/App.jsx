import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";

/* ═══════════ CONSTANTS ═══════════ */

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
const DEFAULT_VOLTAGE = 220;

const CATEGORIES = {
  cooling:        { label: "Pendingin",    icon: "❄️",  color: "#0EA5E9" },
  kitchen:        { label: "Dapur",        icon: "🍳",  color: "#F59E0B" },
  laundry:        { label: "Laundry",      icon: "👕",  color: "#8B5CF6" },
  entertainment:  { label: "Hiburan",      icon: "📺",  color: "#EC4899" },
  electronics:    { label: "Elektronik",   icon: "💻",  color: "#06B6D4" },
  lighting:       { label: "Pencahayaan",  icon: "💡",  color: "#FCD34D" },
  bathroom:       { label: "Kamar Mandi",  icon: "🚿",  color: "#14B8A6" },
  utility:        { label: "Utilitas",     icon: "🔧",  color: "#6B7280" },
  custom:         { label: "Lainnya",      icon: "🔌",  color: "#F97316" },
};

const DEVICE_PRESETS = [
  { name: "AC 1 PK", watt: 840, hours: 8, category: "cooling" },
  { name: "AC 1.5 PK", watt: 1200, hours: 8, category: "cooling" },
  { name: "AC 2 PK", watt: 1600, hours: 8, category: "cooling" },
  { name: "Kipas Angin", watt: 50, hours: 10, category: "cooling" },
  { name: "Kulkas 1 Pintu", watt: 100, hours: 24, category: "kitchen" },
  { name: "Kulkas 2 Pintu", watt: 150, hours: 24, category: "kitchen" },
  { name: "Rice Cooker", watt: 400, hours: 2, category: "kitchen" },
  { name: "Kompor Induksi", watt: 2100, hours: 1, category: "kitchen" },
  { name: "Microwave", watt: 800, hours: 0.5, category: "kitchen" },
  { name: "Dispenser (Panas-Dingin)", watt: 350, hours: 12, category: "kitchen" },
  { name: "Mesin Cuci", watt: 350, hours: 1, category: "laundry" },
  { name: "Setrika", watt: 350, hours: 0.5, category: "laundry" },
  { name: "TV LED 32\"", watt: 40, hours: 6, category: "entertainment" },
  { name: "TV LED 50\"", watt: 100, hours: 6, category: "entertainment" },
  { name: "Laptop", watt: 65, hours: 8, category: "electronics" },
  { name: "PC Desktop + Monitor", watt: 300, hours: 8, category: "electronics" },
  { name: "WiFi Router", watt: 12, hours: 24, category: "electronics" },
  { name: "Charger HP", watt: 20, hours: 3, category: "electronics" },
  { name: "Lampu LED 9W", watt: 9, hours: 10, category: "lighting" },
  { name: "Lampu LED 15W", watt: 15, hours: 10, category: "lighting" },
  { name: "Water Heater", watt: 350, hours: 0.5, category: "bathroom" },
  { name: "Pompa Air", watt: 250, hours: 2, category: "utility" },
  { name: "Mesin Pompa Sumur", watt: 400, hours: 1, category: "utility" },
];

const TIPS_HEMAT = [
  { icon: "❄️", title: "AC: Atur 24-26°C", desc: "Setiap 1°C lebih dingin menambah ~6% konsumsi listrik" },
  { icon: "💡", title: "Ganti ke LED", desc: "Lampu LED hemat hingga 80% dibanding lampu pijar" },
  { icon: "🔌", title: "Cabut Charger", desc: "Charger yang tetap terhubung tetap menyedot daya (standby power)" },
  { icon: "🌡️", title: "Kulkas: Jangan Kosong", desc: "Kulkas terisi lebih hemat karena massa termal membantu menjaga suhu" },
  { icon: "👕", title: "Cuci Baju Sekaligus", desc: "1 siklus penuh lebih hemat daripada 3 siklus kecil" },
  { icon: "⏰", title: "Pakai Timer AC", desc: "Timer 2-3 jam saat tidur bisa hemat 30-40% biaya AC malam" },
];

const PF_PRESETS = [
  { label: "Resistif (1.0)", value: 1.0, hint: "Setrika, Pemanas, Lampu pijar" },
  { label: "LED (0.95)", value: 0.95, hint: "Lampu LED, charger" },
  { label: "Motor kecil (0.85)", value: 0.85, hint: "Default umum" },
  { label: "AC/Kulkas (0.75)", value: 0.75, hint: "Kompresor, motor besar" },
  { label: "Motor tua (0.6)", value: 0.6, hint: "Mesin cuci lama, pompa" },
];

const CAT_OPTIONS = Object.entries(CATEGORIES).map(([v, c]) => ({
  value: v,
  label: `${c.icon} ${c.label}`,
}));

/* ═══════════ HELPERS ═══════════ */

function formatRupiah(n) { return "Rp " + Math.round(n).toLocaleString("id-ID"); }

function formatKwh(k) {
  if (k < 0.01) return (k * 1000).toFixed(1) + " Wh";
  if (k >= 1000) return (k / 1000).toFixed(2) + " MWh";
  return k.toFixed(2) + " kWh";
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function deviceKwh(d) {
  return (d.watt * d.hoursPerDay * 30 * (d.qty || 1)) / 1000;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/* ═══════════ RESPONSIVE HOOK ═══════════ */

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    let raf;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setMobile(window.innerWidth < 640));
    };
    window.addEventListener("resize", handler, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handler);
    };
  }, []);
  return mobile;
}

/* ═══════════ STORAGE — SINGLE MERGED KEY ═══════════ */

const STORAGE_KEY = "elmon:state";
const DEFAULT_STATE = {
  devices: [],
  usageLogs: [],
  tariff: "R-1/1300VA",
  simDevices: [],
  pfEnabled: false,
  pfValue: 0.85,
  voltage: DEFAULT_VOLTAGE,
};

async function loadState() {
  try {
    const res = await fetch(`/api/storage/${STORAGE_KEY}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.value ? JSON.parse(data.value) : null;
  } catch {
    return null;
  }
}

async function saveState(state) {
  try {
    await fetch(`/api/storage/${STORAGE_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: JSON.stringify(state) }),
    });
  } catch (e) {
    console.error("Save failed:", e);
  }
}

function useAppState() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);
  const stateRef = useRef(state);

  useEffect(() => {
    let cancelled = false;
    loadState().then((saved) => {
      if (cancelled) return;
      if (saved) {
        const merged = { ...DEFAULT_STATE, ...saved };
        setState(merged);
        stateRef.current = merged;
      }
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  const update = useCallback((patch) => {
    setState((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      stateRef.current = next;
      // Debounced save — 500ms after last change
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveState(next), 500);
      return next;
    });
  }, []);

  // Save on unmount
  useEffect(() => {
    return () => {
      clearTimeout(saveTimer.current);
      saveState(stateRef.current);
    };
  }, []);

  return [state, update, loaded];
}

/* ═══════════ CSS VARIABLES (injected once) ═══════════ */

const CSS = `
  :root {
    --bg-deep: #0F172A;
    --bg-card: #1E293B;
    --bg-input: #0F172A;
    --border: #334155;
    --border-hover: #475569;
    --text-primary: #F1F5F9;
    --text-secondary: #94A3B8;
    --text-muted: #64748B;
    --text-dim: #475569;
    --accent: #16A34A;
    --accent-light: #22C55E;
    --danger: #EF4444;
    --warning: #F59E0B;
    --info: #06B6D4;
    --gold: #FCD34D;
    --purple: #8B5CF6;
    --font-body: 'DM Sans', system-ui, -apple-system, sans-serif;
    --font-mono: 'Space Mono', 'JetBrains Mono', monospace;
    --radius: 12px;
    --radius-sm: 8px;
    --radius-lg: 16px;
    --transition: 0.2s ease;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body { background: var(--bg-deep); color: var(--text-primary); font-family: var(--font-body); -webkit-font-smoothing: antialiased; }
  input, select, button { font-family: inherit; }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  ::selection { background: var(--accent); color: #fff; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideCenter { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  .fade-in { animation: fadeIn 0.3s ease both; }
  .slide-up { animation: slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both; }
  .slide-center { animation: slideCenter 0.25s ease both; }
`;

/* ═══════════ UI PRIMITIVES ═══════════ */

function Card({ children, style, onClick, className }) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: "var(--bg-card)",
        borderRadius: "var(--radius)",
        padding: 16,
        border: "1px solid var(--border)",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color var(--transition)",
        ...style,
      }}
      onMouseEnter={onClick ? (e) => (e.currentTarget.style.borderColor = "var(--accent)") : undefined}
      onMouseLeave={onClick ? (e) => (e.currentTarget.style.borderColor = "var(--border)") : undefined}
    >
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: color || "var(--text-primary)", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
        </div>
        {icon && <span style={{ fontSize: 22, opacity: 0.7, flexShrink: 0, marginLeft: 8 }}>{icon}</span>}
      </div>
    </Card>
  );
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height: 6, background: "var(--bg-deep)", borderRadius: 3, flex: 1, minWidth: 0 }}>
      <div style={{ height: "100%", width: pct + "%", background: color || "var(--accent)", borderRadius: 3, transition: "width 0.4s ease" }} />
    </div>
  );
}

const Btn = memo(function Btn({ children, onClick, variant = "primary", style: s, disabled }) {
  const variants = {
    primary: { background: "var(--accent)", color: "#fff" },
    secondary: { background: "var(--border)", color: "#CBD5E1" },
    danger: { background: "var(--danger)", color: "#fff" },
    ghost: { background: "transparent", color: "var(--text-secondary)", padding: "8px 12px" },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        padding: "11px 20px",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontWeight: 700,
        fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all var(--transition)",
        opacity: disabled ? 0.5 : 1,
        ...variants[variant],
        ...s,
      }}
    >
      {children}
    </button>
  );
});

function InputField({ label, value, onChange, type = "text", suffix, placeholder, min, step }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          step={step}
          style={{
            width: "100%",
            padding: "11px 14px",
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            color: "var(--text-primary)",
            fontSize: 15,
            outline: "none",
            transition: "border-color var(--transition)",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
        {suffix && <span style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap", fontWeight: 600 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "11px 14px",
          background: "var(--bg-input)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          color: "var(--text-primary)",
          fontSize: 15,
          outline: "none",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function TabButton({ active, onClick, children, badge, isMobile }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: isMobile ? "12px 12px" : "10px 16px",
        border: "none",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        background: "transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        fontWeight: active ? 700 : 500,
        fontSize: isMobile ? 12 : 13,
        cursor: "pointer",
        transition: "all var(--transition)",
        display: "flex",
        alignItems: "center",
        gap: 5,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {children}
      {badge > 0 && (
        <span style={{ background: "var(--accent)", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
          {badge}
        </span>
      )}
    </button>
  );
}

/* ─── Modal with keyboard dismiss + focus trap ─── */

function Modal({ open, onClose, title, children, isMobile }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 16,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        ref={ref}
        className={isMobile ? "slide-up" : "slide-center"}
        style={{
          background: "var(--bg-card)",
          borderRadius: isMobile ? "20px 20px 0 0" : "var(--radius-lg)",
          padding: isMobile ? "24px 16px 32px" : 28,
          maxWidth: 520,
          width: "100%",
          border: "1px solid var(--border)",
          maxHeight: isMobile ? "92vh" : "85vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--text-primary)" }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: "var(--border)",
              border: "none",
              color: "var(--text-secondary)",
              width: 36,
              height: 36,
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 16,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Custom Confirm Dialog ─── */

function ConfirmDialog({ open, onConfirm, onCancel, title, message, danger }) {
  if (!open) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <div
        className="slide-center"
        style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", padding: 28, maxWidth: 400, width: "100%", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>{danger ? "⚠️" : "❓"}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", textAlign: "center", marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginBottom: 24, lineHeight: 1.6 }}>{message}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Btn variant="secondary" onClick={onCancel}>Batal</Btn>
          <Btn variant={danger ? "danger" : "primary"} onClick={onConfirm}>{danger ? "Hapus" : "OK"}</Btn>
        </div>
      </div>
    </div>
  );
}

function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{ width: 44, height: 26, borderRadius: 13, border: "none", cursor: "pointer", background: enabled ? "var(--accent)" : "var(--border)", position: "relative", transition: "background var(--transition)", flexShrink: 0 }}
      aria-label={enabled ? "Disable" : "Enable"}
      role="switch"
      aria-checked={enabled}
    >
      <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 3, left: enabled ? 21 : 3, transition: "left var(--transition)" }} />
    </button>
  );
}

/* ═══════════ DASHBOARD CHARTS ═══════════ */

const CategoryBreakdown = memo(function CategoryBreakdown({ devices, rate }) {
  const sorted = useMemo(() => {
    const cats = {};
    devices.forEach((d) => {
      const c = d.category || "custom";
      cats[c] = (cats[c] || 0) + deviceKwh(d) * rate;
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [devices, rate]);

  const mx = sorted[0]?.[1] || 1;
  if (!sorted.length) return <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 20 }}>Belum ada perangkat</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sorted.map(([c, cost]) => {
        const cat = CATEGORIES[c] || CATEGORIES.custom;
        return (
          <div key={c}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: cat.color, fontWeight: 700 }}>{cat.icon} {cat.label}</span>
              <span style={{ fontSize: 12, color: "#CBD5E1", fontFamily: "var(--font-mono)" }}>{formatRupiah(cost)}</span>
            </div>
            <MiniBar value={cost} max={mx} color={cat.color} />
          </div>
        );
      })}
    </div>
  );
});

const TopConsumers = memo(function TopConsumers({ devices, rate }) {
  const sorted = useMemo(() => {
    return [...devices]
      .sort((a, b) => (b.watt * b.hoursPerDay * (b.qty || 1)) - (a.watt * a.hoursPerDay * (a.qty || 1)))
      .slice(0, 5);
  }, [devices]);

  const mx = sorted[0] ? deviceKwh(sorted[0]) : 1;
  if (!sorted.length) return <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 20 }}>Belum ada perangkat</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sorted.map((d, i) => {
        const kwh = deviceKwh(d);
        const cat = CATEGORIES[d.category] || CATEGORIES.custom;
        return (
          <div key={d.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: i === 0 ? "var(--danger)" : i < 3 ? "var(--warning)" : "var(--text-dim)", width: 20, textAlign: "center", fontWeight: 800, flexShrink: 0 }}>#{i + 1}</span>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{cat.icon}</span>
              <span style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
              <span style={{ fontSize: 11, color: "var(--accent)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{formatRupiah(kwh * rate)}/bln</span>
            </div>
            <div style={{ paddingLeft: 28 }}>
              <MiniBar value={kwh} max={mx} color={cat.color} />
            </div>
          </div>
        );
      })}
    </div>
  );
});

/* ═══════════ SIMULATION TAB ═══════════ */

function SimulationTab({ tariffKey, simDevices, update, pfEnabled, pfValue, isMobile, voltage }) {
  const [sn, setSn] = useState("");
  const [sw, setSw] = useState("");
  const [sq, setSq] = useState("1");
  const [pfInput, setPfInput] = useState(String(pfValue));

  const VOLTAGE = voltage || DEFAULT_VOLTAGE;

  const tariff = TARIFF_RATES[tariffKey];
  const maxVA = tariff?.va || 1300;
  const mcbAmp = tariff?.mcb || 6;
  const PF = clamp(parseFloat(pfValue) || 0.85, 0.01, 1);
  const maxWattPF = maxVA * PF;

  const totalW = simDevices.reduce((s, d) => (d.on ? s + d.watt * (d.qty || 1) : s), 0);
  const totalAmp = totalW / VOLTAGE;

  const ampPct = mcbAmp > 0 ? (totalAmp / mcbAmp) * 100 : 0;
  const ampOver = totalAmp > mcbAmp;
  const ampWarn = ampPct > 75 && !ampOver;
  const ampColor = ampOver ? "var(--danger)" : ampWarn ? "var(--warning)" : "var(--accent)";

  const wattPct = maxWattPF > 0 ? (totalW / maxWattPF) * 100 : 0;
  const wattOver = totalW > maxWattPF;
  const wattWarn = wattPct > 75 && !wattOver;
  const wattColor = wattOver ? "var(--danger)" : wattWarn ? "var(--warning)" : "var(--accent)";

  const anyOver = ampOver || (pfEnabled && wattOver);
  const anyWarn = (ampWarn || (pfEnabled && wattWarn)) && !anyOver;
  const statusColor = anyOver ? "var(--danger)" : anyWarn ? "var(--warning)" : "var(--accent)";

  function addSim() {
    if (!sn || !sw) return;
    update((p) => ({
      ...p,
      simDevices: [...p.simDevices, { id: uid(), name: sn, watt: parseFloat(sw), qty: parseInt(sq) || 1, on: true }],
    }));
    setSn("");
    setSw("");
    setSq("1");
  }

  function toggleSim(id) {
    update((p) => ({
      ...p,
      simDevices: p.simDevices.map((x) => (x.id === id ? { ...x, on: !x.on } : x)),
    }));
  }

  function removeSim(id) {
    update((p) => ({ ...p, simDevices: p.simDevices.filter((x) => x.id !== id) }));
  }

  function handlePfInput(val) {
    setPfInput(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0 && n <= 1) update({ pfValue: n });
  }

  function setPF(v) {
    update({ pfValue: v });
    setPfInput(String(v));
  }

  const suggestedUpgrade = Object.values(TARIFF_RATES).find(
    (t) => t.mcb > totalAmp && (!pfEnabled || t.va * PF > totalW)
  );

  function GaugeBar({ label, current, max, unit, pct, color, icon, dimmed }) {
    const isOver = current > max;
    const isWarn = pct > 75 && !isOver;
    return (
      <div style={{ marginBottom: 14, opacity: dimmed ? 0.35 : 1, transition: "opacity 0.3s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>{icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: dimmed ? "var(--text-dim)" : "#CBD5E1", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, fontFamily: "var(--font-mono)", color: dimmed ? "var(--text-dim)" : color }}>
              {typeof current === "number" && current % 1 !== 0 ? current.toFixed(1) : current}{unit}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>/ {typeof max === "number" ? max.toFixed(0) : max}{unit}</span>
            {!dimmed && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: (isOver ? "#EF4444" : isWarn ? "#F59E0B" : "#16A34A") + "22", color }}>
                {Math.min(pct, 199).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        <div style={{ height: 22, background: "var(--bg-deep)", borderRadius: 11, overflow: "hidden", position: "relative" }}>
          <div
            style={{
              height: "100%",
              width: dimmed ? 0 : Math.min(pct, 100) + "%",
              background: isOver
                ? "repeating-linear-gradient(45deg,#EF4444,#EF4444 8px,#DC2626 8px,#DC2626 16px)"
                : isWarn
                ? "linear-gradient(90deg,#16A34A,#F59E0B)"
                : "linear-gradient(90deg,#16A34A,#22C55E)",
              borderRadius: 11,
              transition: "width 0.5s ease",
            }}
          />
          {!dimmed && <div style={{ position: "absolute", left: "80%", top: 0, bottom: 0, width: 2, background: "#F59E0B66" }} />}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <Card style={{ marginBottom: 14, border: `1px solid ${anyOver ? "#EF444444" : anyWarn ? "#F59E0B44" : "#16A34A44"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Kapasitas Listrik</div>
            <div style={{ fontSize: 13, color: "#CBD5E1" }}>
              {tariff?.name} — MCB <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{mcbAmp}A</span> · <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{maxVA} VA</span>
            </div>
          </div>
        </div>
        <GaugeBar label="Arus (Ampere)" icon="⚡" current={totalAmp} max={mcbAmp} unit="A" pct={ampPct} color={ampColor} />

        <div style={{ borderTop: "1px solid var(--bg-card)", paddingTop: 14, marginTop: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: pfEnabled ? 12 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>🔌</span>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: pfEnabled ? "#CBD5E1" : "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.5 }}>Daya (Power Factor)</span>
                <span style={{ fontSize: 10, color: "var(--text-dim)", marginLeft: 8 }}>— opsional</span>
              </div>
            </div>
            <Toggle enabled={pfEnabled} onToggle={() => update((p) => ({ ...p, pfEnabled: !p.pfEnabled }))} />
          </div>

          {pfEnabled && (
            <div style={{ background: "var(--bg-deep)", borderRadius: 10, padding: 14, marginBottom: 14, border: "1px solid var(--border)" }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Nilai Power Factor</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="number" value={pfInput} min="0.01" max="1" step="0.01"
                    onChange={(e) => handlePfInput(e.target.value)}
                    style={{ width: 90, padding: "8px 12px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, outline: "none", textAlign: "center" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                    onBlur={(e) => { e.target.style.borderColor = "var(--border)"; setPfInput(String(PF)); }}
                  />
                  <div style={{ flex: 1 }}>
                    <input type="range" min="0.01" max="1" step="0.01" value={PF} onChange={(e) => setPF(parseFloat(e.target.value))} style={{ width: "100%", accentColor: "#16A34A", cursor: "pointer" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>
                      <span>0.01</span>
                      <span style={{ color: "var(--text-secondary)", fontWeight: 700 }}>PF = {PF.toFixed(2)}</span>
                      <span>1.00</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Preset Umum</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {PF_PRESETS.map((p) => {
                    const active = Math.abs(PF - p.value) < 0.001;
                    return (
                      <button key={p.value} onClick={() => setPF(p.value)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: active ? "#16A34A22" : "var(--bg-card)", borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent", transition: "all 0.15s" }}>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: active ? "var(--accent-light)" : "#CBD5E1" }}>{p.label}</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{p.hint}</div>
                        </div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800, color: active ? "var(--accent-light)" : "var(--text-dim)" }}>{(maxVA * p.value).toFixed(0)}W</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {pfEnabled && <GaugeBar label={`Daya efektif (PF ${PF.toFixed(2)})`} icon="🔌" current={totalW} max={maxWattPF} unit="W" pct={wattPct} color={wattColor} />}
          {!pfEnabled && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--bg-deep)", border: "1px dashed var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: "var(--text-dim)" }}>Bar Power Factor dinonaktifkan — aktifkan toggle untuk menggunakan kalkulasi PF</span>
            </div>
          )}
        </div>

        <div style={{ marginTop: 14, background: anyOver ? "#7F1D1D" : anyWarn ? "#78350F" : "#14532D", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: anyOver ? "#EF4444" : anyWarn ? "#F59E0B" : "#16A34A" }}>
            {anyOver ? "⚠️ OVERCAPACITY!" : anyWarn ? "⚡ Mendekati Batas" : "✅ Aman"}
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: ampOver ? "#EF4444" : ampWarn ? "#F59E0B" : "#16A34A", fontWeight: 700 }}>{totalAmp.toFixed(1)}A/{mcbAmp}A</span>
            {pfEnabled && (
              <>
                <span style={{ color: "var(--border)" }}>|</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: wattOver ? "#EF4444" : wattWarn ? "#F59E0B" : "#16A34A", fontWeight: 700 }}>{totalW}W/{maxWattPF.toFixed(0)}W</span>
              </>
            )}
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Card style={{ background: "var(--bg-deep)" }}>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Total Beban</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--warning)", fontFamily: "var(--font-mono)" }}>{totalW.toLocaleString("id-ID")}W</div>
          <div style={{ fontSize: 11, color: "var(--info)", fontFamily: "var(--font-mono)" }}>{totalAmp.toFixed(1)}A</div>
        </Card>
        <Card style={{ background: "var(--bg-deep)" }}>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Sisa Ampere</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: ampOver ? "var(--danger)" : "var(--accent)", fontFamily: "var(--font-mono)" }}>
            {ampOver ? "-" : ""}{Math.abs(mcbAmp - totalAmp).toFixed(1)}A
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{ampOver ? "Kelebihan!" : "Tersedia"}</div>
        </Card>
        {pfEnabled && (
          <>
            <Card style={{ background: "var(--bg-deep)" }}>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Sisa Watt (PF {PF.toFixed(2)})</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: wattOver ? "var(--danger)" : "var(--accent)", fontFamily: "var(--font-mono)" }}>
                {wattOver ? "-" : ""}{Math.abs(maxWattPF - totalW).toFixed(0)}W
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{wattOver ? "Kelebihan!" : "Tersedia"}</div>
            </Card>
            <Card style={{ background: "var(--bg-deep)" }}>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Kapasitas Efektif</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--purple)", fontFamily: "var(--font-mono)" }}>{maxWattPF.toFixed(0)}W</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{maxVA}VA × PF {PF.toFixed(2)}</div>
            </Card>
          </>
        )}
        <Card style={{ background: "var(--bg-deep)" }}>
          <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Perangkat</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--info)", fontFamily: "var(--font-mono)" }}>
            {simDevices.filter((d) => d.on).length}<span style={{ fontSize: 13, color: "var(--text-dim)" }}>/{simDevices.length}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>aktif / total</div>
        </Card>
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Tambah Perangkat Simulasi</div>
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
            {simDevices.map((d) => {
              const dAmp = (d.watt * (d.qty || 1)) / VOLTAGE;
              return (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: d.on ? "#16A34A11" : "var(--bg-deep)", borderRadius: 10, border: `1px solid ${d.on ? "#16A34A33" : "var(--border)"}` }}>
                  <Toggle enabled={d.on} onToggle={() => toggleSim(d.id)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: d.on ? "#E2E8F0" : "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.name}{(d.qty || 1) > 1 && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 5 }}>×{d.qty}</span>}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: d.on ? "var(--info)" : "var(--text-dim)" }}>{dAmp.toFixed(1)}A</div>
                  </div>
                  <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: d.on ? "var(--warning)" : "var(--text-dim)", flexShrink: 0 }}>
                    {(d.watt * (d.qty || 1)).toLocaleString("id-ID")}W
                  </span>
                  <button onClick={() => removeSim(d.id)} style={{ background: "var(--border)", border: "none", color: "var(--text-secondary)", width: 34, height: 34, borderRadius: 8, cursor: "pointer", fontSize: 14, flexShrink: 0 }}>🗑</button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-dim)", fontSize: 13 }}>Tambahkan perangkat untuk simulasi beban listrik</div>
        )}
      </Card>

      <Card style={{ background: anyOver ? "#7F1D1D22" : "var(--bg-deep)", border: `1px solid ${anyOver ? "#EF444444" : "var(--border)"}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: anyOver ? "#FCA5A5" : "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {anyOver ? "🔴 Rekomendasi" : "💡 Info Gauge"}
        </div>
        {anyOver ? (
          <div style={{ fontSize: 13, color: "#FCA5A5", lineHeight: 1.7 }}>
            {ampOver && <div style={{ marginBottom: 8 }}><strong>⚡ Arus:</strong> Total <strong>{totalAmp.toFixed(1)}A</strong> melebihi MCB <strong>{mcbAmp}A</strong>. MCB akan <strong>trip</strong>.</div>}
            {wattOver && <div style={{ marginBottom: 8 }}><strong>🔌 Daya:</strong> Total <strong>{totalW.toLocaleString("id-ID")}W</strong> melebihi kapasitas efektif <strong>{maxWattPF.toFixed(0)}W</strong>.</div>}
            <div style={{ marginTop: 10, padding: "12px 14px", background: "#7F1D1D44", borderRadius: 10, border: "1px solid #EF444433", fontSize: 12, lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Solusi:</div>
              <div>• Matikan beberapa perangkat berdaya besar</div>
              <div>• Hindari AC + setrika + kompor induksi bersamaan</div>
              <div>• Toggle OFF untuk cek kombinasi aman</div>
              {suggestedUpgrade && <div>• Upgrade ke <strong>{suggestedUpgrade.name} (MCB {suggestedUpgrade.mcb}A)</strong></div>}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
              <span style={{ flexShrink: 0 }}>⚡</span>
              <div><strong style={{ color: "var(--info)" }}>Bar Ampere</strong> — Arus aktual (Watt ÷ {VOLTAGE}V). MCB trip jika lebih dari {mcbAmp}A.</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ flexShrink: 0 }}>🔌</span>
              <div><strong style={{ color: "var(--warning)" }}>Bar Daya (PF {PF})</strong> — {maxVA} VA ≈ <strong>{maxWattPF.toFixed(0)}W</strong> daya nyata.</div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ═══════════ USAGE ANALYSIS ═══════════ */

const UsageAnalysis = memo(function UsageAnalysis({ logs, rate, onDelete }) {
  if (!logs.length) {
    return (
      <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 30 }}>
        Belum ada data aktivitas. Tambahkan aktivitas untuk mulai analisis.
      </div>
    );
  }

  const activities = useMemo(() => {
    return logs.map((log) => {
      const kwhPerUse = (log.watt * log.durationMin) / 60000;
      const costPerUse = kwhPerUse * rate;
      return { ...log, kwhPerUse, costPerUse };
    });
  }, [logs, rate]);

  const byExpensive = useMemo(() => [...activities].sort((a, b) => b.costPerUse - a.costPerUse), [activities]);
  const byCheapest = useMemo(() => [...activities].sort((a, b) => a.costPerUse - b.costPerUse), [activities]);
  const maxCost = byExpensive[0]?.costPerUse || 1;

  const catTotals = useMemo(() => {
    const t = {};
    activities.forEach((a) => {
      const c = a.category || "custom";
      if (!t[c]) t[c] = { count: 0, totalCost: 0, totalKwh: 0 };
      t[c].count += a.count;
      t[c].totalCost += a.costPerUse * a.count;
      t[c].totalKwh += a.kwhPerUse * a.count;
    });
    return t;
  }, [activities]);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>⚡ Ranking Biaya per Aktivitas</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {byExpensive.map((a, i) => {
            const cat = CATEGORIES[a.category] || CATEGORIES.custom;
            return (
              <div key={a.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: i === 0 ? "var(--danger)" : i < 3 ? "var(--warning)" : "var(--text-dim)", width: 22, textAlign: "center", fontWeight: 800, flexShrink: 0 }}>#{i + 1}</span>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{cat.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? "var(--danger)" : "var(--gold)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{formatRupiah(a.costPerUse)}</span>
                </div>
                <div style={{ paddingLeft: 30 }}>
                  <MiniBar value={a.costPerUse} max={maxCost} color={i === 0 ? "#EF4444" : i < 3 ? "#F59E0B" : cat.color} />
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{a.watt}W · {a.durationMin}mnt · {formatKwh(a.kwhPerUse)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {byCheapest.length >= 2 && (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>🏆 Paling Hemat</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#14532D33", borderRadius: 10, border: "1px solid #16A34A33" }}>
            <span style={{ fontSize: 26 }}>{(CATEGORIES[byCheapest[0].category] || CATEGORIES.custom).icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent-light)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{byCheapest[0].name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{byCheapest[0].watt}W · {byCheapest[0].durationMin} menit</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{formatRupiah(byCheapest[0].costPerUse)}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>per penggunaan</div>
            </div>
          </div>
        </Card>
      )}

      {Object.keys(catTotals).length > 1 && (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>📊 Ringkasan per Kategori</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(catTotals).sort((a, b) => b[1].totalCost - a[1].totalCost).map(([c, data]) => {
              const cat = CATEGORIES[c] || CATEGORIES.custom;
              return (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--bg-deep)", borderRadius: 8 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{cat.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: cat.color }}>{cat.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{data.count} kali · {formatKwh(data.totalKwh)}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{formatRupiah(data.totalCost)}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>📋 Semua Aktivitas</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...logs].sort((a, b) => b.timestamp - a.timestamp).map((log) => {
            const kwh = (log.watt * log.durationMin) / 60000;
            const cost = kwh * rate;
            const cat = CATEGORIES[log.category] || CATEGORIES.custom;
            return (
              <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", background: "var(--bg-deep)", borderRadius: 10, border: "1px solid var(--bg-card)" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{cat.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{log.name}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>×{log.count}</span>
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: cat.color + "22", color: cat.color, fontWeight: 700 }}>{cat.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{log.watt}W · {log.durationMin}mnt · {formatRupiah(cost)}/kali</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--gold)" }}>{formatRupiah(cost * log.count)}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>total</div>
                </div>
                <button onClick={() => onDelete(log.id)} style={{ background: "var(--border)", border: "none", color: "var(--text-secondary)", width: 34, height: 34, borderRadius: 8, cursor: "pointer", fontSize: 14, flexShrink: 0 }}>🗑</button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
});

/* ═══════════ MAIN APP ═══════════ */

export default function ElectricityMonitor() {
  const isMobile = useIsMobile();
  const [state, update, loaded] = useAppState();

  const { devices, usageLogs, tariff: selectedTariff, simDevices, pfEnabled, pfValue, voltage } = state;
  const activeVoltage = voltage || DEFAULT_VOLTAGE;
  const rate = TARIFF_RATES[selectedTariff]?.rate || 1444.70;

  const [tab, setTab] = useState("dashboard");
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [addUsageOpen, setAddUsageOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [presetSearch, setPresetSearch] = useState("");

  // Form state
  const [fn, setFn] = useState("");
  const [fw, setFw] = useState("");
  const [fh, setFh] = useState("");
  const [fq, setFq] = useState("1");
  const [fc, setFc] = useState("custom");
  const [un, setUn] = useState("");
  const [uw, setUw] = useState("");
  const [ud, setUd] = useState("");
  const [uc, setUc] = useState("1");
  const [ucat, setUcat] = useState("custom");

  // Computed
  const totalKwh = useMemo(() => devices.reduce((s, d) => s + deviceKwh(d), 0), [devices]);
  const totalCost = totalKwh * rate;
  const logsCost = useMemo(() => usageLogs.reduce((s, l) => s + ((l.watt * l.durationMin * l.count) / 60000) * rate, 0), [usageLogs, rate]);

  function resetDF() { setFn(""); setFw(""); setFh(""); setFq("1"); setFc("custom"); }

  function saveDevice() {
    if (!fn || !fw || !fh) return;
    const watt = Math.max(0, parseFloat(fw) || 0);
    const hours = clamp(parseFloat(fh) || 0, 0, 24);
    const qty = Math.max(1, parseInt(fq) || 1);
    if (watt === 0) return;

    if (editDevice) {
      update((p) => ({
        ...p,
        devices: p.devices.map((d) => d.id === editDevice.id ? { ...d, name: fn.trim(), watt, hoursPerDay: hours, qty, category: fc } : d),
      }));
      setEditDevice(null);
    } else {
      update((p) => ({
        ...p,
        devices: [...p.devices, { id: uid(), name: fn.trim(), watt, hoursPerDay: hours, qty, category: fc }],
      }));
    }
    resetDF();
    setAddDeviceOpen(false);
  }

  function openEdit(d) {
    setFn(d.name);
    setFw(String(d.watt));
    setFh(String(d.hoursPerDay));
    setFq(String(d.qty || 1));
    setFc(d.category || "custom");
    setEditDevice(d);
    setAddDeviceOpen(true);
  }

  function saveUsage() {
    if (!un || !uw || !ud) return;
    const watt = Math.max(0, parseFloat(uw) || 0);
    const dur = Math.max(0, parseFloat(ud) || 0);
    if (watt === 0 || dur === 0) return;

    update((p) => ({
      ...p,
      usageLogs: [...p.usageLogs, { id: uid(), name: un.trim(), watt, durationMin: dur, count: Math.max(1, parseInt(uc) || 1), category: ucat, timestamp: Date.now() }],
    }));
    setUn(""); setUw(""); setUd(""); setUc("1"); setUcat("custom");
    setAddUsageOpen(false);
  }

  function addPreset(preset) {
    update((p) => ({
      ...p,
      devices: [...p.devices, { id: uid(), name: preset.name, watt: preset.watt, hoursPerDay: preset.hours, qty: 1, category: preset.category }],
    }));
  }

  function clearAll() {
    setConfirmState({
      title: "Hapus Semua Data?",
      message: "Semua perangkat, aktivitas, dan pengaturan simulasi akan dihapus permanen.",
      danger: true,
      onConfirm: async () => {
        try {
          await fetch(`/api/storage/${STORAGE_KEY}`, { method: "DELETE" });
        } catch {}
        update(() => ({ ...DEFAULT_STATE }));
        setConfirmState(null);
        setSettingsOpen(false);
      },
    });
  }

  function deleteDevice(id) {
    update((p) => ({ ...p, devices: p.devices.filter((x) => x.id !== id) }));
  }

  function deleteUsageLog(id) {
    update((p) => ({ ...p, usageLogs: p.usageLogs.filter((l) => l.id !== id) }));
  }

  // Export
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pln-monitor-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import
  function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!data.devices || !Array.isArray(data.devices)) throw new Error("Invalid format");
          update(() => ({ ...DEFAULT_STATE, ...data }));
        } catch {
          alert("File tidak valid. Pastikan file backup JSON yang benar.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // Loading screen
  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-deep)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{CSS}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14 }}>Memuat data...</div>
        </div>
      </div>
    );
  }

  const pad = isMobile ? 12 : 20;

  const filteredPresets = DEVICE_PRESETS.filter((p) =>
    presetSearch === "" || p.name.toLowerCase().includes(presetSearch.toLowerCase()) || p.category.includes(presetSearch.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-deep)" }}>
      <style>{CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0F172A,#1a2744)", borderBottom: "1px solid var(--bg-card)", padding: `14px ${pad}px`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: isMobile ? 14 : 16, color: "var(--accent)" }}>PLN Monitor</div>
              <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{TARIFF_RATES[selectedTariff]?.name}</div>
            </div>
          </div>
          <Btn variant="ghost" onClick={() => setSettingsOpen(true)}>⚙️</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid var(--bg-card)", background: "var(--bg-deep)", position: "sticky", top: isMobile ? 57 : 63, zIndex: 99 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", overflowX: "auto", padding: `0 ${isMobile ? 4 : 16}px`, scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          {[
            { key: "dashboard", label: "📊 Dashboard" },
            { key: "devices", label: "🔌 Perangkat", badge: devices.length },
            { key: "usage", label: "📝 Analisis", badge: usageLogs.length },
            { key: "simulation", label: "🧪 Simulasi" },
            { key: "rumus", label: "📐 Rumus" },
          ].map((t) => (
            <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)} badge={t.badge} isMobile={isMobile}>
              {t.label}
            </TabButton>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: `${pad}px ${pad}px ${isMobile ? 80 : pad}px` }}>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <StatCard label="Estimasi Bulanan" value={formatRupiah(totalCost)} sub={`${totalKwh.toFixed(1)} kWh`} color="var(--accent)" icon="💰" />
              <StatCard label="Estimasi Harian" value={formatRupiah(totalCost / 30)} sub={`${(totalKwh / 30).toFixed(1)} kWh`} color="var(--info)" icon="📅" />
              <StatCard label="Tarif/kWh" value={formatRupiah(rate)} sub="per kWh" color="var(--gold)" icon="⚡" />
              <StatCard label="Aktivitas" value={formatRupiah(logsCost)} sub={`${usageLogs.length} aktivitas`} color="var(--warning)" icon="📝" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Card>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>Biaya per Kategori</div>
                <CategoryBreakdown devices={devices} rate={rate} />
              </Card>
              <Card>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>Top 5 Pemakan Listrik</div>
                <TopConsumers devices={devices} rate={rate} />
              </Card>

              {/* Tips Hemat */}
              <Card>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>💡 Tips Hemat Listrik</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
                  {TIPS_HEMAT.map((tip, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "var(--bg-deep)", borderRadius: 8, border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{tip.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#E2E8F0", marginBottom: 2 }}>{tip.title}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{tip.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            {!devices.length && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-dim)" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Belum ada perangkat</div>
                <div style={{ fontSize: 13, marginBottom: 16 }}>Mulai tambahkan perangkat elektronik rumah Anda</div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  <Btn onClick={() => setTab("devices")}>+ Tambah Manual</Btn>
                  <Btn variant="secondary" onClick={() => { setTab("devices"); setPresetOpen(true); }}>📋 Pilih Preset</Btn>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DEVICES */}
        {tab === "devices" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{devices.length} perangkat</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="secondary" onClick={() => { setPresetOpen(true); setPresetSearch(""); }}>📋 Preset</Btn>
                <Btn onClick={() => { resetDF(); setEditDevice(null); setAddDeviceOpen(true); }}>+ Tambah</Btn>
              </div>
            </div>
            {!devices.length ? (
              <Card style={{ textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🔌</div>
                <div style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 16 }}>Belum ada perangkat.</div>
                <Btn variant="secondary" onClick={() => { setPresetOpen(true); setPresetSearch(""); }}>📋 Mulai dari Preset</Btn>
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {devices.map((d) => {
                  const kwh = deviceKwh(d);
                  const cat = CATEGORIES[d.category] || CATEGORIES.custom;
                  return (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 24, flexShrink: 0 }}>{cat.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{d.name}</span>
                          {(d.qty || 1) > 1 && <span style={{ fontSize: 10, background: "var(--border)", padding: "1px 7px", borderRadius: 99, color: "var(--text-secondary)" }}>×{d.qty}</span>}
                          {!isMobile && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 99, background: cat.color + "22", color: cat.color, fontWeight: 700 }}>{cat.label}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{d.watt}W · {d.hoursPerDay}jam/hari</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{formatRupiah(kwh * rate)}<span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>/bln</span></div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => openEdit(d)} style={{ background: "var(--border)", border: "none", color: "var(--text-secondary)", width: 36, height: 36, borderRadius: 10, cursor: "pointer", fontSize: 14 }}>✏️</button>
                        <button onClick={() => deleteDevice(d.id)} style={{ background: "var(--border)", border: "none", color: "var(--text-secondary)", width: 36, height: 36, borderRadius: 10, cursor: "pointer", fontSize: 14 }}>🗑</button>
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
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Biaya per aktivitas</div>
              <Btn onClick={() => setAddUsageOpen(true)}>+ Tambah</Btn>
            </div>
            <UsageAnalysis logs={usageLogs} rate={rate} onDelete={deleteUsageLog} />
          </div>
        )}

        {/* RUMUS */}
        {tab === "rumus" && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Intro */}
            <Card style={{ borderColor: "#16A34A44" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>📐 Dasar Perhitungan Listrik</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                Halaman ini menjelaskan semua rumus yang digunakan PLN Monitor, lengkap dengan peringatan penting
                agar Anda memahami cara membaca estimasi tagihan listrik.
              </div>
            </Card>

            {/* 1. Daya */}
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--warning)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>⚡ 1. Daya Listrik (Watt)</div>
              <div style={{ background: "var(--bg-deep)", borderRadius: 10, padding: 14, marginBottom: 12, border: "1px solid var(--border)", fontFamily: "var(--font-mono)", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--warning)" }}>P = V × I</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Daya (Watt) = Tegangan (Volt) × Arus (Ampere)</div>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 10 }}>
                <strong style={{ color: "#E2E8F0" }}>P</strong> = Daya dalam Watt (W) — energi yang dikonsumsi per detik.<br />
                <strong style={{ color: "#E2E8F0" }}>V</strong> = Tegangan dalam Volt. Di Indonesia standarnya <strong style={{ color: "var(--accent)" }}>{activeVoltage}V</strong> (sesuai pengaturan Anda).<br />
                <strong style={{ color: "#E2E8F0" }}>I</strong> = Arus dalam Ampere (A).
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                Balik rumus untuk cari arus: <span style={{ fontFamily: "var(--font-mono)", color: "var(--info)" }}>I = P ÷ V</span>
                <br />Contoh: AC 840W di {activeVoltage}V → <span style={{ fontFamily: "var(--font-mono)", color: "var(--info)" }}>{(840 / activeVoltage).toFixed(2)}A</span>
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "#78350F22", borderRadius: 8, border: "1px solid #F59E0B33" }}>
                <div style={{ fontSize: 11, color: "#FCD34D", lineHeight: 1.7 }}>
                  ⚠️ <strong>Watt vs VA:</strong> Watt adalah daya <em>nyata</em> (real power). VA (Volt-Ampere) adalah daya <em>semu</em> (apparent power).
                  Keduanya sama hanya jika Power Factor = 1.0. Untuk perangkat dengan motor (AC, kulkas), VA &gt; Watt.
                </div>
              </div>
            </Card>

            {/* 2. Energi */}
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--info)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>🔋 2. Energi Listrik (kWh)</div>
              <div style={{ background: "var(--bg-deep)", borderRadius: 10, padding: 14, marginBottom: 12, border: "1px solid var(--border)", fontFamily: "var(--font-mono)", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--info)" }}>E = P × t ÷ 1000</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Energi (kWh) = Daya (W) × Waktu (jam) ÷ 1000</div>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 10 }}>
                <strong style={{ color: "#E2E8F0" }}>kWh</strong> = kilowatt-hour, satuan yang dipakai PLN untuk mengukur pemakaian listrik.<br />
                Dibagi 1000 karena mengubah Watt menjadi kilowatt (1 kW = 1000 W).
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Kulkas 100W nyala 24 jam", kwh: (100 * 24 / 1000).toFixed(2) },
                  { label: "AC 840W nyala 8 jam", kwh: (840 * 8 / 1000).toFixed(2) },
                  { label: "Lampu LED 9W nyala 10 jam", kwh: (9 * 10 / 1000).toFixed(3) },
                ].map((ex, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-deep)", borderRadius: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{ex.label}</span>
                    <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--info)" }}>{ex.kwh} kWh/hari</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 3. Biaya Bulanan */}
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>💰 3. Estimasi Biaya Bulanan</div>
              <div style={{ background: "var(--bg-deep)", borderRadius: 10, padding: 14, marginBottom: 12, border: "1px solid var(--border)", fontFamily: "var(--font-mono)", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)", lineHeight: 1.8 }}>
                  kWh/bulan = W × jam/hari × 30 ÷ 1000
                  <br />
                  <span style={{ color: "var(--gold)" }}>Biaya = kWh × Rp/kWh</span>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 10 }}>
                PLN Monitor menggunakan <strong style={{ color: "var(--accent)" }}>30 hari</strong> sebagai asumsi satu bulan.
                Tarif Anda saat ini: <span style={{ fontFamily: "var(--font-mono)", color: "var(--gold)", fontWeight: 700 }}>{formatRupiah(rate)}/kWh</span>
              </div>
              <div style={{ padding: "12px 14px", background: "#1E3A2F", borderRadius: 10, border: "1px solid #16A34A44", fontSize: 12, lineHeight: 1.9, color: "#86EFAC" }}>
                <strong>Contoh AC 1 PK (840W, 8 jam/hari):</strong><br />
                → 840W × 8 jam × 30 hari ÷ 1000 = <strong>{(840 * 8 * 30 / 1000).toFixed(1)} kWh/bulan</strong><br />
                → {(840 * 8 * 30 / 1000).toFixed(1)} kWh × {formatRupiah(rate)}/kWh = <strong>{formatRupiah(840 * 8 * 30 / 1000 * rate)}/bulan</strong>
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "#78350F22", borderRadius: 8, border: "1px solid #F59E0B33" }}>
                <div style={{ fontSize: 11, color: "#FCD34D", lineHeight: 1.7 }}>
                  ⚠️ <strong>Estimasi saja:</strong> Tagihan PLN nyata bisa berbeda karena biaya abonemen, pajak, denda, dan tarif blok progresif
                  untuk golongan tertentu. Angka ini hanya untuk perbandingan antar-perangkat.
                </div>
              </div>
            </Card>

            {/* 4. MCB & Arus */}
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>🔴 4. MCB & Batas Arus</div>
              <div style={{ background: "var(--bg-deep)", borderRadius: 10, padding: 14, marginBottom: 12, border: "1px solid var(--border)", fontFamily: "var(--font-mono)", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--danger)" }}>I_total = ΣP ÷ V</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Total Arus = Jumlah Semua Daya (W) ÷ Tegangan ({activeVoltage}V)</div>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 10 }}>
                <strong style={{ color: "#E2E8F0" }}>MCB (Miniature Circuit Breaker)</strong> adalah pengaman listrik yang otomatis trip (putus)
                jika arus melebihi batas. MCB dipilih berdasarkan golongan tarif:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {Object.entries(TARIFF_RATES).slice(0, 5).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", background: "var(--bg-deep)", borderRadius: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{v.name}</span>
                    <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--danger)" }}>MCB {v.mcb}A</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: "10px 12px", background: "#7F1D1D22", borderRadius: 8, border: "1px solid #EF444433" }}>
                <div style={{ fontSize: 11, color: "#FCA5A5", lineHeight: 1.7 }}>
                  ⚠️ <strong>MCB trip ≠ kerusakan.</strong> MCB trip adalah proteksi normal. Tapi jika sering trip, artinya beban terlalu besar — segera kurangi perangkat yang menyala bersamaan.
                  Jangan bypass atau ganti MCB dengan ampere lebih besar tanpa konsultasi teknisi PLN.
                </div>
              </div>
            </Card>

            {/* 5. Power Factor */}
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--purple)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>🔌 5. Power Factor (Faktor Daya)</div>
              <div style={{ background: "var(--bg-deep)", borderRadius: 10, padding: 14, marginBottom: 12, border: "1px solid var(--border)", fontFamily: "var(--font-mono)", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--purple)", lineHeight: 1.8 }}>
                  P_nyata = VA × PF
                  <br />
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>PF = cos(φ), nilai 0.01 – 1.00</span>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 12 }}>
                Power Factor mengukur seberapa efisien perangkat menggunakan listrik.
                PF = 1.0 berarti semua daya semu terpakai sebagai daya nyata (100% efisien).
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {PF_PRESETS.map((p) => (
                  <div key={p.value} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-deep)", borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#CBD5E1" }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.hint}</div>
                    </div>
                    <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--purple)" }}>PF {p.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: "10px 12px", background: "#4C1D9522", borderRadius: 8, border: "1px solid #8B5CF644" }}>
                <div style={{ fontSize: 11, color: "#C4B5FD", lineHeight: 1.7 }}>
                  💡 <strong>Untuk rumah tangga biasa, Anda tidak perlu khawatir soal PF.</strong> PLN menagih berdasarkan kWh (energi nyata).
                  PF di PLN Monitor berguna untuk simulasi apakah total beban melebihi kapasitas daya semu (VA) dari MCB Anda.
                </div>
              </div>
            </Card>

            {/* 6. Biaya per Aktivitas */}
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>📝 6. Biaya per Aktivitas</div>
              <div style={{ background: "var(--bg-deep)", borderRadius: 10, padding: 14, marginBottom: 12, border: "1px solid var(--border)", fontFamily: "var(--font-mono)", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--gold)", lineHeight: 1.8 }}>
                  kWh = W × menit ÷ 60000
                  <br />
                  <span style={{ color: "var(--accent)" }}>Biaya = kWh × Rp/kWh</span>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 10 }}>
                Untuk aktivitas singkat (rebus air, masak nasi, dll), durasi diukur dalam <strong style={{ color: "#E2E8F0" }}>menit</strong>.
                Dibagi 60.000 = dibagi 60 (menit→jam) lalu dibagi 1000 (W→kW).
              </div>
              <div style={{ padding: "12px 14px", background: "#1E3A2F", borderRadius: 10, border: "1px solid #16A34A44", fontSize: 12, lineHeight: 1.9, color: "#86EFAC" }}>
                <strong>Contoh rebus air (kettle 2000W, 5 menit):</strong><br />
                → 2000W × 5 menit ÷ 60.000 = <strong>0.167 kWh</strong><br />
                → 0.167 × {formatRupiah(rate)}/kWh = <strong>{formatRupiah(2000 * 5 / 60000 * rate)}/kali pakai</strong>
              </div>
            </Card>

            {/* Peringatan Umum */}
            <Card style={{ borderColor: "#EF444444" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>⚠️ Peringatan & Keterbatasan</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { icon: "📊", title: "Data tarif bisa berubah", desc: "Tarif PLN yang digunakan adalah data per 2024. PLN dapat mengubah tarif sewaktu-waktu. Cek tarif terbaru di web resmi PLN atau aplikasi PLN Mobile." },
                  { icon: "🌡️", title: "Daya perangkat bervariasi", desc: "Nilai Watt perangkat adalah estimasi. Daya nyata bisa berfluktuasi — AC lebih boros saat start compressor, kulkas bervariasi tergantung suhu ruangan." },
                  { icon: "💡", title: "Standby power tidak dihitung", desc: "Banyak perangkat tetap mengonsumsi listrik saat 'mati' (standby). TV, charger, set-top box, dll. Ini tidak termasuk dalam kalkulasi Perangkat." },
                  { icon: "🔢", title: "Tarif blok progresif", desc: "Beberapa golongan tarif PLN menerapkan tarif berbeda untuk pemakaian rendah vs. tinggi. PLN Monitor menggunakan tarif flat (satu harga per kWh) untuk penyederhanaan." },
                  { icon: "🏠", title: "Tegangan rumah tangga", desc: `Kalkulasi arus (Ampere) menggunakan tegangan ${activeVoltage}V sesuai pengaturan Anda. Ubah di ⚙️ Pengaturan jika tegangan rumah Anda berbeda.` },
                ].map((w, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "10px 12px", background: "var(--bg-deep)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{w.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#E2E8F0", marginBottom: 2 }}>{w.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>{w.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

          </div>
        )}

        {/* SIMULATION */}
        {tab === "simulation" && (
          <SimulationTab
            tariffKey={selectedTariff}
            simDevices={simDevices}
            update={update}
            pfEnabled={pfEnabled}
            pfValue={pfValue}
            isMobile={isMobile}
            voltage={activeVoltage}
          />
        )}
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Add/Edit Device */}
      <Modal open={addDeviceOpen} onClose={() => { setAddDeviceOpen(false); setEditDevice(null); resetDF(); }} title={editDevice ? "Edit Perangkat" : "Tambah Perangkat"} isMobile={isMobile}>
        <InputField label="Nama Perangkat" value={fn} onChange={setFn} placeholder="Contoh: AC Kamar Tidur" />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <InputField label="Daya (Watt)" value={fw} onChange={setFw} type="number" suffix="W" min="0" />
          <InputField label="Jam per Hari" value={fh} onChange={setFh} type="number" suffix="jam" min="0" step="0.25" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <InputField label="Jumlah Unit" value={fq} onChange={setFq} type="number" min="1" />
          <SelectField label="Kategori" value={fc} onChange={setFc} options={CAT_OPTIONS} />
        </div>
        {fw && fh && (
          <div style={{ background: "var(--bg-deep)", borderRadius: 10, padding: 14, marginBottom: 14, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Estimasi Biaya</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
              {formatRupiah(((parseFloat(fw) || 0) * (parseFloat(fh) || 0) * 30 * (parseInt(fq) || 1)) / 1000 * rate)}
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}> /bulan</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {formatKwh(((parseFloat(fw) || 0) * (parseFloat(fh) || 0) * 30 * (parseInt(fq) || 1)) / 1000)} per bulan
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="secondary" onClick={() => { setAddDeviceOpen(false); setEditDevice(null); resetDF(); }}>Batal</Btn>
          <Btn onClick={saveDevice} disabled={!fn || !fw || !fh}>{editDevice ? "💾 Simpan" : "+ Tambah"}</Btn>
        </div>
      </Modal>

      {/* Preset Picker */}
      <Modal open={presetOpen} onClose={() => setPresetOpen(false)} title="📋 Pilih Perangkat" isMobile={isMobile}>
        <InputField label="Cari perangkat" value={presetSearch} onChange={setPresetSearch} placeholder="Ketik nama..." />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: isMobile ? "55vh" : "50vh", overflowY: "auto" }}>
          {filteredPresets.map((p, i) => {
            const cat = CATEGORIES[p.category] || CATEGORIES.custom;
            const kwh = (p.watt * p.hours * 30) / 1000;
            const alreadyAdded = devices.some((d) => d.name === p.name);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--bg-deep)", borderRadius: 10, border: "1px solid var(--border)", opacity: alreadyAdded ? 0.5 : 1 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{cat.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.watt}W · {p.hours}jam/hari · {formatRupiah(kwh * rate)}/bln</div>
                </div>
                <button
                  onClick={() => { if (!alreadyAdded) addPreset(p); }}
                  disabled={alreadyAdded}
                  style={{ background: alreadyAdded ? "var(--border)" : "var(--accent)", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: alreadyAdded ? "default" : "pointer", flexShrink: 0 }}
                >
                  {alreadyAdded ? "✓" : "+ Tambah"}
                </button>
              </div>
            );
          })}
          {filteredPresets.length === 0 && (
            <div style={{ textAlign: "center", padding: 20, color: "var(--text-dim)", fontSize: 13 }}>Tidak ditemukan</div>
          )}
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
          <SelectField label="Kategori" value={ucat} onChange={setUcat} options={CAT_OPTIONS} />
        </div>
        {uw && ud && (
          <div style={{ background: "var(--bg-deep)", borderRadius: 10, padding: 14, marginBottom: 14, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Estimasi Biaya</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--gold)", fontFamily: "var(--font-mono)" }}>
              {formatRupiah((((parseFloat(uw) || 0) * (parseFloat(ud) || 0)) / 60000) * rate * (parseInt(uc) || 1))}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {formatKwh((((parseFloat(uw) || 0) * (parseFloat(ud) || 0)) / 60000) * (parseInt(uc) || 1))} total
            </div>
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
          label="Golongan Tarif PLN"
          value={selectedTariff}
          onChange={(v) => update({ tariff: v })}
          options={Object.entries(TARIFF_RATES).map(([k, v]) => ({ value: k, label: `${v.name} — ${formatRupiah(v.rate)}/kWh` }))}
        />
        <div style={{ background: "var(--bg-deep)", borderRadius: 10, padding: 14, marginBottom: 20, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>Tarif saat ini</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--gold)", fontFamily: "var(--font-mono)" }}>
            {formatRupiah(rate)}<span style={{ fontSize: 12, color: "var(--text-muted)" }}> /kWh</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Kapasitas: {TARIFF_RATES[selectedTariff]?.va} VA · MCB {TARIFF_RATES[selectedTariff]?.mcb}A · {activeVoltage}V
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Tegangan Listrik (Volt)</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
            {[110, 127, 220, 230, 240].map((v) => (
              <button
                key={v}
                onClick={() => update({ voltage: v })}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  background: activeVoltage === v ? "var(--accent)" : "var(--border)",
                  color: activeVoltage === v ? "#fff" : "var(--text-secondary)",
                  transition: "all 0.15s",
                }}
              >
                {v}V
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="number"
              value={voltage || DEFAULT_VOLTAGE}
              min={100}
              max={480}
              step={1}
              onChange={(e) => {
                const v = parseInt(e.target.value) || DEFAULT_VOLTAGE;
                if (v >= 100 && v <= 480) update({ voltage: v });
              }}
              style={{ width: 100, padding: "10px 12px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 16, fontFamily: "var(--font-mono)", fontWeight: 700, outline: "none", textAlign: "center" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>V (kustom, 100–480V)</span>
          </div>
          <div style={{ marginTop: 10, padding: "10px 12px", background: "#78350F22", borderRadius: 8, border: "1px solid #F59E0B33" }}>
            <div style={{ fontSize: 11, color: "#FCD34D", lineHeight: 1.7 }}>
              ⚠️ <strong>Default Indonesia: 220V.</strong> Amerika Serikat umumnya 110V, beberapa negara Eropa 230V.
              Nilai tegangan mempengaruhi kalkulasi arus (Ampere) di tab Simulasi.
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Data</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn variant="secondary" onClick={exportData} style={{ flex: 1 }}>📤 Export Backup</Btn>
            <Btn variant="secondary" onClick={importData} style={{ flex: 1 }}>📥 Import Backup</Btn>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Zona Bahaya</div>
          <Btn variant="danger" onClick={clearAll} style={{ width: "100%" }}>🗑 Hapus Semua Data</Btn>
        </div>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        danger={confirmState?.danger}
        onConfirm={confirmState?.onConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
