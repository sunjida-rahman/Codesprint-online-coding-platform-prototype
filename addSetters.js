document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");

  // Set contestId from URL if passed
  const urlParams = new URLSearchParams(window.location.search);
  document.getElementById("contestId").value = urlParams.get("contestId") || "";

  // Add contest setter
  document.getElementById("contestSetterForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const contestId = document.getElementById("contestId").value;
    const user_id = document.getElementById("contestSetterUserId").value;

    try {
      await axios.post(`http://localhost:5000/api/contests/${contestId}/setters`, { user_id }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      alert("Contest setter added!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add setter");
    }
  });

  // Add problem setter
  document.getElementById("problemSetterForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const problemId = document.getElementById("problemId").value;
    const user_id = document.getElementById("problemSetterUserId").value;

    try {
      await axios.post(`http://localhost:5000/api/problems/${problemId}/setters`, { user_id }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      alert("Problem setter added!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add setter");
    }
  });
});
