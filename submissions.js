document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const tableBody = document.querySelector("#submissionsTable tbody");

  if (!token || !userId) {
    alert("You must be logged in to view submissions.");
    tableBody.innerHTML = `<tr><td colspan="6">Please log in</td></tr>`;
    return;
  }

  try {
    const res = await axios.get(`http://localhost:5000/api/users/${userId}/submissions`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const submissions = res.data;

    if (!submissions.length) {
      tableBody.innerHTML = `<tr><td colspan="6">No submissions yet</td></tr>`;
      return;
    }

    tableBody.innerHTML = ""; // clear loading row

    submissions.forEach(s => {
      const row = document.createElement("tr");
      const verdictClass = s.verdict.replace(/\s/g, "_"); // handle spaces in enum
      row.innerHTML = `
        <td>${s.id}</td>
        <td>${s.problem_title || s.problem_id}</td>
        <td>${s.contest_title || s.contest_id}</td>
        <td>${s.language}</td>
        <td><span class="verdict ${verdictClass}">${s.verdict}</span></td>
        <td>${new Date(s.created_at).toLocaleString()}</td>
      `;
      tableBody.appendChild(row);
    });

  } catch (err) {
    console.error("Error fetching submissions:", err.response || err);
    tableBody.innerHTML = `<tr><td colspan="6">Failed to load submissions</td></tr>`;
  }
});
