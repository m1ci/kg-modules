export default async function mount(el, context) {

  // =====================================
  // CONFIG
  // =====================================

  const databus_endpoint = context.databus_endpoint;
  const group = context.group;
  const variant = context.variant;

  const query = `
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX databus: <https://dataid.dbpedia.org/databus#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT ?versionNumber (SUM(xsd:integer(?size)) AS ?totalSize)
WHERE {
  ?version databus:group <${group}> ;
           dct:hasVersion ?versionNumber ;
           dcat:distribution ?distribution .

  ?distribution dcat:byteSize ?size .
                
}
GROUP BY ?versionNumber
ORDER BY ?versionNumber
  `;

  // =====================================
  // UI
  // =====================================

  el.innerHTML = `
    <h2>${context.kgName || "Unknown"} Knowledge Graph Evolution</h2>

    <p style="color:#555; line-height:1.7; margin-bottom:24px;">
      This visualization shows the evolution of the knowledge graph size across versions.
    </p>

    <div style="width:100%; overflow-x:auto;">
      <canvas></canvas>
    </div>
  `;

  const canvas = el.querySelector("canvas");

  await ensureChartJS();

  // =====================================
  // FETCH DATA
  // =====================================

  const raw = await fetchSparql(databus_endpoint, query);

  if (!raw.length) {
    el.innerHTML += "<p>No data available.</p>";
    return;
  }

  // =====================================
  // ANALYZE SIZE RANGE
  // =====================================

  const sizesBytes = raw.map(r => Number(r.totalSize.value));

  const minBytes = Math.min(...sizesBytes);
  const maxBytes = Math.max(...sizesBytes);
  const diffBytes = maxBytes - minBytes;

  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;

  let divisor;
  let unit;

  // If variation is less than 1 GB,
  // show MB so differences remain visible.
  if (maxBytes >= GB && diffBytes < GB) {
    divisor = MB;
    unit = "MB";
  } else if (maxBytes >= GB) {
    divisor = GB;
    unit = "GB";
  } else if (maxBytes >= MB) {
    divisor = MB;
    unit = "MB";
  } else if (maxBytes >= KB) {
    divisor = KB;
    unit = "KB";
  } else {
    divisor = 1;
    unit = "B";
  }

  // =====================================
  // TRANSFORM DATA
  // =====================================

  const data = raw.map(r => ({
    version: r.versionNumber.value,
    size: Number(r.totalSize.value) / divisor
  }));

  data.sort((a, b) =>
    a.version.localeCompare(b.version)
  );

  // =====================================
  // Y AXIS RANGE
  // =====================================

  const minSize = Math.min(...data.map(d => d.size));
  const maxSize = Math.max(...data.map(d => d.size));

  const padding =
    Math.max(
      (maxSize - minSize) * 0.1,
      maxSize * 0.01
    );

  // =====================================
  // CHART
  // =====================================

  new Chart(canvas, {
    type: "line",

    data: {
      labels: data.map(d => d.version),

      datasets: [{
        label: `Total Size (${unit})`,
        data: data.map(d => d.size),

        tension: 0.2,

        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },

    options: {
      responsive: true,

      plugins: {
        legend: {
          display: true
        },

        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.parsed.y.toFixed(3)} ${unit}`
          }
        }
      },

      scales: {

        x: {
          title: {
            display: true,
            text: "Version"
          }
        },

        y: {
          title: {
            display: true,
            text: `Size (${unit})`
          },

          beginAtZero: false,

          min: minSize - padding,
          max: maxSize + padding,

          ticks: {
            callback: value => Number(value).toFixed(2)
          }
        }
      }
    }
  });
}


// =====================================
// SPARQL FETCHER
// =====================================

async function fetchSparql(endpoint, query) {

  const url =
    endpoint +
    "?query=" +
    encodeURIComponent(query) +
    "&format=json";

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`SPARQL request failed: ${res.status}`);
  }

  const json = await res.json();

  return json.results.bindings;
}


// =====================================
// LOAD CHART.JS
// =====================================

function ensureChartJS() {

  if (window.Chart) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {

    const script = document.createElement("script");

    script.src =
      "https://cdn.jsdelivr.net/npm/chart.js";

    script.onload = resolve;
    script.onerror = reject;

    document.head.appendChild(script);
  });
}