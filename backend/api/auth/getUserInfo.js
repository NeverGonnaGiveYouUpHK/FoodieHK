/*
Input: {
	userID: number (non-negative integer)
}
*/

module.exports = async (req, res, next) => {
	if (typeof req.body.userID !== "number") return res.status(400).json({message: "userID must be of type number"});
	if (!Number.isInteger(req.body.userID) || req.body.userID < 0) return res.status(400).json({message: "userID must be a non-negative integer"});

	const user = await query("SELECT `name` FROM `users` WHERE `ID`=?;", [req.body.userID]);

	if (user.length === 0) return res.status(404).json({message: "user with given ID was not found"});

	return res.status(200).json({
		name: user[0].name
	});
};