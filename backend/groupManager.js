const groups = new Map();
const groupsByInvite = new Map();

const needsSave = new Set();

module.exports.initialize = async function load(){
	const groupsTable = await query("SELECT * FROM `groups`;");

	for (const group of groupsTable){
		group.users = JSON.parse(group.users);
		group.restaurants = JSON.parse(group.restaurants);

		groups.set(group.ID, group);
		groupsByInvite.set(group.inviteCode, group);
	}
}


const {setIntervalAsync} = require("set-interval-async/dynamic");

//autosave
setIntervalAsync(async () => {
	for (const groupID of needsSave){
		const group = groups.get(groupID);
		query("UPDATE `groups` SET `users`=?, `restaurants`=? WHERE `ID`=?;", [JSON.stringify(group.users), JSON.stringify(group.restaurants), groupID]);
	}
	needsSave.clear();
}, 15 * 1000);


async function executeReset(){
	const now = Date.now();
	for (const group of groups.values()){
		const sinceLastMidnight = (now + group.timezone * 60 * 1000) % (24 * 60 * 60 * 1000);
		if (sinceLastMidnight < group.lastResetCheck){
			group.finalDecision = null;
			
			for (const key of Object.keys(group.users)){
				group.users[key].today = {
					wantsToEat: null,
					wantsToOrder: null, 
					restaurant: null,
					time: null
				}
			}

			needsSave.add(group.ID);
		}

		group.lastResetCheck = sinceLastMidnight;
	}
}
setTimeout(() => {
	executeReset();
	setIntervalAsync(executeReset, 15 * 60 * 1000);
}, (15.5 * 60 * 1000) - (Date.now() % (15 * 60 * 1000)));


const randomStringCS = require("./util/randomStringCS");
const charset = "0123456789abcdefghijklmnopqrstuvwxyz";

module.exports.newGroup = async function newGroup(name, timezone, userID){
	while (true){
		try {
			var code = randomStringCS(8, charset);
			var result = await query("INSERT INTO `groups` (`name`, `inviteCode`, `timezone`, `users`) VALUES (?, ?, ?, ?);", [
				name,
				code,
				timezone,
				`{"${userID}": {"orders": 0, "today": {"wantsToEat": null, "wantsToOrder": null, "restaurant": null, "time": null}}}`
			]);

			break;
		} catch(error){
			//try again
		}
	}

	await query("UPDATE `users` SET `groups`=TRIM(CONCAT(groups, ' ', ?)) WHERE `ID`=?;", [result.insertId.toString(), userID]);

	const users = {};
	users[userID.toString()] = {
		orders: 0,
		today: {
			wantsToEat: null,
			wantsToOrder: null, 
			restaurant: null,
			time: null
		}
	}

	groups.set(result.insertId, {
		ID: result.insertId,
		name: name,
		inviteCode: code,
		timezone: timezone,
		lastResetCheck: Date.now() % (24 * 60 * 60 * 1000),
		users: users,
		finalDecision: null
	});

	return result.insertId;
}






module.exports.changeCode = async function resetCode(groupID, userID){
	const group = groups.get(groupID);
	if (typeof group === "undefined") return [404, {message: "group not found"}];

	if (!group.users.hasOwnProperty(userID.toString())) return [403, {message: "you are not a part of the group"}];

	while (true){
		try {
			var code = randomStringCS(8, charset);
			await query("UPDATE `groups` SET `inviteCode`=? WHERE ID=?;", [code, groupID]);

			break;
		} catch(error){
			//try again
		}
	}
	
	

	groupsByInvite.delete(group.inviteCode);
	groupsByInvite.set(code, group);

	group.inviteCode = code;

	broadcastToGroups([groupID], JSON.stringify({
		action: "changeGroupInviteCode",
		groupID: groupID,
		newCode: code
	}));

	return [200, {message: "code changed"}];
}



module.exports.changeName = async function changeName(name, groupID, userID){
	const group = groups.get(groupID);
	if (typeof group === "undefined") return [404, {message: "group not found"}];

	if (!group.users.hasOwnProperty(userID.toString())) return [403, {message: "you are not a part of the group"}];

	await query("UPDATE `groups` SET `name`=? WHERE ID=?;", [name, groupID]);

	group.name = name;

	broadcastToGroups([groupID], JSON.stringify({
		action: "changeGroupName",
		groupID: groupID,
		newName: name
	}));

	return [200, {message: "name changed"}];
}



module.exports.joinGroup = async function joinGroup(inviteCode, userID){
	const group = groupsByInvite.get(inviteCode);

	if (typeof group === "undefined") return [404, {message: "group not found"}];

	const userIDstring = userID.toString();

	if (group.users.hasOwnProperty(userIDstring)) return [403, {message: "user is already in group"}];

	await query("UPDATE `users` SET `groups`=TRIM(CONCAT(groups, ' ', ?)) WHERE `ID`=?;", [group.ID.toString(), userID]);

	let average = 0;
	for (const value of Object.values(group.users)){
		average += value.orders;
	}
	average = Math.floor(average / Object.keys(group.users).length);


	group.users[userIDstring] = {
		orders: average,
		today: {
			wantsToEat: null,
			wantsToOrder: null,
			restaurant: null,
			time: null
		}
	};

	needsSave.add(group.ID);

	broadcastToGroups([group.ID], JSON.stringify({
		action: "joinGroup",
		groupID: group.ID,
		userID: userID,
		userData: group.users[userIDstring]
	}));

	return [200, {message: "joined group"}];
}



module.exports.leaveGroup = async function leaveGroup(groupID, userID){
	const group = groups.get(groupID);
	if (typeof group === "undefined") return [404, {message: "group not found"}];

	if (!group.users.hasOwnProperty(userID.toString())) return [403, {message: "you are not a part of the group"}];

	delete group.users[userID.toString()];
	
	while (true){
		const user = await query("SELECT `groups` FROM `users` WHERE `ID`=?;", [userID]); 
		
		const userGroups = user[0].groups.split(" ");
		userGroups.splice(userGroups.indexOf(groupID), 1);

		const result = await query("UPDATE `users` SET `groups`=? WHERE `ID`=? AND `groups`=?;", [userGroups.join(" "), userID, user[0].groups]);

		if (result.affectedRows !== 0){
			break;
		}
		//try again, we lost a race with different call, expect this to happen extremely rarely
	}

	needsSave.add(groupID);

	broadcastToGroups([groupID], JSON.stringify({
		action: "leaveGroup",
		groupID: groupID,
		userID: userID
	}));

	return [200, {message: "left group"}];
}



module.exports.loadGroup = async function loadGroup(groupID, userID){
	const group = groups.get(groupID);
	if (typeof group === "undefined") return [404, {message: "group not found"}];

	if (!group.users.hasOwnProperty(userID.toString())) return [403, {message: "you are not a part of the group"}];

	return [200, group];
}



module.exports.setTodayRestaurant = async function setTodayRestaurant(restaurant, groupID, userID){
	const group = groups.get(groupID);
	if (typeof group === "undefined") return [404, {message: "group not found"}];

	if (!group.users.hasOwnProperty(userID.toString())) return [403, {message: "you are not a part of the group"}];

	if (group.finalDecision !== null) return [403, {message: "final decision has already been made today"}];

	if (!group.restaurants.hasOwnProperty(restaurant)){
		group.restaurants[restaurant] = {
			orders: 0
		};

		broadcastToGroups([groupID], JSON.stringify({
			action: "addedRestaurant",
			groupID: groupID,
			restaurant: restaurant
		}));
	}

	group.users[userID.toString()].today.restaurant = restaurant;

	broadcastToGroups([groupID], JSON.stringify({
		action: "setTodayRestaurant",
		groupID: groupID,
		userID: userID,
		restaurant: restaurant
	}));

	needsSave.add(groupID);

	return [200, {message: "restaurant set"}];
}



module.exports.setTodayEating = async function setTodayEating(eating, groupID, userID){
	const group = groups.get(groupID);
	if (typeof group === "undefined") return [404, {message: "group not found"}];

	if (!group.users.hasOwnProperty(userID.toString())) return [403, {message: "you are not a part of the group"}];

	if (group.finalDecision !== null) return [403, {message: "final decision has already been made today"}];

	group.users[userID.toString()].today.wantsToEat = eating;

	broadcastToGroups([groupID], JSON.stringify({
		action: "setTodayEating",
		groupID: groupID,
		userID: userID,
		eating: eating
	}));

	needsSave.add(groupID);

	return [200, {message: "eating set"}];
}



module.exports.setTodayOrdering = async function setTodayOrdering(ordering, groupID, userID){
	const group = groups.get(groupID);
	if (typeof group === "undefined") return [404, {message: "group not found"}];

	if (!group.users.hasOwnProperty(userID.toString())) return [403, {message: "you are not a part of the group"}];

	if (group.finalDecision !== null) return [403, {message: "final decision has already been made today"}];

	if (ordering){
		for (const key in group.users){
			if (group.users[key].today.wantsToOrder && Number(key) !== userID){
				return [403, {message: "someone has already chosen to order today"}];
			}
		}
	}
	

	group.users[userID.toString()].today.wantsToOrder = ordering;

	broadcastToGroups([groupID], JSON.stringify({
		action: "setTodayOrdering",
		groupID: groupID,
		userID: userID,
		ordering: ordering
	}));

	needsSave.add(groupID);

	return [200, {message: "eating set"}];
}



module.exports.setTodayTime = async function setTodayTime(from, to, groupID, userID){
	const group = groups.get(groupID);
	if (typeof group === "undefined") return [404, {message: "group not found"}];

	if (!group.users.hasOwnProperty(userID.toString())) return [403, {message: "you are not a part of the group"}];

	if (group.finalDecision !== null) return [403, {message: "final decision has already been made today"}];

	for (const user of Object.values(group.users)){
		if (user.ordering){
			return [403, {message: "someone has already chosen to order today"}];
		}
	}

	group.users[userID.toString()].today.time = {
		from: from,
		to: to
	};

	const optimalTime = calculateOptimalTime(group.users);

	broadcastToGroups([groupID], JSON.stringify({
		action: "setTodayTime",
		groupID: groupID,
		userID: userID,
		time: {
			from: from,
			to: to
		},
		estimatedTimeWrongness: optimalTime[0],
		estimatedTime: optimalTime[1]
	}));

	needsSave.add(groupID);

	return [200, {message: "eating set"}];
}


function calculateOptimalTime(users){
	let wrongness = Infinity;
	let time = null;
	
	let checkingFrom = 1440;
	let checkingTo = 0;
	
	const checkedValues = [];

	for (const value of Object.values(users)){
		
		console.log(value);
		if (value.today.time === null) continue;

		if (value.today.time.from < checkingFrom){
			checkingFrom = value.today.time.from;
		}

		if (value.today.time.to > checkingTo){
			checkingTo = value.today.time.to;
		}

		checkedValues.push(value.today.time);
	}

	for (var sample = checkingFrom - checkingFrom % 5; sample <= checkingTo; sample += 5){
		let currentWrongness = 0;

		for (const value of checkedValues){
			if (sample < value.from){
				currentWrongness += Math.pow(value.from - sample, 1.25);
			} else if (sample > value.to){
				currentWrongness += Math.pow(sample - value.to, 1.25);
			} //else we would add 0, so do nothing
		}

		if (currentWrongness < wrongness){
			wrongness = currentWrongness;
			time = sample;
		}
	}

	return [wrongness, time];
}



module.exports.lockGroup = function lockGroup(restaurant, time, groupID, userID){
	const group = groups.get(groupID);
	if (typeof group === "undefined") return [404, {message: "group not found"}];

	if (!group.users.hasOwnProperty(userID.toString())) return [403, {message: "you are not a part of the group"}];

	if (group.finalDecision !== null) return [403, {message: ""}];

	let orderer = null;

	for (const key in group.users){
		if (group.users[key].ordering){
			orderer = key;
			break;
		}
	}

	if (orderer = null){
		orderer = implicitOrderer(groupID);
	}

	if (Number(orderer) !== userID){
		return [403, {message: "you're not ordering today"}];
	}

	group.finalDecision = {
		orderer: userID,
		restaurant: restaurant,
		time: time
	}

	group.restaurants[restaurant].orders++;
	group.users[userID.toString()].orders++;

	broadcastToGroups([groupID], JSON.stringify({
		action: "lockGroup",
		groupID: groupID,
		orderer: userID,
		restaurant: restaurant,
		time: time
	}));

	needsSave.add(groupID);

	return [200, "group locked"];
}


function implicitOrderer(groupID){
	const group = groups.get(groupID);

	let orderer = null;
	let orders = Infinity;

	for (const key in Object.keys(group.users).sort((a, b) => {return a.localeCompare(b)})){
		if (group[key].wantsToOrder !== false && group[key].orders < orders){
			orderer = key;
			orders = group[key].orders;
		}
	}

	return orderer;
}


const socket = require("./api/socket/socket");

function broadcastToGroups(groupList, message){
	const users = new Set();

	for (const groupID of groupList){
		const group = groups.get(groupID);

		for (const key in group.users){
			users.add(Number(key));
		}
	}
	
	socket.broadcastToUsers(Array.from(users), message);
}

module.exports.broadcastToGroups = broadcastToGroups;