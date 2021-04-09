

function CreateWebSocket() {

	//Socket object
	var socket = null;

	//Auth token (refresh & session)
	var token = JSON.parse(localStorage.getItem('UserToken'));



	//Create socket
	socket = new WebSocket(`${(location.protocol === "https:" ? "wss:" : "ws:")}//${location.host}/socket`);
	socket.addEventListener("open", (event) => {
		socket.send(JSON.stringify({
			action: "authenticate", 
			token: token.access
		}));

		document.getElementById('ErrorContainer').style = "display: none";
	});

	socket.addEventListener("close", (event) => {
		
		//Open Error Popup
		document.getElementById('ErrorContainer').style = "display: block";

		//Try Rejoin every 5 seconds
		setTimeout(() => {
			CreateWebSocket();
		}, 5 * 1000);
	});

	socket.addEventListener("error", (event) => {
	   
		//Open Error Popup
		//Open Error Popup
		document.getElementById('ErrorContainer').style = "display: block";
				
		//Try Rejoin every 5 seconds
		setTimeout(() => {
			CreateWebSocket();
		}, 5 * 1000);
	});

	socket.addEventListener("message", (event) => {
		
		//Try-catch parsing, if any data coruption occures
		try {
			var payload = JSON.parse(event.data);
		} catch(e) {
			return;
		}

		//Handle the update
		
		//If any error occures, force user to rejoin
		switch (payload.action){
			case "error":
				sessionStorage.clear();
				localStorage.removeItem('UserToken');

				location = "index.html";
				break;
		
			case "changeGroupInviteCode":
				getGroupByID(payload.groupID).inviteCode = payload.newCode;
				break;
			
			case "changeGroupName":
				//group name change not implemented
				break;

			case "joinGroup":
				getGroupByID(payload.groupID).users[payload.userID.toString()] = res.userData;
				break;

			case "leaveGroup":
				delete getGroupByID(payload.groupID).users[payload.userID.toString()];
				break;

			case "addedRestaurant":
				getGroupByID(payload.groupID).restaurants[payload.restaurant] = {orders: 0};
				break;
			
			case "setTodayRestaurant":
				getGroupByID(payload.groupID).users[payload.userID].today.restaurant = payload.restaurant;
				break;

			case "setTodayEating":
				getGroupByID(payload.groupID).users[payload.userID].today.wantsToEat = payload.eating;
				break;

			case "setTodayOrdering":
				const group = getGroupByID(payload.groupID);
				

				const thisUser = JSON.parse(sessionStorage.User);
				if (thisUser.id === payload.userID){
					document.getElementById("DecideButtonYes").disabled = false;
					document.getElementById("DecideButtonNo").disabled = false;
				} else if (payload.ordering && thisUser.id !== payload.userID){
					document.getElementById("DecideButtonYes").disabled = true;
					document.getElementById("DecideButtonNo").disabled = true;
				} else { //not ordering not us
					if (group.users[payload.userID].today.wantsToOrder === true){
						document.getElementById("DecideButtonYes").disabled = false;
						document.getElementById("DecideButtonNo").disabled = false;
					}
				}
				
				group.users[payload.userID].today.wantsToOrder = payload.ordering;

				updateOrderer();
					
				break;

			case "setTodayTime":
				console.log(payload.userID.toString());
				getGroupByID(payload.groupID).users[payload.userID.toString()].today.time = payload.time;
				break;

			case "lockGroup":
				getGroupByID(payload.groupID).finalDecision = {
					orderer: payload.orderer,
					restaurant: payload.restaurant,
					time: payload.time
				}
				break;

			case "changeName":
				//username change not implemented
				break;

			default:
				break;
		}
	});
}

function CallApi(api, payload) {
	
	return new Promise((resolve, reject) => {
		fetch('/api/auth/' + api, {
			method: 'POST',
			body: JSON.stringify(payload),
			headers: {
				"Content-Type": "application/json",
				"auth-token": JSON.parse(localStorage.getItem('UserToken')).access
			}
		}).then(function(res){

			if(res.status != 200) {
				return res.json().then((body) => { reject(body); });;
			}

			res.json().then((body) => { resolve(body); });
		});
	});
}

function getGroupByID(ID){
	for (const group of GroupData){
		if (group.ID === ID){
			return group;
		}
	}
}

function updateOrderer(){
	const group = GroupData[SelectedGroupId];
	for (const key of Object.keys(group.users)){
		if (group.users[key].today.wantsToOrder){
			CallApi("getUserInfo", {userID: Number(key)})
			.then((res) => {
				document.getElementById("OrderUser").textContent = res.name;
			})
			return;
		}
	}

	const implicit = implicitOrderer(group.ID);
	if (implicit === null){
		document.getElementById("OrderUser").textContent = "Noone wants to order...";
	} else {
		CallApi("getUserInfo", {userID: Number(implicit)})
		.then((res) => {
			document.getElementById("OrderUser").textContent = res.name;
		})
	}
}