export default async function mount(el, context) {

  // =====================================
  // CONFIG
  // =====================================

  const moss_endpoint = context.moss_endpoint;

  // -------------------------------------
  // OPTIONAL CONFIGURATION
  // -------------------------------------

  // allows individual KGs to override query
  const query =
    context.queryTriples ||

    `
    PREFIX void: <http://rdfs.org/ns/void#>

    SELECT ?version ?triples WHERE {

      ?version void:triples ?triples .

    }
    `;

  // =====================================
  // INITIAL UI
  // =====================================

  el.innerHTML = `
    <h2>${context.kgName || "unknown"} Knowledge Graph Evolution</h2>

    <p style="
      color:#555;
      line-height:1.7;
      margin-bottom:24px;
    ">
      This visualization illustrates the evolution of the
      knowledge graph by tracking RDF triple counts across
      published versions.
    </p>

    <div style="width:100%; overflow-x:auto;">
      <canvas height="120"></canvas>
    </div>
  `;

  const canvas = el.querySelector("canvas");

  // =====================================
  // LOAD CHART.JS
  // =====================================

  await ensureChartJS();

  // =====================================
  // FETCH DATA
  // =====================================

  const raw =
    await fetchSparql(moss_endpoint, query);

  // =====================================
  // TRANSFORM
  // =====================================

  const data = raw.map(r => {

    const version =
      extractVersion(r.version.value);

    return {
      version,
      triples: Number(r.triples.value)
    };
  });

  // =====================================
  // SORT CHRONOLOGICALLY
  // =====================================

  data.sort((a, b) => {

    return new Date(
      a.version.replace(/\./g, "-")
    ) -

    new Date(
      b.version.replace(/\./g, "-")
    );
  });

  // =====================================
  // RENDER CHART
  // =====================================

  new Chart(canvas, {

    type: "line",

    data: {

      labels:
        data.map(d => d.version),

      datasets: [{

        label: "Triples",

        data:
          data.map(d => d.triples),

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
            text: "Number of Triples"
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
// VERSION EXTRACTOR
// =====================================

function extractVersion(uri) {

  return uri
    .split("/")
    .pop();
}


// =====================================
// LOAD CHART.JS
// =====================================

function ensureChartJS() {

  if (window.Chart) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {

    const script =
      document.createElement("script");

    script.src =
      "https://cdn.jsdelivr.net/npm/chart.js";

    script.onload = resolve;

    script.onerror = reject;

    document.head.appendChild(script);
  });
}