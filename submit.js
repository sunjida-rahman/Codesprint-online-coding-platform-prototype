document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const contestId = urlParams.get("contestId");
  const problemId = urlParams.get("problemId");
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  const form = document.getElementById("submitForm");
  const submitButton = form.querySelector("button[type='submit']");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!token || !userId) {
      alert("⚠️ Please log in before submitting.");
      return;
    }

    const language = document.getElementById("language").value;
    const code = document.getElementById("code").value;

    if (!language || !code) {
      alert("⚠️ Please select a language and enter your code.");
      return;
    }

    try {
      // 1️⃣ Disable button and show loading
      submitButton.disabled = true;
      submitButton.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Submitting...`;

      // 2️⃣ Call backend submission route
      const res = await axios.post(
        "http://localhost:5000/api/submit",
        {
          user_id: userId,
          contest_id: contestId,
          problem_id: problemId,
          language,
          code
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 3️⃣ Show final verdict
      const verdict = res.data.verdict || "Unknown";
      alert(`✅ Submission Result: ${verdict}`);

      // Redirect to submissions page
      window.location.href = `submissions.html?contestId=${contestId}&problemId=${problemId}`;

    } catch (err) {
      console.error("Submission error:", err.response || err);

      const msg = err.response?.data?.message || err.message || "Server error";
      alert(`❌ Submission failed: ${msg}`);

    } finally {
      // 4️⃣ Re-enable button
      submitButton.disabled = false;
      submitButton.textContent = "Submit";
    }
  });
});
