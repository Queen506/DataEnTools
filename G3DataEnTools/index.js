const oracledb = require("oracledb");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function run() {
  let connection;

  try {
    connection = await oracledb.getConnection({
      user: "Admindb",
      password: "sql123",
      connectString: "localhost/orcl",
    });

    let query = `SELECT * FROM tab`;

    const result = await connection.execute(query);
    console.log(result.rows);
  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
  }
}

run();
