const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const sendMail = require('./sendMail'); // your email module

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

(async () => {
  // Database connection
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root', // Change with your DB username
    password: 'sunjida2001', // Change with your DB password
    database: 'codesprint' // Change with your DB name
  });

  // ---------- AUTH MIDDLEWARE ----------
  function requireAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }

  async function isAdmin(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const [rows] = await db.execute('SELECT role FROM users WHERE id = ?', [decoded.id]);
      if (rows[0].role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  }

  async function isAdminOrSetter(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await db.execute('SELECT role FROM users WHERE id = ?', [decoded.id]);

    if (rows[0].role === 'admin') {
      req.user = decoded;
      return next();
    }

    // Allow setters to add problems independently
    if (rows[0].role === 'setter') {
      req.user = decoded;
      return next();
    }

    return res.status(403).json({ message: 'Not authorized' });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}


  // ---------- AUTH ROUTES ----------
  app.post('/api/register', async (req, res) => {
    const { username, email, password, role } = req.body;

    try {
      const [existingUser] = await db.execute(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({ message: 'Username or email already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [result] = await db.execute(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, role || 'participant']
      );

      res.status(201).json({
        message: 'User registered successfully',
        user_id: result.insertId,
        role: role || 'participant'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
      const [user] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
      if (!user.length) return res.status(400).json({ message: 'User not found' });

      const validPassword = await bcrypt.compare(password, user[0].password);
      if (!validPassword) return res.status(400).json({ message: 'Invalid credentials' });

      const accessToken = jwt.sign(
        { id: user[0].id, role: user[0].role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        { id: user[0].id, role: user[0].role },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      res.status(200).json({
        message: 'Login successful',
        accessToken,
        refreshToken,
        role: user[0].role,
        user_id: user[0].id
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.post("/api/refresh", (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: "No refresh token" });

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const newAccessToken = jwt.sign(
        { id: decoded.id, role: decoded.role },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );
      res.json({ accessToken: newAccessToken });
    } catch (err) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }
  });

  // ---------- USER INFO ----------
  app.get('/api/me', requireAuth, async (req, res) => {
    try {
      const [rows] = await db.execute('SELECT id, username, role FROM users WHERE id = ?', [req.user.id]);
      if (!rows.length) return res.status(404).json({ message: 'User not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching user' });
    }
  });

  // ---------- CONTEST ROUTES ----------
  app.post('/api/contests/create', isAdmin, async (req, res) => {
    try {
      const { title, description, start_time, end_time, is_group, judge_name } = req.body;
      if (!title || !start_time || !end_time) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const [result] = await db.execute(
        'INSERT INTO contests (title, description, start_time, end_time, is_group, judge_name) VALUES (?, ?, ?, ?, ?, ?)',
        [title, description, start_time, end_time, is_group ? 1 : 0, judge_name || null]
      );

      res.status(201).json({ message: 'Contest created successfully!', contest_id: result.insertId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to create contest' });
    }
  });

  app.get('/api/contests/upcoming', async (req, res) => {
    try {
      const [contests] = await db.execute('SELECT * FROM contests ORDER BY start_time ASC');
      res.json(contests);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch contests' });
    }
  });

  // Get all contests (past, ongoing, upcoming)
app.get("/api/contests", async (req, res) => {
  try {
    const [contests] = await db.execute("SELECT * FROM contests ORDER BY start_time DESC");
    res.json(contests);
  } catch (err) {
    console.error("Error fetching contests:", err);
    res.status(500).json({ message: "Failed to fetch contests" });
  }
});

// Register for contest + send confirmation email
  app.post("/api/contests/register", requireAuth, async (req, res) => {
    try {
      const { contest_id } = req.body;
      const userId = req.user.id;

      await db.execute("INSERT INTO contest_registrations (contest_id, user_id) VALUES (?, ?)", [contest_id, userId]);

      const [[contest]] = await db.execute("SELECT * FROM contests WHERE id = ?", [contest_id]);
      const [[user]] = await db.execute("SELECT * FROM users WHERE id = ?", [userId]);

      const contestLink = `http://localhost:5000/contestProblems.html?contestId=${contest.id}`;

      await sendMail(user.email, `Registration Confirmed: ${contest.title}`, `
        <h2>Hello ${user.username},</h2>
        <p>You have successfully registered for the contest <b>${contest.title}</b>.</p>
        <p><b>Start Time:</b> ${contest.start_time}</p>
        <p><b>End Time:</b> ${contest.end_time}</p>
        <p>Click below to join the contest:</p>
        <a href="${contestLink}" target="_blank">👉 Join Contest</a>
        <br><br>
        <p>Good luck!</p>
      `);

      res.json({ message: "Registered successfully! Contest link sent to your email." });
    } catch (err) {
      console.error("❌ Error registering for contest:", err);
      res.status(500).json({ message: "Failed to register for contest." });
    }
  });


  app.post('/api/contests/register', requireAuth, async (req, res) => {
    const { contest_id } = req.body;
    if (!contest_id) return res.status(400).json({ message: 'Missing contest_id' });

    try {
      const [existing] = await db.execute(
        'SELECT * FROM contest_registrations WHERE contest_id = ? AND user_id = ?',
        [contest_id, req.user.id]
      );
      if (existing.length) return res.status(400).json({ message: 'Already registered' });

      await db.execute(
        'INSERT INTO contest_registrations (contest_id, user_id) VALUES (?, ?)',
        [contest_id, req.user.id]
      );

      res.status(201).json({ message: 'Registered successfully!' });
    } catch (err) {
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  // Check if a user is registered for a contest
app.get('/api/contests/:contestId/registrations/:userId', async (req, res) => {
  const { contestId, userId } = req.params;
  try {
    const [rows] = await db.execute(
      'SELECT * FROM contest_registrations WHERE contest_id = ? AND user_id = ?',
      [contestId, userId]
    );
    res.json({ registered: rows.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to check registration' });
  }
});


 // ---------- PROBLEM ROUTES ----------
 // ✅ API routes first
 // Fetch single contest by ID
app.get('/api/contests/:contestId', async (req, res) => {
  const { contestId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];

  try {
    const [[contest]] = await db.execute('SELECT * FROM contests WHERE id=?', [contestId]);
    if (!contest) return res.status(404).json({ message: 'Contest not found' });

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [[user]] = await db.execute('SELECT role FROM users WHERE id=?', [decoded.id]);
        contest.userRole = user?.role || null;
      } catch {}
    }

    res.json(contest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch contest' });
  }
});



app.post('/api/problems', isAdminOrSetter, async (req, res) => {
  const {
    title, statement, input_format, output_format,
    samples, testcases, time_limit_ms, memory_limit_kb,
    difficulty, visibility
  } = req.body;

  try {
    const [r] = await db.execute(
      `INSERT INTO problems
      (title, statement, input_format, output_format,
       sample_input, sample_output, testcases,
       time_limit, memory_limit, difficulty, visibility, author_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        title,
        statement,
        input_format,
        output_format,
        samples?.[0]?.input || '',       // first sample input
        samples?.[0]?.output || '',      // first sample output
        JSON.stringify(testcases || []),  // hidden + visible testcases
        Math.floor((time_limit_ms || 2000)/1000), // convert ms → seconds
        Math.floor((memory_limit_kb || 262144)/1024), // kb → MB
        difficulty || 'easy',
        visibility || 'draft',
        req.user?.id || null
      ]
    );

    res.status(201).json({ message: 'Problem created', problem_id: r.insertId });
  } catch (e) {
    console.error("Problem insert error:", e); // ✅ Log actual error
    res.status(500).json({ message: 'Failed to create problem' });
  }
});



  app.get('/api/problems/:id', requireAuth, async (req, res) => {
  const id = req.params.id;

  try {
    // Get user role
    const [[user]] = await db.execute('SELECT role FROM users WHERE id=?', [req.user.id]);
    const userRole = user?.role || 'participant';

    // Fetch problem
    const [rows] = await db.execute('SELECT * FROM problems WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Problem not found' });

    const problem = rows[0];

    // Parse testcases & samples
    let samples = [];
    try {
      // JSON stored in database: first sample input/output only
      const firstSample = {
        input: problem.sample_input || '',
        output: problem.sample_output || ''
      };

      // Parse hidden/all testcases array if stored
      const allTestcases = JSON.parse(problem.testcases || '[]');

      // Take first 2 as visible samples
      samples = allTestcases.slice(0, 2);
      if (samples.length === 0 && firstSample.input) {
        samples.push(firstSample);
      }
    } catch (e) {
      samples = [];
    }

    // Only admin/judge see full testcases
    const fullTestcases = (userRole === 'admin' || userRole === 'judge') 
                          ? JSON.parse(problem.testcases || '[]') 
                          : undefined;

    res.json({
      ...problem,
      samples,          // first 2 samples visible to everyone
      fullTestcases     // only for admin/judge
    });

  } catch (e) {
    console.error("Error fetching problem:", e);
    res.status(500).json({ message: 'Error fetching problem' });
  }
});

 

  app.post('/api/contests/:contestId/problems', isAdminOrSetter, async (req, res) => {
  const { contestId } = req.params;
  const { problem_id, alias, points, order_index } = req.body;

  try {
    await db.execute(
      `INSERT INTO contest_problems (contest_id, problem_id, alias, points, order_index)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         alias=VALUES(alias), points=VALUES(points), order_index=VALUES(order_index)`,
      [contestId, problem_id, alias, points || 100, order_index || 0]
    );
    res.status(201).json({ message: 'Problem attached to contest' });
  } catch (e) {
    console.error("Attach problem error:", e);
    res.status(500).json({ message: 'Failed to attach problem', error: e.sqlMessage });
  }
});


  // ✅ Get all problems in a contest (with difficulty from problems table)
app.get('/api/contests/:contestId/problems', async (req, res) => {
  const { contestId } = req.params;

  try {
    const [[contest]] = await db.execute('SELECT * FROM contests WHERE id=?', [contestId]);
    if (!contest) return res.status(404).json({ message: 'Contest not found' });

    const now = new Date();
    const hasStarted = now >= new Date(contest.start_time);

    // Fetch all problems for the contest
    const [rows] = await db.execute(
      `SELECT cp.problem_id, cp.alias, cp.points, cp.order_index,
              p.title, p.difficulty, p.visibility
       FROM contest_problems cp
       JOIN problems p ON p.id = cp.problem_id
       WHERE cp.contest_id = ?
       ORDER BY cp.order_index ASC, cp.alias ASC`,
      [contestId]
    );

    // Check if user is admin/setter
    let userRole = null;
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [[user]] = await db.execute('SELECT role FROM users WHERE id=?', [decoded.id]);
        userRole = user?.role || null;
      } catch {}
    }

    // If contest hasn't started & user is not admin/setter → hide some info
    if (!hasStarted && !(userRole === 'admin' || userRole === 'setter')) {
      return res.json(
        rows.map(r => ({
          alias: r.alias,
          title: r.title,
          order_index: r.order_index,
          difficulty: r.difficulty // ✅ always send difficulty
        }))
      );
    }

    // Contest started or user is admin/setter → return full info
    res.json(rows);

  } catch (e) {
    console.error("Error fetching contest problems:", e);
    res.status(500).json({ message: 'Failed to fetch contest problems' });
  }
});


  app.get('/api/contests/:contestId/problems/:alias', async (req, res) => {
    const { contestId, alias } = req.params;
    try {
      const [[contest]] = await db.execute('SELECT * FROM contests WHERE id=?', [contestId]);
      if (!contest) return res.status(404).json({ message: 'Contest not found' });

      const now = new Date();
      const hasStarted = now >= new Date(contest.start_time);

      const [rows] = await db.execute(
        `SELECT p.* FROM contest_problems cp
         JOIN problems p ON p.id = cp.problem_id
         WHERE cp.contest_id = ? AND cp.alias = ?`,
        [contestId, alias]
      );
      if (!rows.length) return res.status(404).json({ message: 'Problem not found' });

      if (!hasStarted) {
        try {
          const token = req.headers.authorization?.split(' ')[1];
          const decoded = token ? jwt.verify(token, process.env.JWT_SECRET) : null;
          if (decoded) {
            const [[user]] = await db.execute('SELECT role FROM users WHERE id=?', [decoded.id]);
            if (user?.role === 'admin') return res.json(rows[0]);
          }
        } catch {}
        return res.status(403).json({ message: 'Contest not started' });
      }
      res.json(rows[0]);
    } catch (e) {
      res.status(500).json({ message: 'Error fetching problem' });
    }
  });

const axios = require('axios');

// Add contest setter
app.post('/api/contests/:contestId/setters', requireAuth, async (req, res) => {
  const { user_id } = req.body;
  const { contestId } = req.params;

  if (!user_id) return res.status(400).json({ message: "Missing user_id" });

  try {
    await db.execute(
      `INSERT INTO contest_setters (contest_id, user_id) VALUES (?, ?)`,
      [contestId, user_id]
    );
    res.status(201).json({ message: "Contest setter added successfully!" });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: "This user is already a contest setter" });
    }
    console.error(err);
    res.status(500).json({ message: "Failed to add contest setter" });
  }
});

// Add problem setter
app.post('/api/problems/:problemId/setters', requireAuth, async (req, res) => {
  const { user_id } = req.body;
  const { problemId } = req.params;

  if (!user_id) return res.status(400).json({ message: "Missing user_id" });

  try {
    await db.execute(
      `INSERT INTO problem_setters (user_id, problem_id) VALUES (?, ?)`,
      [user_id, problemId]
    );
    res.status(201).json({ message: "Problem setter added successfully!" });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: "This user is already a problem setter for this problem" });
    }
    console.error(err);
    res.status(500).json({ message: "Failed to add problem setter" });
  }
});

app.get('/api/contests/:contestId/setters', async (req, res) => {
  const { contestId } = req.params;
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.name, u.email
       FROM users u
       JOIN contest_setters cs ON u.id = cs.user_id
       WHERE cs.contest_id = ?`,
      [contestId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch contest setters' });
  }
});


// ---------- SUBMISSION ROUTE ----------
// ---------- SUBMISSION ROUTE ----------
app.post('/api/submit', async (req, res) => {
  const { user_id, problem_id, contest_id, language, code } = req.body;

  // 1️⃣ Validate required fields
  if (!user_id || !problem_id || !contest_id || !language || !code) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // 2️⃣ Fetch problem from DB
    const [problemRows] = await db.execute(
      'SELECT * FROM problems WHERE id = ?', 
      [problem_id]
    );

    if (!problemRows.length) {
      return res.status(400).json({ message: 'Problem not found' });
    }

    // 3️⃣ Parse testcases safely
    let testcases = problemRows[0].testcases;
    if (typeof testcases === 'string') {
      try {
        testcases = JSON.parse(testcases);
      } catch (err) {
        console.error("Error parsing testcases:", err);
        return res.status(500).json({ message: 'Invalid testcases format' });
      }
    }

    // Ensure each testcase has input and output
    testcases = testcases.map(t => ({
      input: t.input ?? "",
      output: t.output ?? t.expected_output ?? "",
      hidden: t.hidden ?? false
    }));

    let accepted = true;

    // 4️⃣ Run each testcase on Judge0 CE
    for (const test of testcases) {
      const result = await axios.post(
        'https://ce.judge0.com/submissions?base64_encoded=false&wait=true',
        {
          language_id: mapLanguage(language),
          source_code: code,
          stdin: test.input
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const output = (result.data.stdout || "").trim();
      const expected = (test.output || "").trim();

      if (output !== expected) {
        accepted = false;
        break;
      }
    }

    // 5️⃣ Determine verdict
    const verdict = accepted ? 'Accepted' : 'Wrong Answer';

    // 6️⃣ Save submission in DB
    await db.execute(
      'INSERT INTO submissions (user_id, contest_id, problem_id, language, code, verdict) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, contest_id, problem_id, language, code, verdict]
    );

    // 7️⃣ Return verdict
    res.status(201).json({ verdict });

  } catch (error) {
    console.error("Submission route error:", error.response?.data || error.message || error);
    res.status(500).json({ message: 'Submission failed', error: error.message });
  }
});

// ---------- Judge0 Language Mapping ----------
function mapLanguage(lang) {
  switch (lang.toLowerCase()) {
    case 'cpp': return 54;
    case 'py': return 71;
    case 'java': return 62;
    default: return 54; // default C++
  }
}

// Fetch all submissions of a user with problem & contest titles
app.get('/api/users/:userId/submissions', async (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const [rows] = await db.execute(`
      SELECT s.id, s.language, s.verdict, s.created_at,
             p.title AS problem_title,
             c.title AS contest_title
      FROM submissions s
      JOIN problems p ON s.problem_id = p.id
      JOIN contests c ON s.contest_id = c.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `, [userId]);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching submissions:", err);
    res.status(500).json({ message: "Failed to load submissions" });
  }
});

// Backend: server.js

app.get('/api/contests/:contestId/scoreboard', async (req, res) => {
  const contestId = req.params.contestId;

  try {
    // Fetch all users who have submissions in this contest
    const [users] = await db.execute(
      `SELECT DISTINCT u.id, u.username
       FROM users u
       JOIN submissions s ON u.id = s.user_id
       WHERE s.contest_id = ?`,
      [contestId]
    );

    const scoreboard = [];

    for (const user of users) {
      // Fetch accepted submissions per problem
      const [solved] = await db.execute(
        `SELECT s.problem_id, MIN(s.created_at) as first_solved
         FROM submissions s
         WHERE s.user_id = ? AND s.contest_id = ? AND s.verdict = 'Accepted'
         GROUP BY s.problem_id`,
        [user.id, contestId]
      );

      // Count problems solved
      const problemsSolved = solved.length;

      // Sum points per problem (assuming points stored in contests_problems table)
      let totalPoints = 0;
      let lastSubmissionTime = null;

      for (const item of solved) {
        const [pointsRow] = await db.execute(
          `SELECT points FROM contest_problems WHERE contest_id = ? AND problem_id = ?`,
          [contestId, item.problem_id]
        );
        totalPoints += pointsRow[0]?.points || 0;

        // Track last solved submission time
        if (!lastSubmissionTime || new Date(item.first_solved) > lastSubmissionTime) {
          lastSubmissionTime = new Date(item.first_solved);
        }
      }

      scoreboard.push({
        user_id: user.id,
        username: user.username,
        problemsSolved,
        totalPoints,
        lastSubmissionTime
      });
    }

    // Sort: first by totalPoints descending, then by lastSubmissionTime ascending
    scoreboard.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.lastSubmissionTime - b.lastSubmissionTime;
    });

    res.json(scoreboard);
  } catch (err) {
    console.error("Scoreboard error:", err);
    res.status(500).json({ message: "Failed to fetch scoreboard" });
  }
});


// ---------- Practice Problems Route with Filters ----------
app.get('/api/practice/problems', async (req, res) => {
  try {
    const { contestId, difficulty } = req.query;

    let query = `
      SELECT p.id, p.title, p.difficulty, p.statement, p.input_format, p.output_format, 
             c.title AS contest_title, cp.contest_id
      FROM problems p
      JOIN contest_problems cp ON cp.problem_id = p.id
      JOIN contests c ON cp.contest_id = c.id
      WHERE c.end_time < NOW()
    `;

    const params = [];

    if (contestId) {
      query += " AND cp.contest_id = ?";
      params.push(contestId);
    }

    if (difficulty) {
      query += " AND p.difficulty = ?";
      params.push(difficulty);
    }

    query += " ORDER BY c.end_time DESC, p.id ASC";

    const [problems] = await db.execute(query, params);
    res.json(problems);

  } catch (err) {
    console.error("Practice problems route error:", err);
    res.status(500).json({ message: "Failed to fetch practice problems" });
  }
});



  // ---------- START SERVER ----------
  app.listen(5000, () => {
    console.log('Backend running on http://localhost:5000');
  });
})();
