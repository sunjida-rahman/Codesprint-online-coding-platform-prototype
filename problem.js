document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const contestId = urlParams.get("contestId");
  const alias = urlParams.get("alias");

  const container = document.getElementById("problemContainer");
  const token = localStorage.getItem("token");

  async function loadProblem() {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/contests/${contestId}/problems/${alias}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const p = res.data;

      // Render first 2 sample testcases
      const samplesHTML = (p.samples || []).map((s, idx) => `
        <h5>Sample Case ${idx + 1}</h5>
        <pre><strong>Input:</strong>\n${s.input}</pre>
        <pre><strong>Output:</strong>\n${s.output}</pre>
      `).join("\n");

      container.innerHTML = `
        <h2>${p.title}</h2>
        <div class="section-title">Problem Statement</div>
        <p>${p.statement}</p>
        <div class="section-title">Input Format</div>
        <p>${p.input_format}</p>
        <div class="section-title">Output Format</div>
        <p>${p.output_format}</p>
        <div class="section-title">Samples</div>
        ${samplesHTML}
      `;

      // Add submit button
      document.getElementById("submitBtn").addEventListener("click", () => {
        window.location.href = `submit.html?contestId=${contestId}&problemId=${p.id}`;
      });

    } catch (err) {
      console.error("Error loading problem:", err);
      container.innerHTML = `<p class="text-danger">❌ Failed to load problem</p>`;
    }
  }

  loadProblem();
});
