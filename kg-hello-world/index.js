export default function mount(el, context) {
  el.innerHTML = `
    <div style="
      padding: 20px;
      background: #f0f4ff;
      border: 2px solid #3b82f6;
      border-radius: 12px;
      font-family: Arial;
    ">
      <h2>Hello KG Modules 👋</h2>

      <p>This is a minimal plugin module.</p>

      <p><strong>KG ID:</strong> ${context.kgId || "unknown"}</p>

      <p><strong>Endpoint:</strong> ${context.endpoint || "not provided"}</p>
    </div>
  `;
}