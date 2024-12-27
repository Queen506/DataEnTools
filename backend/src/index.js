// server.js
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();
const oracledb = require("oracledb");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");

app.use(cors());
app.use(bodyParser.json()); // ใช้ bodyParser เพื่ออ่าน body ของคำขอ
app.use(express.json());

let dbType = null;
let oracleConnection = null;
let mysqlConnection = null;
let connection = null;

// เชื่อมต่อฐานข้อมูลของโปรเจคนี้
const projectDbConnection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "queen2545",
  database: "etlproject",
  port: 3306,
});

projectDbConnection.connect((err) => {
  if (err) {
    console.error("Error connecting to project_db:", err);
    return;
  }
  console.log("Connected to project_db successfully!");
});

// ตรวจสอบการเชื่อมต่อฐานข้อมูล
app.get("/api/test-connection", (req, res) => {
  projectDbConnection.query("SELECT 1", (err, results) => {
    if (err) {
      res
        .status(500)
        .json({ success: false, message: "ไม่สามารถเชื่อมต่อฐานข้อมูล" });
    } else {
      res
        .status(200)
        .json({ success: true, message: "เชื่อมต่อฐานข้อมูลสำเร็จ" });
    }
  });
});

// Route สำหรับการ Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const query = `SELECT * FROM etlproject.Customer WHERE Cus_Username = ? AND Cus_Auth = ?`;

  projectDbConnection.query(query, [username, password], (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: "Error occurred" });
    }
    if (results.length > 0) {
      return res
        .status(200)
        .json({ success: true, message: "Login successful" });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid username or password" });
    }
  });
});

// Route สำหรับการ Register
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  const query = `INSERT INTO etlproject.Customer (Cus_Username, Cus_Auth) VALUES (?, ?)`;

  projectDbConnection.query(query, [username, password], (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: "Error occurred" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Registration successful" });
  });
});

// API endpoint สำหรับเชื่อมต่อฐานข้อมูล
app.post("/api/connect", async (req, res) => {
  const { type, host, user, password, database, port, connectString } =
    req.body;

  try {
    // ปิดการเชื่อมต่อก่อนหน้า
    if (mysqlConnection && mysqlConnection.state !== "disconnected") {
      mysqlConnection.end(); // ปิดการเชื่อมต่อ MySQL
    }

    if (oracleConnection) {
      await oracleConnection.close(); // ปิดการเชื่อมต่อ Oracle
    }

    if (type === "mysql") {
      // เชื่อมต่อ MySQL
      dbType = "mysql";
      connection = mysql.createConnection({
        host,
        user,
        password,
        database,
        port: port || 3306,
      });

      connection.connect((error) => {
        if (error) throw error;
        console.log("เชื่อมต่อ MySQL สำเร็จ");
        res.json({ success: true, message: "เชื่อมต่อ MySQL สำเร็จ" });
      });
    } else if (type === "oracle") {
      // เชื่อมต่อ Oracle
      dbType = "oracle";
      oracleConnection = await oracledb.getConnection({
        user,
        password,
        connectString,
      });

      console.log("เชื่อมต่อ Oracle สำเร็จ");
      res.json({ success: true, message: "เชื่อมต่อ Oracle สำเร็จ" });
    } else {
      throw new Error("ประเภทฐานข้อมูลไม่ถูกต้อง");
    }
  } catch (error) {
    console.error("เชื่อมต่อฐานข้อมูลไม่สำเร็จ:", error);
    res.status(500).json({
      success: false,
      message: "เชื่อมต่อฐานข้อมูลไม่สำเร็จ",
      error: error.message,
    });
  }
});

// Middleware ตรวจสอบการเชื่อมต่อ
const checkConnection = (req, res, next) => {
  if (!connection) {
    res.status(400).json({
      success: false,
      message: "กรุณาเชื่อมต่อฐานข้อมูลก่อน",
    });
    return;
  }
  next();
};

// API endpoint สำหรับดึงรายชื่อตาราง
app.get("/api/tables", checkConnection, async (req, res) => {
  try {
    if (dbType === "mysql") {
      connection.query("SHOW TABLES", (error, results) => {
        if (error) throw error;
        const tables = results.map((row) => Object.values(row)[0]);
        res.json({ success: true, data: tables });
      });
    } else if (dbType === "oracle") {
      const query = `
          SELECT table_name FROM user_tables
          UNION
          SELECT view_name AS table_name FROM user_views
        `;
      const result = await oracleConnection.execute(query);
      const tables = result.rows.map((row) => row[0]);
      res.json({ success: true, data: tables });
    } else {
      throw new Error("ยังไม่ได้เชื่อมต่อฐานข้อมูล");
    }
  } catch (error) {
    console.error("ไม่สามารถดึงรายชื่อตารางได้:", error);
    res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงรายชื่อตารางได้",
      error: error.message,
    });
  }
});

// API endpoint สำหรับดึงข้อมูลจากตาราง
app.get("/api/data/:tableName", checkConnection, async (req, res) => {
  const { tableName } = req.params;

  try {
    if (dbType === "mysql") {
      connection.query(`SELECT * FROM ??`, [tableName], (error, results) => {
        if (error) throw error;
        res.json({ success: true, data: results });
      });
    } else if (dbType === "oracle") {
      const query = `SELECT * FROM "${tableName}"`;
      const result = await oracleConnection.execute(query);
      res.json({ success: true, data: result.rows });
    } else {
      throw new Error("ยังไม่ได้เชื่อมต่อฐานข้อมูล");
    }
  } catch (error) {
    console.error("ไม่สามารถดึงข้อมูลจากตารางได้:", error);
    res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลจากตารางได้",
      error: error.message,
    });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
