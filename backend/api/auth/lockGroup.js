/*
Input: {
	groupID: number,
	restaurant: string,
	time: number
}
*/


const manager = require("../../groupManager");

module.exports = async (req, res, next) => {
	if (typeof req.body.groupID !== "number") return res.status(400).json({message: "groupID must be of type number"});
	if (!Number.isInteger(req.body.groupID) || req.body.groupID < 0) return res.status(400).json({message: "groupID must be a non-negative integer"});

	if (typeof req.body.restaurant !== "string") return res.status(400).json({message: "restaurant must be of type string"});
	
	if (typeof req.body.time !== "number") return res.status(400).json({message: "time must be of type number"});
	if (!Number.isInteger(req.body.time) || req.body.time < 0 || req.body.time > 1440) return res.status(400).json({message: "time must be a non-negative integer not greater than 1440"});

	const result = manager.lockGroup(req.body.restaurant, req.body.time, req.body.groupID, req.user.ID);

	return res.status(result[0]).json({message: result[1]});
};