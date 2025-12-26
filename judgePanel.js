// judgePanel.js (similar to before)
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const contestId = urlParams.get("contestId");

  if (!contestId) return alert("Contest ID missing!");

  try {
    const res = await axios.get(`http://localhost:5000/api/contests/${contestId}/setters`);
    const judges = res.data;
    const judgeList = document.getElementById("judgeList");

    if (!judges.length) {
      judgeList.innerHTML = `<p>No judges/setters assigned for this contest yet.</p>`;
      return;
    }

    judges.forEach(j => {
      const card = document.createElement("div");
      card.className = "col-md-4";
      card.innerHTML = `
        <div class="judge-card">
          <h5>${j.name}</h5>
          <p><strong>Email:</strong> ${j.email}</p>
        </div>
      `;
      judgeList.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    alert("Failed to load judges");
  }
});
