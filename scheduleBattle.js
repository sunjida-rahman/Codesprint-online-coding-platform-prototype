document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ scheduleBattle.js loaded");

  const form = document.getElementById("scheduleBattleForm");

  if (!form) {
    console.error("❌ Form not found! Check if #scheduleBattleForm exists in HTML.");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const start_time = document.getElementById("start_time").value;
    const end_time = document.getElementById("end_time").value;
    const is_group = document.getElementById("is_group").checked;
    const judge_name = document.getElementById("judge_name").value;

    const token = localStorage.getItem("token"); // JWT from login
    if (!token) {
      alert("Unauthorized! Please log in as Admin.");
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:5000/api/contests/create",
        {
          title,
          description,
          start_time,
          end_time,
          is_group,
          judge_name,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert(res.data.message || "Contest created successfully!");
      window.location.href = "contests.html"; // redirect back to contests page
    } catch (err) {
      console.error("Error creating contest:", err);
      alert("Failed to create contest. Check console for details.");
    }
  });
});
