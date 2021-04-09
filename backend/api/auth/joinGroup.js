/*
Input: {
	inviteCode: string
}
*/

const manager = require("../../groupManager");

module.exports = async (req, res, next) => {
	if (typeof req.body.inviteCode !== "string") return res.status(400).json({message: "inviteCode must be of type string"});

	const result = await manager.joinGroup(req.body.inviteCode, req.user.ID);

	return res.status(result[0]).json(result[1]);
};