document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const contestId = urlParams.get("contestId");
  const tbody = document.getElementById("scoreboardBody");

  async function fetchScoreboard() {
    try {
      const res = await axios.get(`http://localhost:5000/api/contests/${contestId}/scoreboard`);
      const scoreboard = res.data;

      if (!scoreboard.length) {
        tbody.innerHTML = `<tr><td colspan="5">No submissions yet</td></tr>`;
        return;
      }

      tbody.innerHTML = "";
      scoreboard.forEach((user, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${user.username}</td>
          <td>${user.problemsSolved}</td>
          <td>${user.totalPoints}</td>
          <td>${new Date(user.lastSubmissionTime).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error("Error fetching scoreboard:", err);
      tbody.innerHTML = `<tr><td colspan="5">Failed to load scoreboard</td></tr>`;
    }
  }

  // Fetch immediately
  fetchScoreboard();

  // Auto-refresh every 30 seconds
  setInterval(fetchScoreboard, 30000);
});
