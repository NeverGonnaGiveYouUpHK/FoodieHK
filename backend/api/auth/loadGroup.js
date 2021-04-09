/*
Input: {
	groupID: number (non-negative integer)
}
*/

/* 
Output: {
	name: string,
	inviteCode: string,
	users: {
		userID: {
			orders: number
		}
	},
	restaurants: {
		restaurantName: ...some TODO restaurant info...
	}
}
*/

const manager = require("../../groupManager");

module.exports = async (req, res, next) => {
	if (typeof req.body.groupID !== "number") return res.status(400).json({message: "groupID must be of type number"});
	if (!Number.isInteger(req.body.groupID) || req.body.groupID < 0) return res.status(400).json({message: "groupID must be a non-negative integer"});

	const result = await manager.loadGroup(req.body.groupID, req.user.ID);

	return res.status(result[0]).json(result[1]);
};