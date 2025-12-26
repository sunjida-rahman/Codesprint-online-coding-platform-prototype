CREATE DATABASE IF NOT EXISTS codesprint;
USE codesprint;

-- Drop existing tables if they exist (in proper order to avoid FK issues)
DROP TABLE IF EXISTS judge_comments;
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS problems;
DROP TABLE IF EXISTS contests;
DROP TABLE IF EXISTS users;

-- Users table (Admin, Participant, Judge)
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100),
  email VARCHAR(100),
  password VARCHAR(255),
  role ENUM('admin', 'participant', 'judge') DEFAULT 'participant'
);
SELECT * FROM users;
-- Contests table with optional assigned judge
CREATE TABLE contests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  judge_name VARCHAR(255),
  is_group BOOLEAN DEFAULT 0
);
ALTER TABLE contest_registrations DROP FOREIGN KEY contest_registrations_ibfk_1;
DROP TABLE IF EXISTS contests;


SELECT * FROM contests;

CREATE TABLE contest_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contest_id INT,
  user_id INT,
  FOREIGN KEY (contest_id) REFERENCES contests(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
SELECT * FROM contest_registrations;
-- Problems table
CREATE TABLE problems (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  statement TEXT NOT NULL,            -- full problem description
  input_format TEXT,
  output_format TEXT,
  sample_input TEXT,
  sample_output TEXT,
  time_limit INT DEFAULT 1,           -- in seconds
  memory_limit INT DEFAULT 256,       -- in MB
  testcases JSON NOT NULL,            -- [{input:"", output:""}...]
  difficulty ENUM('easy','medium','hard') DEFAULT 'easy',
  visibility ENUM('draft','published') DEFAULT 'draft',
  author_id INT,                      -- who created it
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);
SELECT * FROM problems;
DROP TABLE IF EXISTS problems;
SHOW CREATE TABLE problems;


-- B) Map problems <-> contests
CREATE TABLE IF NOT EXISTS contest_problems (
  contest_id INT NOT NULL,
  problem_id INT NOT NULL,
  alias CHAR(1) NOT NULL,           -- e.g. 'A','B','C'
  points INT DEFAULT 100,
  order_index INT DEFAULT 0,
  PRIMARY KEY (contest_id, problem_id),
  UNIQUE KEY uq_contest_alias (contest_id, alias),
  CONSTRAINT fk_cp_contest FOREIGN KEY (contest_id)
    REFERENCES contests(id) ON DELETE CASCADE,
  CONSTRAINT fk_cp_problem FOREIGN KEY (problem_id)
    REFERENCES problems(id) ON DELETE RESTRICT
);

-- (Optional) allow non-admin setters
CREATE TABLE IF NOT EXISTS problem_setters (
  user_id INT NOT NULL,
  problem_id INT NOT NULL,
  PRIMARY KEY (user_id, problem_id),
  CONSTRAINT fk_ps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ps_problem FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);
-- Create contest_setters table
CREATE TABLE contest_setters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contest_id INT NOT NULL,
  user_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_contest_setter (contest_id, user_id)
);
-- Submissions table
CREATE TABLE submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  contest_id INT NOT NULL,
  problem_id INT NOT NULL,
  language VARCHAR(20) NOT NULL,
  code TEXT NOT NULL,
  verdict ENUM('Accepted', 'Wrong Answer') NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (contest_id) REFERENCES contests(id),
  FOREIGN KEY (problem_id) REFERENCES problems(id)
);

-- Judge Comments table
CREATE TABLE judge_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  judge_id INT NOT NULL,
  comment_text TEXT NOT NULL,
  visibility ENUM('public', 'private') DEFAULT 'private',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id),
  FOREIGN KEY (judge_id) REFERENCES users(id)
);
