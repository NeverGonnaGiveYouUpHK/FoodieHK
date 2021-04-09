module.exports = function (onConnect){
	const mysql = require("mysql");
	
	const con = mysql.createConnection({
		host: process.env.databaseHost,
		user: process.env.databaseUser,
		password: process.env.databasePassword,
		database: "hack_kosice_db",
		charset: "utf8mb4"
	});

	con.connect((err) => {
		if (err) throw err;
		console.log("[INFO] MySQL connected");
		query("SET SQL_SAFE_UPDATES=0;");

		setInterval(() => {
			query("SELECT 1");
		}, 120 * 60 * 1000);

		onConnect();
	});

	query = function(query_string, values){
		if (typeof values === "undefined"){
			values = [];
		}
		return new Promise((resolve, reject) => {
			con.query(query_string, values, (err, result) => {
				if (err){
					reject(err);
				} else {
					resolve(result);
				}
			});
		});
	};
}
