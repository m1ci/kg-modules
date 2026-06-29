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
// TABLE + PAGINATION
// ====================================================

function renderTable(el, data, context) {

  const PAGE_SIZE = 100;
  let currentPage = 1;

  const totalPages = () =>
    Math.max(1, Math.ceil(data.length / PAGE_SIZE));

  function render() {

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageData = data.slice(start, start + PAGE_SIZE);

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
            <th>Size</th>
            <th>Download</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>

      <div class="pagination" style="margin-top: 12px; display:flex; gap:10px; align-items:center;">
        <button id="prevBtn" ${currentPage === 1 ? "disabled" : ""}>Previous</button>
        <span>Page ${currentPage} / ${totalPages()}</span>
        <button id="nextBtn" ${currentPage === totalPages() ? "disabled" : ""}>Next</button>
      </div>
    `;

    const tbody = el.querySelector("tbody");

    // Group only page data
    const grouped = {};

    pageData.forEach(item => {
      if (!grouped[item.version]) {
        grouped[item.version] = [];
      }
      grouped[item.version].push(item);
    });

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

          <td style="text-align:right">
            ${formatBytes(file.size)}
          </td>

          <td>
            <a href="${file.downloadLink}" target="_blank">
              Download
            </a>
          </td>

        `;

        tbody.appendChild(tr);

      });

    });

    // Events
    el.querySelector("#prevBtn").onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        render();
      }
    };

    el.querySelector("#nextBtn").onclick = () => {
      if (currentPage < totalPages()) {
        currentPage++;
        render();
      }
    };
  }

  render();
}


// ====================================================
// HELPERS
// ====================================================

function formatBytes(bytes) {

  if (!bytes || bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (bytes / Math.pow(bytes, i)).toFixed(1) + " " + sizes[i];
}