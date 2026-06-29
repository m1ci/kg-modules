export default async function mount(el, context) {

  const databus_endpoint = context.databus_endpoint;
  const artifact = context.artifact;

  el.innerHTML = `
    <h2>${context.kgName || "Unknown"} KG Versions</h2>

    <p class="section-description">
      Browse available releases including dataset sizes and download links.
    </p>

    <p>Loading versions...</p>
  `;

  const versions = await fetchVersions(databus_endpoint, artifact);

  versions.sort((a, b) =>
    new Date(a.version.replace(/\./g, "-")) -
    new Date(b.version.replace(/\./g, "-"))
  );

  renderTable(el, versions.reverse(), artifact, context);
}


// ====================================================
// FETCH VERSIONS
// ====================================================

async function fetchVersions(endpoint, artifact) {

  const query = `
    PREFIX dcat: <http://www.w3.org/ns/dcat#>
    PREFIX databus: <https://dataid.dbpedia.org/databus#>

    SELECT ?version ?size ?downloadURL WHERE {

      ?version databus:artifact <${artifact}> .

      ?version dcat:distribution ?dist .

      ?dist dcat:byteSize ?size ;
            dcat:downloadURL ?downloadURL .
    }
  `;

  const rows = await fetchSparql(endpoint, query);

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

  const res = await fetch(url);
  const json = await res.json();

  return json.results.bindings;
}


// ====================================================
// VERSION EXTRACTOR
// ====================================================

function extractVersion(uri) {
  return uri.split("/").pop();
}


// ====================================================
// RENDER TABLE
// ====================================================

function renderTable(el, data, artifact, context) {

  el.innerHTML = `
    <h2>${context.kgName || "Unknown"} KG Versions</h2>

    <p class="section-description">
      Browse available releases including dataset sizes and download links.
    </p>

    <table>

      <thead>
        <tr>
          <th>Version</th>
          <th>Size (bytes)</th>
          <th>Download</th>
        </tr>
      </thead>

      <tbody></tbody>

    </table>
  `;

  const tbody = el.querySelector("tbody");

  data.forEach(d => {

    const databusURL = `${artifact}/${d.version}`;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        ${d.version}
        <br>
        <a href="${databusURL}" target="_blank">
          View on DBpedia Databus
        </a>
      </td>

      <td>
        ${d.size.toLocaleString()}
      </td>

      <td>
        <a href="${d.downloadURL}" target="_blank">
          Download
        </a>
      </td>
    `;

    tbody.appendChild(tr);
  });
}