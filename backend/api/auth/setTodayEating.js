/*
Input: {
	eating: boolean,
	groupID: number (non-negative integer)
}
*/

const manager = require("../../groupManager");

module.exports = async (req, res, next) => {
	if (typeof req.body.eating !== "boolean") return res.status(400).json({message: "eating must be of type boolean"});
	if (typeof req.body.groupID !== "number") return res.status(400).json({message: "groupID must be of type number"});
	if (!Number.isInteger(req.body.groupID) || req.body.groupID < 0) return res.status(400).json({message: "groupID must be a non-negative integer"});

	const result = await manager.setTodayEating(req.body.eating, req.body.groupID, req.user.ID);

	return res.status(result[0]).json(result[1]);
};