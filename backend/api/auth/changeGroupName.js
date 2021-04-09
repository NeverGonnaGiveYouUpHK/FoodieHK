/*
Input: {
	groupID	: number (integer)
	name	: string (new name of the group 1-64 characters)
}
*/

const manager = require("../../groupManager");

module.exports = async (req, res, next) => {
	if (typeof req.body.groupID !== "number") return res.status(400).json({message: "groupID must be of type number"});
	if (!Number.isInteger(req.body.groupID) || req.body.groupID < 0) return res.status(400).json({message: "groupID must be a non-negative integer"});
	
	if (typeof req.body.name !== "string") return res.status(400).json({message: "name must be of type string"});
	if (typeof req.body.name.length === 0) return res.status(400).json({message: "name may not be an empty string"});
	if (typeof req.body.name.length > 64) return res.status(400).json({message: "name must be max. 64 characters long"});

	const result = await manager.changeName(req.body.name, req.body.groupID, req.user.ID);

	return res.status(result[0]).json(result[1]);
};