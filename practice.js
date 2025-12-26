document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("problemsContainer");
  const contestFilter = document.getElementById("contestFilter");
  const difficultyFilter = document.getElementById("difficultyFilter");

  let allProblems = [];
  let contests = [];

  // Fetch all practice problems first
  async function fetchProblems() {
    try {
      const params = {};
      if (contestFilter.value) params.contestId = contestFilter.value;
      if (difficultyFilter.value) params.difficulty = difficultyFilter.value;

      const res = await axios.get("http://localhost:5000/api/practice/problems", { params });
      allProblems = res.data;

      // Populate contest filter dynamically
      contests = [...new Set(allProblems.map(p => ({ id: p.contest_id, title: p.contest_title })))];
      contestFilter.innerHTML = '<option value="">All Contests</option>';
      contests.forEach(c => {
        contestFilter.innerHTML += `<option value="${c.id}">${c.title}</option>`;
      });

      displayProblems(allProblems);
    } catch (err) {
      console.error("Error fetching practice problems:", err);
      container.innerHTML = "<p>Failed to load practice problems.</p>";
    }
  }

  function displayProblems(problems) {
    if (!problems.length) {
      container.innerHTML = "<p>No problems found.</p>";
      return;
    }

    container.innerHTML = "";
    problems.forEach(p => {
      const div = document.createElement("div");
      div.className = "col-md-4";
      div.innerHTML = `
        <div class="card problem-card h-100" onclick="location.href='submit.html?problemId=${p.id}&contestId=${p.contest_id || 0}'">
          <div class="card-body">
            <h5 class="card-title">${p.title}</h5>
            <p class="card-text text-truncate">${p.statement || "No description provided."}</p>
            <div class="d-flex justify-content-between align-items-center mt-2">
              <span class="badge difficulty-badge ${p.difficulty || 'Easy'}">${p.difficulty || 'Easy'}</span>
              <small class="text-muted">${p.contest_title}</small>
            </div>
          </div>
        </div>
      `;
      container.appendChild(div);
    });
  }

  // Event listeners for filters
  contestFilter.addEventListener("change", fetchProblems);
  difficultyFilter.addEventListener("change", fetchProblems);

  // Initial fetch
  fetchProblems();
});
