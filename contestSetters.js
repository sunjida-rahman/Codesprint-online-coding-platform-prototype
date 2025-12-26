// contestSetters.js

const apiBase = "http://localhost:5000/api";
const token = localStorage.getItem("token");

// Extract contestId from query string
const urlParams = new URLSearchParams(window.location.search);
const contestId = urlParams.get("contestId");

if (!contestId) {
  alert("Contest ID not provided!");
  throw new Error("Missing contestId in URL");
}

document.addEventListener("DOMContentLoaded", () => {
  loadSetters();

  document.getElementById("addSetterBtn").addEventListener("click", async () => {
    const userId = document.getElementById("newSetterId").value;
    if (!userId) return alert("Enter a User ID!");

    try {
      await axios.post(
        `${apiBase}/contests/${contestId}/setters`,
        { user_id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      document.getElementById("newSetterId").value = "";
      loadSetters();
    } catch (err) {
      console.error(err);
      alert("Failed to add setter!");
    }
  });
});

async function loadSetters() {
  try {
    const res = await axios.get(`${apiBase}/contests/${contestId}/setters`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const setters = res.data;
    const container = document.getElementById("settersList");
    container.innerHTML = "";

    if (!setters.length) {
      container.innerHTML = "<p>No setters assigned yet.</p>";
      return;
    }

    setters.forEach((s) => {
      const div = document.createElement("div");
      div.className = "d-flex justify-content-between align-items-center border p-2 mb-2 rounded";
      div.innerHTML = `
        <span><strong>${s.username}</strong> (User ID: ${s.id})</span>
        <button class="btn btn-sm btn-danger">Remove</button>
      `;

      div.querySelector("button").onclick = async () => {
        if (!confirm(`Remove ${s.username}?`)) return;
        await axios.delete(`${apiBase}/contests/${contestId}/setters/${s.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        loadSetters();
      };

      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error fetching setters:", err);
    alert("Could not load setters!");
  }
}
