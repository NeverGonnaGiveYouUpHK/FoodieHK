/*
Input: {
	email	: string
	password: string
}
*/

const scrypt = require("../util/scrypt");
const jwt = require("jsonwebtoken");

const fakeSalt = Buffer.from("c4a777c0f0938514978c6c3cb08306e9c7094df945eba9a7a2358134afcf112c", "hex");
const fakeHash = Buffer.from("c680d66589739e1e9a8ed9c90ac0bde77c7358ca5d05a17a1181b7848453992c38d353a9b6061b9d537171be13dc367454b9b4a87c904e23085fc332a2233971", "hex");
//result of hashing "Never Gonna Give You Up" with fakeSalt :D

module.exports = async (req, res, next) => {
	if (typeof req.body.email !== "string") return res.status(400).json({message: "email must be of type string"});
	if (typeof req.body.password !== "string") return res.status(400).json({message: "password must be of type string"});

	let user = await query("SELECT * FROM `users` WHERE `email`=?;", [req.body.email]);

	if (user.length === 0){ //to prevent email guessing/farming, we run the hash nonetheless
		await scrypt.verify(req.body.password, fakeSalt, fakeHash); //even if they guess the password from the top, results are discarded
		res.status(404).json({message: "user with this identifier and password not found"});
	} else {
		user = user[0];
		
		const match = await scrypt.verify(req.body.password, user.salt, user.password);

		if (match){
			const token = jwt.sign({
				type: "access",
				ID: user.ID
			}, global.jwtSecretKey, {algorithm: "HS256", expiresIn: 15 * 60});

			const refreshToken = jwt.sign({ //refresh tokens die after 30 days, but can all be invalidated instantly by changing accepted refresh in the database
				type: "refresh",
				payload: token.split(".")[1]
			}, global.jwtSecretKey, {algorithm: "HS256", expiresIn: 30 * 24 * 60 * 60});

			await query("UPDATE `users` SET `lastLogin`=? WHERE `ID`=?;", [Date.now(), user.ID]);

			
			let groups = [];
			if (user.groups !== ""){
				for (const group of user.groups.split(" ")){
					groups.push(Number(group));
				}
			}
			

			return res.status(200).json({
				ID: user.ID,
				name: user.name,
				email: user.email,
				groups: groups,
				accessToken: token,
				refreshToken: refreshToken
			});
		} else {
			return res.status(404).json({message: "user with this identifier and password not found"});
		}
	}
};