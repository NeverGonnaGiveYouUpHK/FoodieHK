const sockets = new Map();



const WebSocketServer = require("ws").Server;
const jwt = require("jsonwebtoken");

module.exports.initialize = function(server){
	const wss = new WebSocketServer({noServer: true});
	//custom upgrade handler to run socket on port 80 along with the API
	server.on("upgrade", (request, socket, head) => {
		if (request.url === "/socket"){
		  	wss.handleUpgrade(request, socket, head, (ws) => {
				wss.emit("connection", ws, request);
			});
		} else {
			socket.destroy();
		}
	});

	wss.on("connection", (socket) => {
		socket.json = function (data){
			this.send(JSON.stringify(data));
		}

		socket.on("message", async function (message){
			try {
				var payload = JSON.parse(message);
			} catch (error){
				return this.json({action: "error", description: "received invalid JSON"});
			}
			
			switch (payload.action) {
				case "authenticate":
					try {
						const token = jwt.verify(payload.token, global.jwtSecretKey, {algorithms: ["HS256"]});
				
						if (token.type !== "access") return this.json({action: "error", description: `expected an access token, got type '${payload.type}'`});

						this.userID = token.ID;

						const userSockets = sockets.get(token.ID);

						if (typeof userSockets === "undefined"){
							sockets.set(token.ID, [this]);
						} else {
							userSockets.push(this);
						}
					} catch(err){
						switch (err.name){
							case "TokenExpiredError":
								return this.json({action: "error", description: "token expired"});
							default:
								return this.json({action: "error", description: "invalid token"});
						}
					}
					break;
				default:
					this.json({action: "error", description: "unknown action"});
					break;
			}			
		});
		
		socket.on("close", function (){
			if (this.hasOwnProperty("userID")){
				const userSockets = sockets.get(this.userID);
				
				const location = userSockets.indexOf(this);

				if (location === -1){
					return console.log("Something went wrong here...");
				}

				if (userSockets.length === 1){
					sockets.delete(this.userID);
				} else {
					userSockets.splice(location, 1);
				}
			}
		});
	});
}


module.exports.broadcastToUsers = function broadcastToUsers(users, message){
	for (const user of users){
		userSockets = sockets.get(user);

		if (typeof userSockets === "undefined") continue;

		for (const socket of userSockets){
			socket.send(message);
		}
	}
}