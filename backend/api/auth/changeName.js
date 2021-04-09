/*
INPUT: {
	name: string (1-80 characters)
}
*/

const manager = require("../../groupManager");

module.exports = async (req, res, next) => {
	if (typeof req.body.name !== "string") return res.status(400).json({message: "name must be of type string"});
	if (req.body.name.length < 1 || req.body.name.length > 80) return res.status(400).json({message: "name must 1-80 characters long"});
	
	await query("UPDATE `users` SET `name`=? WHERE `ID`=?;", [req.body.name, req.user.ID]);

	const user = await query("SELECT `groups` FROM `users` WHERE `ID`=?;", [req.user.ID]);


	let groups = [];
	if (user.groups !== ""){
		for (const group of user[0].groups.split(" ")){
			groups.push(Number(group));
		}
	}


	manager.broadcastToGroups(groups, JSON.stringify({
		action: "changeName",
		userID: req.user.ID,
		name: req.body.name
	}));

	return res.status(200).json({message: "name changed"});
}