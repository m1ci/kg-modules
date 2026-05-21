export default async function mount(el, context) {

  // --------------------------------------------------
  // CONFIG FROM KG
  // --------------------------------------------------

  const databus_endpoint = context.databus_endpoint;
  const moss_endpoint = context.moss_endpoint;

  const artifact = context.artifact;

  // --------------------------------------------------
  // INITIAL UI
  // --------------------------------------------------

  el.innerHTML = `
    <h2>${context.kgName || "unknown"} KG Versions</h2>

    <p class="section-description">
      Browse available ORKG releases including dataset sizes, triple counts, and direct download links from DBpedia Databus.
    </p>

    <p>Loading versions...</p>
  `;

  // --------------------------------------------------
  // FETCH DATA
  // --------------------------------------------------

  const [triples, distributions] =
    await Promise.all([
      fetchTriples(moss_endpoint, artifact),
      fetchDistributions(databus_endpoint, artifact)
    ]);

  // --------------------------------------------------
  // MERGE
  // --------------------------------------------------

  const merged =
    merge(triples, distributions);

  const chronological =
    sortAsc(merged);

  const newestFirst =
    [...chronological].reverse();

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  renderTable(el, newestFirst, artifact);
}


// ====================================================
// FETCH TRIPLES
// ====================================================

async function fetchTriples(endpoint, artifact) {

  const query = `

    PREFIX void: <http://rdfs.org/ns/void#>

    SELECT ?version ?triples WHERE {

      ?version void:triples ?triples .

      FILTER(
        STRSTARTS(
          STR(?version),
          "${artifact}/"
        )
      )
    }
  `;

  const rows =
    await fetchSparql(endpoint, query);

  return rows.map(r => ({
    version: extractVersion(r.version.value),
    triples: Number(r.triples.value)
  }));
}


// ====================================================
// FETCH DISTRIBUTIONS
// ====================================================

async function fetchDistributions(endpoint, artifact) {

  const query = `
    PREFIX dcat: <http://www.w3.org/ns/dcat#>
    PREFIX databus: <https://dataid.dbpedia.org/databus#>

    SELECT ?version ?size ?downloadURL WHERE {

      ?version databus:artifact
        <${artifact}> .

      ?version dcat:distribution ?dist .

      ?dist dcat:byteSize ?size .
      ?dist dcat:downloadURL ?downloadURL .
    }
  `;

  const rows =
    await fetchSparql(endpoint, query);

  return rows.map(r => ({
    version: extractVersion(r.version.value),
    size: Number(r.size.value),
    downloadURL: r.downloadURL.value
  }));
}


// ====================================================
// SPARQL HELPER
// ====================================================

async function fetchSparql(endpoint, query) {

  const url =
    endpoint +
    "?query=" +
    encodeURIComponent(query) +
    "&format=json";

  const res =
    await fetch(url);

  const json =
    await res.json();

  return json.results.bindings;
}


// ====================================================
// VERSION EXTRACTOR
// ====================================================

function extractVersion(uri) {
  return uri.split("/").pop();
}


// ====================================================
// MERGE DATA
// ====================================================

function merge(triples, versions) {

  const map = new Map();

  triples.forEach(d => {

    map.set(d.version, {
      version: d.version,
      triples: d.triples
    });
  });

  versions.forEach(d => {

    if (!map.has(d.version)) {

      map.set(d.version, {
        version: d.version
      });
    }

    map.get(d.version).size =
      d.size;

    map.get(d.version).downloadURL =
      d.downloadURL;
  });

  return Array.from(map.values());
}


// ====================================================
// SORT CHRONOLOGICALLY
// ====================================================

function sortAsc(data) {

  return data.sort((a, b) =>

    new Date(
      a.version.replace(/\./g, "-")
    ) -

    new Date(
      b.version.replace(/\./g, "-")
    )
  );
}


// ====================================================
// RENDER TABLE
// ====================================================

function renderTable(el, data, artifact) {

  el.innerHTML = `
    <h2>KG Versions</h2>

    <p class="section-description">
      Browse available releases including dataset sizes,
      triple counts, and download links.
    </p>

    <table>

      <thead>
        <tr>
          <th>Version</th>
          <th>Triples</th>
          <th>Size (bytes)</th>
          <th>Download</th>
        </tr>
      </thead>

      <tbody></tbody>

    </table>
  `;

  const tbody =
    el.querySelector("tbody");

  data.forEach(d => {

    const databusURL =
      `${artifact}/${d.version}`;

    const tr =
      document.createElement("tr");

    tr.innerHTML = `
      <td>
        ${d.version}
        <br>

        <a href="${databusURL}"
           target="_blank">
          View on DBpedia Databus
        </a>
      </td>

      <td>
        ${d.triples?.toLocaleString() ?? "-"}
      </td>

      <td>
        ${d.size?.toLocaleString() ?? "-"}
      </td>

      <td>
        ${
          d.downloadURL
            ? `<a href="${d.downloadURL}" target="_blank">Download</a>`
            : "-"
        }
      </td>
    `;

    tbody.appendChild(tr);
  });
}