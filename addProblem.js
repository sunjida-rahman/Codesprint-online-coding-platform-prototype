document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addProblemForm");
  const contestId = new URLSearchParams(window.location.search).get("contestId");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("userRole");

    if (!token || !userRole || (userRole !== "admin" && userRole !== "setter")) {
      alert("Only admins or setters can add problems.");
      window.location.href = "login.html";
      return;
    }

    try {
      // ✅ Collect visible samples
      const samples = [];
      document.querySelectorAll(".sample-input").forEach((inputEl, i) => {
        const outputEl = document.querySelectorAll(".sample-output")[i];
        if (inputEl.value && outputEl.value) {
          samples.push({ input: inputEl.value, output: outputEl.value, hidden: false });
        }
      });

      // ✅ Collect hidden testcases
      const hiddenTestcases = [];
      document.querySelectorAll(".hidden-input").forEach((inputEl, i) => {
        const outputEl = document.querySelectorAll(".hidden-output")[i];
        if (inputEl.value && outputEl.value) {
          hiddenTestcases.push({ input: inputEl.value, output: outputEl.value, hidden: true });
        }
      });

      const allTestcases = [...samples, ...hiddenTestcases];

      // 🔹 Create problem
      const problemRes = await axios.post(
        "http://localhost:5000/api/problems",
        {
          title: document.getElementById("title").value,
          statement: document.getElementById("statement").value,
          input_format: document.getElementById("input_format").value,
          output_format: document.getElementById("output_format").value,
          samples,              
          testcases: allTestcases, 
          time_limit_ms: Number(document.getElementById("time_limit_ms")?.value || 2000),
          memory_limit_kb: Number(document.getElementById("memory_limit_kb")?.value || 262144),
          difficulty: document.getElementById("difficulty").value,
          visibility: "published"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const problemId = problemRes.data.problem_id;

      // 🔹 Attach problem to contest
      const alias = document.getElementById("alias").value || "A";
      const points = Number(document.getElementById("points").value || 100);
      const order_index = Number(document.getElementById("order_index").value || 0);

      await axios.post(
        `http://localhost:5000/api/contests/${contestId}/problems`,
        { problem_id: problemId, alias, points, order_index },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("✅ Problem added successfully!");
      window.location.href = `contestProblems.html?contestId=${contestId}`;
    } catch (err) {
      console.error("Error adding problem:", err.response || err);

      // ✅ Redirect to login if 401 Unauthorized
      if (err.response?.status === 401) {
        alert("❌ Session expired. Please log in again.");
        localStorage.removeItem("token");
        localStorage.removeItem("userRole");
        window.location.href = "login.html";
        return;
      }

      alert(`❌ Failed to add problem: ${err.response?.data?.message || "Server error"}`);
    }
  });
});
