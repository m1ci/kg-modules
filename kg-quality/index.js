const API_URL = "https://kgheartbeat.di.unisa.it/kgheartbeat-api/score/score_data";
const ECHARTS_URL = "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js";

const DIMENSION_LABELS = {
  availability: "Availability",
  licensing: "Licensing",
  interlinking: "Interlinking",
  performance: "Performance",
  accuracy: "Accuracy",
  consistency: "Consistency",
  conciseness: "Conciseness",
  verifiability: "Verifiability",
  reputation: "Reputation",
  believability: "Believability",
  currency: "Currency",
  volatility: "Volatility",
  completeness: "Completeness",
  amount: "Amount of Data",
  repcons: "Representational Consistency",
  repconc: "Representational Conciseness",
  underst: "Understandability",
  interpretability: "Interpretability",
  versatility: "Versatility",
  security: "Security"
};

export default async function mount(el, context = {}) {
  const kgId = String(context.kgId || "").trim();
  const kgName = context.kgName || kgId || "Knowledge Graph";

  el.innerHTML = `
    <style>
      .kgq { color:#172033; font:14px/1.5 Arial,sans-serif; }
      .kgq * { box-sizing:border-box; }
      .kgq-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
      .kgq h2 { color:#1d3557; margin:0 0 8px; }
      .kgq p { margin:0; }
      .kgq-muted { color:#64748b; }
      .kgq-toolbar { display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin:8px 0 8px; }
      .kgq-toolbar label { color:#334155; font-weight:600; }
      .kgq-select { min-width:180px; padding:9px 34px 9px 11px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; color:#172033; font:inherit; }
      .kgq-overall-wrap { position:relative; display:flex; align-items:stretch; margin-left:auto; overflow:visible; border:1px solid #bfdbfe; border-radius:8px; background:#eff6ff; color:#1d4ed8; font-weight:600; }
      .kgq-overall { padding:8px 10px; }
      .kgq-info-button { display:inline-grid; place-items:center; align-self:center; width:21px; height:21px; margin:0 7px 0 0; padding:0; border:1px solid #94a3b8; border-radius:50%; background:#f8fafc; color:#475569; cursor:pointer; font:700 12px/1 Arial,sans-serif; }
      .kgq-info-button:hover, .kgq-info-button:focus-visible { border-color:#475569; background:#e2e8f0; color:#1e293b; outline:2px solid #93c5fd; outline-offset:2px; }
      .kgq-score-info { position:absolute; z-index:3; top:calc(100% + 8px); right:0; width:min(360px, calc(100vw - 32px)); padding:12px 14px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; box-shadow:0 3px 10px rgba(15,23,42,.18); color:#334155; font-size:13px; font-weight:400; }
      .kgq-score-info p + p { margin-top:7px; }
      .kgq-score-info a { display:inline-flex; align-items:center; gap:4px; color:#1d4ed8; font-weight:600; white-space:nowrap; }
      .kgq-attribution { margin:0 0 4px; font-size:12px; text-align:right; }
      .kgq-attribution a { color:inherit; text-decoration:underline; }
      .kgq-attribution a:hover { color:#1d4ed8; }
      .kgq-link { display:inline-flex; align-items:center; gap:6px; flex:none; margin:2px 0 0; color:#1d4ed8; font-weight:600; text-decoration:none; }
      .kgq-link:hover { color:#1e40af; text-decoration:underline; }
      .kgq-chart-card { position:relative; overflow:hidden; margin-top:4px; border:1px solid #e2e8f0; border-radius:18px; background:radial-gradient(ellipse at 50% 42%,#f8fbff 0%,#fff 68%); box-shadow:0 12px 32px rgba(15,23,42,.08); }
      .kgq-chart { width:100%; height:600px; min-height:440px; }
      .kgq-point-tooltip { position:absolute; z-index:2; max-width:230px; padding:10px 13px; border:1px solid rgba(255,255,255,.18); border-radius:10px; background:rgba(15,23,42,.95); box-shadow:0 8px 24px rgba(15,23,42,.22); color:#fff; pointer-events:none; }
      .kgq-point-tooltip strong { display:block; margin-bottom:2px; font-size:12px; color:#cbd5e1; }
      .kgq-point-tooltip span { font-size:19px; font-weight:700; }
      .kgq-error { margin-top:16px; padding:14px; border:1px solid #fecaca; border-radius:10px; background:#fef2f2; color:#991b1b; }
      @media(max-width:640px) { .kgq-header { align-items:flex-start; } .kgq-link { font-size:12px; } .kgq-chart { height:500px; min-height:420px; } .kgq-overall-wrap { margin-left:0; } }
    </style>
    <section class="kgq" aria-live="polite">
      <div class="kgq-header">
        <h2>${escapeHTML(kgName)} Quality</h2>
      </div>
      <p class="kgq-muted kgq-loading" style="margin-top:18px">Loading quality history…</p>
      <div class="kgq-content" hidden>
        <div class="kgq-toolbar">
          <label for="kgq-analysis-date">Analysis date</label>
          <select class="kgq-select" id="kgq-analysis-date" aria-label="Choose a quality analysis date"></select>
          <div class="kgq-overall-wrap">
            <span class="kgq-overall"></span>
            <button class="kgq-info-button" type="button" aria-label="How the overall quality score is calculated" aria-expanded="false" aria-controls="kgq-score-info">i</button>
            <div class="kgq-score-info" id="kgq-score-info" hidden>
              <p>Each quality dimension is calculated from one or more metrics. <a href="https://isislab-unisa.github.io/KGHeartBeat/" target="_blank" rel="noopener noreferrer">Inspect the dimension calculations <span aria-hidden="true">↗</span></a></p>
              <p>The Overall Quality score averages the metric values within each dimension, then sums the dimension values and normalizes the result to a 0–100 scale.</p>
            </div>
          </div>
        </div>
        <p class="kgq-muted kgq-date-caption" style="margin:0 0 6px"></p>
        <p class="kgq-muted kgq-attribution">The KG quality computation was provided by <a href="https://kgheartbeat.di.unisa.it/" target="_blank" rel="noopener noreferrer">KGHeartBeat</a>.</p>
        <div class="kgq-chart-card">
          <div class="kgq-chart" role="img" aria-label="Radar chart showing quality scores for 20 dimensions"></div>
          <div class="kgq-point-tooltip" hidden><strong></strong><span></span></div>
        </div>
      </div>
    </section>
  `;

  const root = el.querySelector(".kgq");
  try {
    if (!kgId) throw new Error("No kgId was provided in the module context.");
    const [payload] = await Promise.all([fetchQualityHistory(kgId), ensureECharts()]);
    const history = normalizeHistory(payload, kgId);
    if (!history.length) throw new Error(`No dated quality reports were found for KG "${kgId}".`);
    renderHistory(root, history, kgName, kgId);
  } catch (error) {
    renderError(root, error);
  }
}

// GET /kgheartbeat-api/score/score_data?id=<kgId>
async function fetchQualityHistory(kgId) {
  const url = new URL(API_URL);
  url.searchParams.set("id", kgId);
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`KGHeartBeat request failed (${response.status} ${response.statusText}).`);
  return response.json();
}

function normalizeHistory(payload, kgId) {
  const records = Array.isArray(payload)
    ? payload
    : payload?.data || payload?.results || payload?.history || [];

  return records
    .filter(record => !record.kg_id || String(record.kg_id).toLowerCase() === kgId.toLowerCase())
    .map(record => {
      const scoreData = record.Score || record.score || record.scores || {};
      const dimensions = Object.entries(scoreData)
        .filter(([key, value]) => /ScoreValue$/i.test(key) && Number.isFinite(Number(value)))
        .map(([key, value]) => {
          const dimensionKey = key.replace(/ScoreValue$/i, "").toLowerCase();
          return { name: DIMENSION_LABELS[dimensionKey] || toLabel(dimensionKey), score: clamp(Number(value) * 100, 0, 100) };
        });

      return {
        date: String(record.analysis_date || record.analysisDate || record.date || ""),
        dimensions,
        overall: Number(scoreData.normalizedScore ?? record.normalizedScore)
      };
    })
    .filter(record => record.date && record.dimensions.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function renderHistory(root, history, kgName, kgId) {
  root.querySelector(".kgq-loading")?.remove();
  const content = root.querySelector(".kgq-content");
  const select = root.querySelector(".kgq-select");
  const chartElement = root.querySelector(".kgq-chart");
  const tooltip = root.querySelector(".kgq-point-tooltip");
  const scoreInfoButton = root.querySelector(".kgq-info-button");
  const scoreInfo = root.querySelector(".kgq-score-info");

  const closeScoreInfo = () => {
    scoreInfo.hidden = true;
    scoreInfoButton.setAttribute("aria-expanded", "false");
  };
  scoreInfoButton.addEventListener("click", () => {
    const willOpen = scoreInfo.hidden;
    scoreInfo.hidden = !willOpen;
    scoreInfoButton.setAttribute("aria-expanded", String(willOpen));
  });
  document.addEventListener("click", event => {
    if (!scoreInfo.hidden && !event.composedPath().includes(scoreInfoButton) && !event.composedPath().includes(scoreInfo)) closeScoreInfo();
  });
  scoreInfoButton.addEventListener("keydown", event => {
    if (event.key === "Escape") closeScoreInfo();
  });
  scoreInfo.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeScoreInfo();
      scoreInfoButton.focus();
    }
  });

  select.innerHTML = history.map((record, index) =>
    `<option value="${index}">${escapeHTML(formatDate(record.date))}${index === 0 ? " (Latest)" : ""}</option>`
  ).join("");
  content.hidden = false;

  const chart = window.echarts.init(chartElement);
  let activeRecord = history[0];
  const update = index => {
    const record = history[index];
    activeRecord = record;
    tooltip.hidden = true;
    root.querySelector(".kgq-overall").textContent = Number.isFinite(record.overall)
      ? `Overall Quality Score: ${record.overall.toFixed(2)} / 100`
      : "Overall score unavailable";
    root.querySelector(".kgq-date-caption").textContent = index === 0
      ? `Latest available analysis · ${formatDate(record.date)}`
      : `Historical analysis · ${formatDate(record.date)}`;

    chart.setOption({
      animationDuration: 350,
      color: ["#2878d0"],
      tooltip: { show: false },
      radar: {
        indicator: record.dimensions.map(dimension => ({ name: dimension.name, max: 100 })),
        shape: "polygon",
        startAngle: 90,
        splitNumber: 5,
        center: [chartElement.clientWidth / 2, chartElement.clientHeight / 2],
        radius: radarRadius(chartElement),
        axisNameGap: 12,
        axisName: { color: "#334155", fontSize: 11, fontWeight: 600 },
        splitLine: { lineStyle: { color: ["#e9eef6", "#e1e9f4", "#d7e2f0", "#cedced", "#c5d6e9"], width: 1 } },
        splitArea: { areaStyle: { color: ["rgba(37,99,235,0.015)", "rgba(37,99,235,0.045)"] } },
        axisLine: { lineStyle: { color: "#cbd5e1", width: 1 } }
      },
      series: [{
        name: `${kgName} quality`,
        type: "radar",
        data: [{
          name: kgName,
          value: record.dimensions.map(dimension => dimension.score),
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 3, shadowBlur: 12, shadowColor: "rgba(37,99,235,.32)" },
          itemStyle: { color: "#2563eb", borderColor: "#fff", borderWidth: 2, shadowBlur: 10, shadowColor: "rgba(37,99,235,.35)" },
          areaStyle: { color: new window.echarts.graphic.RadialGradient(0.5, 0.5, 1, [
            { offset: 0, color: "rgba(56,189,248,.28)" },
            { offset: 1, color: "rgba(37,99,235,.12)" }
          ]) }
        }]
      }]
    }, true);
  };

  select.addEventListener("change", () => update(Number(select.value)));
  update(0);

  chartElement.addEventListener("mousemove", event => {
    const rect = chartElement.getBoundingClientRect();
    const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const center = { x: rect.width / 2, y: rect.height / 2 };
    const radius = radarRadius(chartElement);
    let nearest = null;

    activeRecord.dimensions.forEach((dimension, index) => {
      // ECharts v5 places each successive indicator at startAngle + index * step.
      const angle = (90 + index * 360 / activeRecord.dimensions.length) * Math.PI / 180;
      const distanceFromCenter = radius * dimension.score / 100;
      const point = {
        x: center.x + distanceFromCenter * Math.cos(angle),
        y: center.y - distanceFromCenter * Math.sin(angle)
      };
      const distance = Math.hypot(pointer.x - point.x, pointer.y - point.y);
      if (!nearest || distance < nearest.distance) nearest = { dimension, point, distance };
    });

    if (!nearest || nearest.distance > 15) {
      tooltip.hidden = true;
      return;
    }

    tooltip.querySelector("strong").textContent = nearest.dimension.name;
    tooltip.querySelector("span").textContent = formatScore(nearest.dimension.score);
    tooltip.hidden = false;
    const parentRect = tooltip.parentElement.getBoundingClientRect();
    const left = pointer.x + chartElement.offsetLeft + 14;
    const top = pointer.y + chartElement.offsetTop + 14;
    tooltip.style.left = `${clamp(left, 8, parentRect.width - tooltip.offsetWidth - 8)}px`;
    tooltip.style.top = `${clamp(top, 8, parentRect.height - tooltip.offsetHeight - 8)}px`;
  });
  chartElement.addEventListener("mouseleave", () => { tooltip.hidden = true; });

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => {
      chart.resize();
      chart.setOption({ radar: { center: [chartElement.clientWidth / 2, chartElement.clientHeight / 2], radius: radarRadius(chartElement) } });
      tooltip.hidden = true;
    });
    observer.observe(chartElement);
  } else {
    window.addEventListener("resize", () => chart.resize());
  }
}

function radarRadius(element) {
  return Math.min(element.clientWidth * 0.31, element.clientHeight * 0.36, 230);
}

function ensureECharts() {
  if (window.echarts) return Promise.resolve();
  if (window.__kgQualityEChartsPromise) return window.__kgQualityEChartsPromise;
  window.__kgQualityEChartsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = ECHARTS_URL;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Apache ECharts from jsDelivr."));
    document.head.appendChild(script);
  });
  return window.__kgQualityEChartsPromise;
}

function renderError(root, error) {
  if (!root) return;
  root.querySelector(".kgq-loading")?.remove();
  const message = document.createElement("div");
  message.className = "kgq-error";
  message.innerHTML = `<strong>Could not load KGHeartBeat quality history.</strong><br>${escapeHTML(error?.message || "Unknown error")}`;
  root.append(message);
}

function toLabel(value) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, char => char.toUpperCase());
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatScore(value) {
  return `${Number(value).toFixed(2)} / 100`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
