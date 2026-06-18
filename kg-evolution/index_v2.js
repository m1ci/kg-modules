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

  ?distribution <https://dataid.dbpedia.org/databus-cv#graph> "${variant}" ;
                dcat:byteSize ?size .
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
    el.innerHTML += `<p>No data available.</p>`;
    return;
  }

  // =====================================
  // DETERMINE BEST UNIT FOR ENTIRE DATASET
  // =====================================

  const maxBytes = Math.max(
    ...raw.map(r => Number(r.totalSize.value))
  );

  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;

  let divisor = 1;
  let unit = "B";

  if (maxBytes >= GB) {
    divisor = GB;
    unit = "GB";
  } else if (maxBytes >= MB) {
    divisor = MB;
    unit = "MB";
  } else if (maxBytes >= KB) {
    divisor = KB;
    unit = "KB";
  }

  // =====================================
  // TRANSFORM DATA
  // =====================================

  const data = raw.map(r => ({
    version: r.versionNumber.value,
    size: Number(r.totalSize.value) / divisor
  }));

  // =====================================
  // SORT CHRONOLOGICALLY
  // =====================================

  data.sort((a, b) =>
    a.version.localeCompare(b.version)
  );

  // =====================================
  // RENDER CHART
  // =====================================

  new Chart(canvas, {
    type: "line",

    data: {
      labels: data.map(d => d.version),

      datasets: [{
        label: `Total Size (${unit})`,
        data: data.map(d => d.size),
        tension: 0.2
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
            label: (context) =>
              `${context.parsed.y.toFixed(2)} ${unit}`
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
          ticks: {
            callback: value => Number(value).toFixed(1)
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

    script.src = "https://cdn.jsdelivr.net/npm/chart.js";

    script.onload = resolve;
    script.onerror = reject;

    document.head.appendChild(script);
  });
}