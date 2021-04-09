const jwt = require("jsonwebtoken");

module.exports = function (req, res, next){
	const token = req.headers["auth-token"];

	if (typeof token !== "string") return res.status(401).json({message: "no access token found"});

	try {
		const payload = jwt.verify(token, global.jwtSecretKey, {algorithms: ["HS256"]});

		if (payload.type !== "access") return res.status(400).json({message: `expected an access token, got type '${payload.type}'`});
		
		req.user = payload;
		next();
	} catch(err){
		switch (err.name){
			case "TokenExpiredError":
				return res.status(401).json({message: "token expired"});
			default:
				return res.status(400).json({message: "invalid token"});
		}
	}
}