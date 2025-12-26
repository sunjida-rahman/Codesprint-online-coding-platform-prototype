// Select DOM elements
const contestsList = document.getElementById("contestsList");
const createContestForm = document.getElementById("createContestForm");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const loginMessage = document.getElementById("loginMessage");
const mainContent = document.getElementById("mainContent");

let authToken = ''; // Store the JWT token after successful login

// Show Login Form
function showLogin() {
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('registerSection').style.display = 'none';
}

// Show Register Form
function showRegister() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('registerSection').style.display = 'block';
}

// Show login by default when the page loads
function showLoginOnly() {
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('mainContent').style.display = 'none';
}

// Show main app after login
function showMainApp() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
}

// Fetch all contests
async function fetchContests() {
  try {
    const response = await axios.get('http://localhost:5000/api/contests', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    const contests = response.data;
    contestsList.innerHTML = '';
    contests.forEach(contest => {
      const listItem = document.createElement("li");
      listItem.className = "list-group-item";
      listItem.innerText = contest.title;
      contestsList.appendChild(listItem);
    });
  } catch (error) {
    console.error("Error fetching contests:", error);
  }
}


// Handle registration
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;

    try {
      const response = await axios.post('http://localhost:5000/api/register', {
        username,
        email,
        password,
        role,
      });

      // Show success message
      if (registerMessage) {
        registerMessage.innerText = response.data.message || "Registration successful!";
        registerMessage.style.color = 'green';
      }

      registerForm.reset();

      // Redirect to login page after 1.5 seconds
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);

    } catch (error) {
      console.error("Registration error:", error);

      // Show error message
      if (registerMessage) {
        registerMessage.innerText = error.response?.data?.message || "Registration failed.";
        registerMessage.style.color = 'red';
      }
    }
  });
}



// Handle login
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        username,
        password,
      });

      authToken = response.data.token;
      localStorage.setItem('token', authToken);
      loginMessage.innerText = `Login successful! Welcome, ${username}`;
      loginMessage.style.color = 'green';
      loginForm.reset();
      showMainApp();
      fetchContests();
    } catch (error) {
      console.error("Login error:", error);
      if (loginMessage) {
        loginMessage.innerText = "Login failed.";
        loginMessage.style.color = 'red';
      } else {
        console.error("Login message element not found.");
      }
      loginMessage.style.color = 'red';
    }
  });
}

// Create a new contest
if (createContestForm) {
  createContestForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const start_time = document.getElementById("start_time").value;
    const end_time = document.getElementById("end_time").value;

    try {
      await axios.post('http://localhost:5000/api/contest', {
        title,
        description,
        start_time,
        end_time
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      fetchContests();
      createContestForm.reset();
    } catch (error) {
      console.error("Error creating contest:", error);
    }
  });
}

// Optional: Logout
function logout() {
  localStorage.removeItem('token');
  location.reload();
}

// Load on startup
document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem('token');
  if (token) {
    showMainApp();
    fetchContests();
  } else {
    showLoginOnly();
  }
});
