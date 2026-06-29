export default async function mount(el, context) {

  const databus_endpoint = context.databus_endpoint;
  const group = context.group;

  el.innerHTML = `
    <h2>${context.kgName || "Unknown"} KG Versions</h2>

    <p class="section-description">
      Browse available releases including dataset sizes and download links.
    </p>

    <p>Loading versions...</p>
  `;

  const files = await fetchVersions(databus_endpoint, group);

  renderTable(el, files, context);
}


// ====================================================
// FETCH DATA FROM SPARQL
// ====================================================

async function fetchVersions(endpoint, group) {

  const query = `
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX databus: <https://dataid.dbpedia.org/databus#>
PREFIX dct: <http://purl.org/dc/terms/>

SELECT DISTINCT ?versionNumber ?artifact ?artifactLabel ?downloadLink ?size
WHERE {

  ?version databus:group <${group}> ;
           databus:artifact ?artifact ;
           dct:hasVersion ?versionNumber ;
           dcat:distribution ?distribution .

  ?artifact databus:name ?artifactLabel .

  ?distribution databus:file ?downloadLink ;
                dcat:byteSize ?size .
}
ORDER BY DESC(?versionNumber) ?artifactLabel
`;

  const rows = await fetchSparql(endpoint, query);

  return rows.map(r => ({
    version: r.versionNumber.value,
    artifact: r.artifactLabel.value,
    downloadLink: r.downloadLink.value,
    size: Number(r.size.value)
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
// TABLE RENDERING
// ====================================================

function renderTable(el, data, context) {

  el.innerHTML = `
    <h2>${context.kgName || "Unknown"} KG Versions</h2>

    <p class="section-description">
      Browse available releases including dataset sizes and download links.
    </p>

    <table>
      <thead>
        <tr>
          <th>Version</th>
          <th>Artifact</th>
          <th>Download</th>
          <th>Size</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;

  const tbody = el.querySelector("tbody");

  // Group by version
  const grouped = {};

  data.forEach(item => {
    if (!grouped[item.version]) {
      grouped[item.version] = [];
    }
    grouped[item.version].push(item);
  });

  // Render grouped rows
  Object.entries(grouped).forEach(([version, files]) => {

    files.forEach((file, index) => {

      const tr = document.createElement("tr");

      tr.innerHTML = `

        ${
          index === 0
            ? `<td rowspan="${files.length}">
                 <strong>${version}</strong>
               </td>`
            : ""
        }

        <td>${file.artifact}</td>

        <td>
          <a href="${file.downloadLink}" target="_blank">
            ${getFileName(file.downloadLink)}
          </a>
        </td>

        <td style="text-align:right">
          ${formatBytes(file.size)}
        </td>

      `;

      tbody.appendChild(tr);

    });

  });

}


// ====================================================
// HELPERS
// ====================================================

function getFileName(url) {
  return url.split("/").pop();
}

function formatBytes(bytes) {

  if (!bytes || bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
}