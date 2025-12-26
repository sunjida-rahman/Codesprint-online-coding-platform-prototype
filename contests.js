document.addEventListener("DOMContentLoaded", async () => {
  try {
    const token = localStorage.getItem("token");

    let role = null;
    let userId = null;

    if (token) {
      const userRes = await axios.get("http://localhost:5000/api/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const user = userRes.data;
      role = user.role;
      userId = user.id;

      localStorage.setItem("userRole", role);
      localStorage.setItem("userId", userId);
    }

    fetchContests(role, userId, token);

  } catch (err) {
    console.error("Error fetching user info:", err);
    fetchContests(null, null, null); // treat as guest
  }
});

function fetchContests(role, userId, token) {
  axios.get("http://localhost:5000/api/contests")
    .then(res => {
      const contests = res.data;

      const now = new Date();

      const ongoing = [];
      const upcoming = [];
      const past = [];

      contests.forEach(contest => {
        const start = new Date(contest.start_time);
        const end = new Date(contest.end_time);

        if (now >= start && now <= end) ongoing.push(contest);
        else if (now < start) upcoming.push(contest);
        else past.push(contest);
      });

      displayContests(ongoing, "ongoingContests", "ONGOING", role, userId, token);
      displayContests(upcoming, "upcomingContests", "UPCOMING", role, userId, token, true); // countdown + register
      displayContests(past, "pastContests", "PAST", role, userId, token);

    })
    .catch(err => {
      console.error("Error fetching contests:", err);
      alert("Failed to load contests. Please try again later.");
    });
}

// Display contests function
function displayContests(contests, containerId, statusText, role = null, userId = null, token = null, showCountdown = false) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  // Admin global button only once at top of contests list
  if (role === "admin" && containerId === "ongoingContests") {
    const adminCard = document.createElement("div");
    adminCard.className = "col-12 text-center admin-btn mb-4";
    adminCard.innerHTML = `
      <button class="btn btn-warning btn-lg" onclick="window.location.href='scheduleBattle.html'">
        🛡️ Schedule a New Battle
      </button>
    `;
    container.appendChild(adminCard);
  }

  if (contests.length === 0) {
    container.innerHTML += `<div class="col-12"><p>No ${statusText.toLowerCase()} contests.</p></div>`;
    return;
  }

  contests.forEach(contest => {
    const start = new Date(contest.start_time);
    const end = new Date(contest.end_time);

    const card = document.createElement("div");
    card.className = "col-md-6 col-lg-4";

    let countdownHtml = '';
    if (showCountdown) {
      countdownHtml = `<span class="ms-2 countdown" id="countdown-${contest.id}"></span>`;
    }

    card.innerHTML = `
      <div class="contest-card">
        <h5>${contest.title}</h5>
        <p>${contest.description || ''}</p>
        <p>🕒 ${start.toLocaleString()} - ${end.toLocaleString()}</p>
        <span class="contest-badge ${statusText.toLowerCase()}">${statusText}</span>
        <div class="mt-2" id="action-buttons-${contest.id}">
          <button class="btn btn-primary btn-sm" onclick="viewProblems(${contest.id})">View Problems</button>
          <button class="btn btn-secondary btn-sm" onclick="viewScoreboard(${contest.id})">Scoreboard</button>
          ${statusText === 'UPCOMING' ? `<button class="btn btn-info btn-sm ms-2" onclick="registerContest(${contest.id})">Register</button>` : ''}
          ${countdownHtml}
        </div>
      </div>
    `;

    container.appendChild(card);

    // Start countdown for upcoming contests
    if (showCountdown) startCountdown(contest.id, start);

    // Admin buttons per contest
    if (role === "admin") {
      const actionButtons = card.querySelector(`#action-buttons-${contest.id}`);

      // Manage Setters
      const manageSettersBtn = document.createElement("button");
      manageSettersBtn.className = "btn btn-warning admin-btn ms-2";
      manageSettersBtn.textContent = "Manage Setters";
      manageSettersBtn.onclick = () => {
        window.location.href = `contestSetters.html?contestId=${contest.id}`;
      };

      // Add Problems
      const addProblemsBtn = document.createElement("button");
      addProblemsBtn.className = "btn btn-info admin-btn ms-2";
      addProblemsBtn.textContent = "Add Problems";
      addProblemsBtn.onclick = () => {
        window.location.href = `addProblem.html?contestId=${contest.id}`;
      };

      // Edit Contest
      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-success admin-btn ms-2";
      editBtn.textContent = "Edit";
      editBtn.onclick = () => {
        window.location.href = `editContest.html?contestId=${contest.id}`;
      };

      // Delete Contest
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-danger admin-btn ms-2";
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = () => {
        if (confirm("Are you sure you want to delete this contest?")) {
          axios.delete(`http://localhost:5000/api/contests/${contest.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(() => {
            alert("Contest deleted successfully!");
            fetchContests(role, userId, token);
          }).catch(err => {
            alert(err.response?.data?.message || "Failed to delete contest.");
          });
        }
      };

      actionButtons.appendChild(manageSettersBtn);
      actionButtons.appendChild(addProblemsBtn);
      actionButtons.appendChild(editBtn);
      actionButtons.appendChild(deleteBtn);
    }
  });
}

// Countdown timer
function startCountdown(contestId, startTime) {
  const countdownEl = document.getElementById(`countdown-${contestId}`);
  const interval = setInterval(() => {
    const now = new Date();
    const diff = startTime - now;

    if (diff <= 0) {
      countdownEl.textContent = "Started!";
      clearInterval(interval);
      return;
    }

    const hours = Math.floor(diff / 1000 / 60 / 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    countdownEl.textContent = `⏱️ ${hours}h ${minutes}m ${seconds}s`;
  }, 1000);
}

// Register button
function registerContest(contestId) {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  if (!userId || !token) {
    alert("You must be logged in to register for a contest.");
    window.location.href = "login.html";
    return;
  }

  axios.post(
    "http://localhost:5000/api/contests/register",
    { contest_id: Number(contestId) },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  .then(res => {
    alert(res.data.message || "Registered successfully!");
  })
  .catch(err => {
    alert(err.response?.data?.message || "Failed to register.");
  });
}

function viewProblems(contestId) {
  window.location.href = `contestProblems.html?contestId=${contestId}`;
}

function viewScoreboard(contestId) {
  window.location.href = `scoreboard.html?contestId=${contestId}`;
}
