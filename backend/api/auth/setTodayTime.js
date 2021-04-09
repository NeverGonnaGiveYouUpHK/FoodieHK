/*
Input: {
	from: number (hours * 60 + minutes),
	to: number (hours * 60 + minutes),
	groupID: number (non-negative integer)
}
*/


const manager = require("../../groupManager");

module.exports = async (req, res, next) => {
	if (typeof req.body.from !== "number") return res.status(400).json({message: "from must be of type number"});
	if (!Number.isInteger(req.body.from) || req.body.from < 0 || req.body.from > 1440) return res.status(400).json({message: "from must be a non-negative integer not greater than 1440"});
	if (typeof req.body.to !== "number") return res.status(400).json({message: "to must be of type number"});
	if (!Number.isInteger(req.body.to) || req.body.to < 0 || req.body.to > 1440) return res.status(400).json({message: "to must be a non-negative integer not greater than 1440"});

	if (req.body.to < req.body.from) return res.status(400).json({message: "'to' may not be before 'from'"});

	if (typeof req.body.groupID !== "number") return res.status(400).json({message: "groupID must be of type number"});
	if (!Number.isInteger(req.body.groupID) || req.body.groupID < 0) return res.status(400).json({message: "groupID must be a non-negative integer"});


	const result = await manager.setTodayTime(req.body.from, req.body.to, req.body.groupID, req.user.ID);

	return res.status(result[0]).json(result[1]);
};