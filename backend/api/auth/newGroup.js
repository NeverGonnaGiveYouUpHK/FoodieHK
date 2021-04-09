/*
Input: {
	name: string (name of the group 1-64 characters, doesn't have to be unique),
	timezone: number (offset from GMT in minutes)
}
*/


const manager = require("../../groupManager");

module.exports = async (req, res, next) => {
	if (typeof req.body.name !== "string") return res.status(400).json({message: "name must be of type string"});
	if (typeof req.body.name.length === 0) return res.status(400).json({message: "name may not be an empty string"});
	if (typeof req.body.name.length > 64) return res.status(400).json({message: "name must be max. 64 characters long"});

	if (typeof req.body.timezone !== "number") return res.status(400).json({message: "timezone must be of type number"});
	if (!Number.isInteger(req.body.timezone) || req.body.timezone < -720 || req.body.from > 840) return res.status(400).json({message: "timezone must be an integer in range from -720 to 840"});


	const groupID = await manager.newGroup(req.body.name, req.body.timezone, req.user.ID);

	return res.status(200).json({groupID: groupID});
};