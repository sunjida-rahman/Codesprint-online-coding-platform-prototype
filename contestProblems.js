document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const contestId = urlParams.get("contestId");
  const token = localStorage.getItem("token");

  if (!contestId) {
    alert("Contest ID missing!");
    return;
  }

  try {
    // 🔹 Get contest info along with user role
    const contestRes = await axios.get(`http://localhost:5000/api/contests/${contestId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const contest = contestRes.data;
    const now = new Date();
    const hasStarted = new Date(contest.start_time) <= now;

    // 🔹 Show "Add Problem" button if admin/setter
    if (contest.userRole === "admin" || contest.userRole === "setter") {
      const adminActions = document.getElementById("adminActions");
      adminActions.innerHTML = `
        <a href="addProblem.html?contestId=${contestId}" class="btn btn-primary admin-btn">➕ Add Problem</a>
      `;
    }

    // 🔹 Show registration button for participants
  
const registerContainer = document.getElementById("registerContainer");
let regRes = { data: { registered: false } }; // default value

if (contest.userRole !== "admin" && contest.userRole !== "setter") {
  const userId = localStorage.getItem("userId");
  regRes = await axios.get(`http://localhost:5000/api/contests/${contestId}/registrations/${userId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  }).catch(() => ({ data: { registered: false } }));

  if (regRes.data.registered) {
    registerContainer.innerHTML = `<button class="btn btn-success" disabled>Registered ✅</button>`;
  } else {
    registerContainer.innerHTML = `<button id="registerBtn" class="btn btn-primary">Register</button>`;
    document.getElementById("registerBtn").addEventListener("click", async () => {
      try {
        await axios.post(`http://localhost:5000/api/contests/register`, { contest_id: contestId }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        alert("Registered successfully!");
        registerContainer.innerHTML = `<button class="btn btn-success" disabled>Registered ✅</button>`;
        regRes.data.registered = true; // update status
      } catch {
        alert("Registration failed. Try again.");
      }
    });
  }
}


    // 🔹 Fetch contest problems
    const problemsRes = await axios.get(`http://localhost:5000/api/contests/${contestId}/problems`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const problems = problemsRes.data;

    const problemList = document.getElementById("problemList");
    problemList.innerHTML = "";

    // 🔹 Determine if user can see problems
    const canViewProblems = contest.userRole === "admin" || contest.userRole === "setter" || (hasStarted && regRes?.data.registered);

    if (!canViewProblems) {
      problemList.innerHTML = `<p>Problems will be visible once the contest starts and you are registered.</p>`;
      return;
    }

    if (problems.length === 0) {
      problemList.innerHTML = `<p>No problems added yet.</p>`;
      return;
    }

    // 🔹 Render problems
    problems.forEach((p, index) => {
      const card = document.createElement("div");
      card.className = "col-md-6";
      card.innerHTML = `
        <div class="problem-card">
          <h5>${String.fromCharCode(65 + index)}. ${p.title} (Alias: ${p.alias})</h5>
          <p><strong>Difficulty:</strong> ${p.difficulty}</p>
          <a href="problem.html?contestId=${contestId}&alias=${p.alias}" class="btn btn-outline-primary btn-sm">View Problem</a>
        </div>
      `;
      problemList.appendChild(card);
    });

  } catch (err) {
    console.error("Error loading contest problems:", err.response || err);
    alert("❌ Failed to load contest problems. Check console for details.");
  }
});
