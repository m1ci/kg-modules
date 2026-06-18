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
    <h2>${context.kgName || "unknown"} Knowledge Graph Evolution</h2>

    <p style="color:#555; line-height:1.7; margin-bottom:24px;">
      This visualization illustrates the evolution of the knowledge graph by tracking the size of published versions.
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

  // =====================================
  // TRANSFORM
  // =====================================

  const data = raw.map(r => ({
    version: r.versionNumber.value,
    size: Number(r.totalSize.value)
  }));

  // =====================================
  // SORT (chronological, safe for YYYY-MM-DD or version strings)
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
        label: "Total Size",
        data: data.map(d => d.size),
        tension: 0.2
      }]
    },

    options: {
      responsive: true,

      plugins: {
        legend: {
          display: true
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
            text: "Size (bytes)"
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
  const json = await res.json();

  return json.results.bindings;
}


// =====================================
// LOAD CHART.JS
// =====================================

function ensureChartJS() {
  if (window.Chart) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}