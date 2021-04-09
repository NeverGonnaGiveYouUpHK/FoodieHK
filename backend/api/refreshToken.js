/*
Input: {
	accessToken	: string
	refreshToken: string (refresh token that was generated with the given accessToken)
}
*/

const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
	if (typeof req.body.accessToken !== "string") return res.status(400).json({message: "accessToken must be of type string"});
	if (typeof req.body.refreshToken !== "string") return res.status(400).json({message: "refreshToken must be of type string"});



	try {
		var accessToken = jwt.verify(req.body.accessToken, global.jwtSecretKey, {algorithms: ["HS256"], ignoreExpiration: true});
		if (accessToken.type !== "access") throw new Error("invalid type of token, access expected");
	} catch (error){
		return res.status(400).json({message: "invalid access token"});
	}

	try {
		var refreshToken = jwt.verify(req.body.refreshToken, global.jwtSecretKey, {algorithms: ["HS256"]});
		if (refreshToken.type !== "refresh") throw new Error("invalid type of token, refresh expected");
	} catch (error){
		return res.status(400).json({message: "invalid refresh token"});
	}

	if (refreshToken.payload !== req.body.accessToken.split(".")[1]) return res.status(403).json({message: "refresh and access token don't make a pair"});


	let user = await query("SELECT `acceptedRefresh`, `email`, `name`, `groups` FROM `users` WHERE `ID`=?;", [accessToken.ID]);

	if (user.length === 0) return res.status(404).json({message: "user not found! was the account deleted?"});
	
	user = user[0];

	if (refreshToken.iat * 1000 < user.acceptedRefresh) return res.status(403).json({message: "this refresh token has been invalidated with full logout"});


	const newToken = jwt.sign({
		type: "access",
		ID: accessToken.ID,
	}, global.jwtSecretKey, {algorithm: "HS256", expiresIn: 15 * 60});

	const newRefreshToken = jwt.sign({ //refresh tokens die after 30 days, but can all be invalidated instantly by changing accepted refresh in the database
		type: "refresh",
		payload: newToken.split(".")[1]
	}, global.jwtSecretKey, {algorithm: "HS256", expiresIn: 30 * 24 * 60 * 60});
	
	let groups = [];
	if (user.groups !== ""){
		for (const group of user.groups.split(" ")){
			groups.push(Number(group));
		}
	}

	return res.status(200).json({
		accessToken: newToken,
		refreshToken: newRefreshToken,
		ID: accessToken.ID,
		email: user.email,
		name: user.name,
		groups: groups
	});
};