export default async function mount(el, context) {

  const moss_endpoint = context.moss_endpoint;
  const group = context.group;

  // =====================================
  // UI
  // =====================================

  el.innerHTML = `
    <h2>${context.kgName  || "Unknown"} "Knowledge Graph Evolution"}</h2>

    <p style="color:#555; line-height:1.7; margin-bottom:24px;">
This visualization shows how the size of the knowledge graph (measured in triples) evolves across different versions.
    </p>

    <div style="width:100%; overflow-x:auto;">
      <canvas></canvas>
    </div>
  `;

  const canvas = el.querySelector("canvas");

  await ensureChartJS();

  // =====================================
  // SPARQL QUERY (YOUR QUERY, FIXED GROUP)
  // =====================================

  const query = `
PREFIX databus: <https://dataid.dbpedia.org/databus#>
PREFIX void: <http://rdfs.org/ns/void#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT ?version (SUM(?triples) AS ?totalTriples)
WHERE {
  {
    SELECT ?version ?file (MAX(xsd:integer(?triples)) AS ?triples)
    WHERE {
      ?file a databus:Part ;
            void:triples ?triples .

      FILTER(STRSTARTS(
        STR(?file),
        "${group}"
      ))

      BIND(
        STRBEFORE(
          STRAFTER(
            STR(?file),
            "${group}"
          ),
          "#"
        ) AS ?path
      )

      BIND(
        REPLACE(?path, "^.*/", "") AS ?version
      )
    }
    GROUP BY ?version ?file
  }
}
GROUP BY ?version
ORDER BY DESC(?version)
`;

  // =====================================
  // FETCH DATA
  // =====================================

  const raw = await fetchSparql(moss_endpoint, query);

  if (!raw.length) {
    el.innerHTML += "<p>No data available.</p>";
    return;
  }

  // =====================================
  // TRANSFORM
  // =====================================

  const data = raw.map(r => ({
    version: r.version.value,
    triples: Number(r.totalTriples.value)
  }));

  data.sort((a, b) =>
    a.version.localeCompare(b.version)
  );

  // ===================s==================
  // RANGE
  // =====================================

  const minVal = Math.min(...data.map(d => d.triples));
  const maxVal = Math.max(...data.map(d => d.triples));

  const padding =
    Math.max(
      (maxVal - minVal) * 0.1,
      maxVal * 0.01
    );

  // =====================================
  // CHART
  // =====================================

  new Chart(canvas, {
    type: "line",

    data: {
      labels: data.map(d => d.version),

      datasets: [{
        label: "Total Triples",
        data: data.map(d => d.triples),

        tension: 0.25,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },

    options: {
      responsive: true,

      plugins: {
        legend: { display: true },

        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.parsed.y.toLocaleString()} triples`
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
            text: "Total Triples"
          },

          beginAtZero: false,

          min: minVal - padding,
          max: maxVal + padding,

          ticks: {
            callback: v => Number(v).toLocaleString()
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
// CHART LOADER
// =====================================

function ensureChartJS() {

  if (window.Chart) return Promise.resolve();

  return new Promise((resolve, reject) => {

    const script = document.createElement("script");

    script.src =
      "https://cdn.jsdelivr.net/npm/chart.js";

    script.onload = resolve;
    script.onerror = reject;

    document.head.appendChild(script);
  });
}