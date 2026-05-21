export default async function mount(el, context) {
  // --------------------------------------------
  // 1. CONFIG FROM KG (ONLY CONNECTION INFO)
  // --------------------------------------------
  const endpoint = context.endpoint;

  el.innerHTML = `<p>Loading KG evolution...</p>`;

  // --------------------------------------------
  // 2. SPARQL QUERY (module-defined logic)
  // --------------------------------------------
  const query = `
    PREFIX void: <http://rdfs.org/ns/void#>

    SELECT ?version ?triples WHERE {
      ?version void:triples ?triples .
    }
  `;

  // --------------------------------------------
  // 3. FETCH DATA (module controls data access)
  // --------------------------------------------
  const raw = await fetchSparql(endpoint, query);

  // --------------------------------------------
  // 4. TRANSFORM DATA (module intelligence)
  // --------------------------------------------
  const data = raw.map(row => ({
    version: extractVersion(row.version.value),
    triples: Number(row.triples.value)
  }));

  // sort chronologically (optional logic inside module)
  data.sort((a, b) => a.version.localeCompare(b.version));

  // --------------------------------------------
  // 5. RENDER UI
  // --------------------------------------------
  el.innerHTML = `<canvas></canvas>`;

  const ctx = el.querySelector("canvas");

  ensureChartJS().then(() => {
    new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map(d => d.version),
        datasets: [{
          label: "Triples over time",
          data: data.map(d => d.triples),
          tension: 0.2
        }]
      }
    });
  });
}


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

function extractVersion(uri) {
  return uri.split("/").pop();
}

function ensureChartJS() {
  if (window.Chart) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/chart.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}