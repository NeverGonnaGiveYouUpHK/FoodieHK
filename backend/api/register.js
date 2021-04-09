/*
Input: {
	email		: string (1-80 characters)
	name		: string (1-80 characters)
	password	: string (8+ characters)
}
*/

const scrypt = require("../util/scrypt");
const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,24}$/g;

module.exports = async (req, res, next) => {
	if (typeof req.body.email !== "string") return res.status(400).json({message: "Invalid Email Address"});
	if (req.body.email.length < 1 || req.body.email.length > 80) return res.status(400).json({message: "Email Must 1-80 Characters Long"});
	if (req.body.email.match(emailRegex) === null) return res.status(400).json({message: "Invalid Email Address. Use Format: user@page.xyz"});

	if (typeof req.body.name !== "string") return res.status(400).json({message: "Invalid Name"});
	if (req.body.name.length < 1 || req.body.name.length > 80) return res.status(400).json({message: "Name Must 1-80 Characters Long"});

	if (typeof req.body.password !== "string") return res.status(400).json({message: "Invalid Password"});
	if (req.body.password.length < 8) return res.status(400).json({message: "Password Must Be At Least 8 Characters Long"});



	const email = await query("SELECT `email` FROM `users` WHERE `email`=?;", [req.body.email]);
	if (email.length !== 0) return res.status(403).json({message: "email taken"});

	const hash = await scrypt.hash(req.body.password);
	await query("INSERT INTO `users` (`email`, `password`, `salt`, `name`, `created`, `lastLogin`, `acceptedRefresh`) VALUES (?, ?, ?, ?, ?, ?, ?);", [
		req.body.email,
		hash.hash,
		hash.salt,
		req.body.name,
		Date.now(),
		Date.now(),
		Date.now()
	]);

	return res.status(200).json({message: "account created successfully"});
};