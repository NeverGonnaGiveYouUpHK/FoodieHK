
const CallbackTable = [

    //Get Invite Events
    {element: "GetInviteCodeButton", event: "click", callback: () => {document.getElementById('InviteContainer').style = "display: block;"} },
    {element: "CloseInviteButton", event: "click", callback: () => {document.getElementById('InviteContainer').style = "display: none;"} },

    //Join Group Events
    {element: "GroupJoinButton", event: "click", callback: () => {document.getElementById('JoinContainer').style = "display: block;"} },
    {element: "JoinButton", event: "click", callback: JoinGroup },
    {element: "JoinCloseButton", event: "click", callback: () => {document.getElementById('JoinContainer').style = "display: none;"} },

    //Leave Group
    {element: "LeaveGroupButton", event: "click", callback: () => {document.getElementById('LeaveContainer').style = "display: block;"} },
    {element: "LeaveYes", event: "click", callback: LeaveGroup },
    {element: "LeaveNo", event: "click", callback: () => {document.getElementById('LeaveContainer').style = "display: none;"} },

    //Voting Events
    {element: "LunchButtonYes", event: "click", callback: () => {setTodayEating(true)}},
    {element: "LunchButtonNo", event: "click", callback: () => {setTodayEating(false)}},

    {element: "DecideButtonYes", event: "click", callback: () => {setTodayOrdering(true)}},
    {element: "DecideButtonNo", event: "click", callback: () => {setTodayOrdering(false)}},
    
    {element: "SetTime", event: "click", callback: () => {setTodayTime()}},


    //Create Group Events
    {element: "GroupMakeButton", event: "click", callback: () => {document.getElementById('CreateContainer').style = "display: block;"} },
    {element: "CreateCloseButton", event: "click", callback: () => {document.getElementById('CreateContainer').style = "display: none;"} },
    {element: "CreateButton", event: "click", callback: CreateGroup },
];

var GroupData = [];
var SelectedGroupId = 0;

window.onload = function() {

    //Assign Callbacks
    for (var i = 0; i < CallbackTable.length; i++)
        document.getElementById(CallbackTable[i].element).addEventListener(CallbackTable[i].event, CallbackTable[i].callback);


    var ForceLogin = function() {    
		sessionStorage.clear();
		localStorage.removeItem('UserToken');

		location = "index.html";
    }

    var TokenPair       = localStorage.getItem('UserToken');
    var UserObject      = sessionStorage.getItem('User');
    var UserGroups      = sessionStorage.getItem('Groups');

    //If tokens not found, force user to log in 
    if(TokenPair == undefined) ForceLogin();

    //If you posess the tokens but not the user data, fetch them
    if(UserGroups == undefined || UserObject == undefined) RefreshToken();


    //Start token-refreshing loop
    setInterval(() => {
        RefreshToken();
    }, 14 * 60 * 1000);

    //Create socket connection to server
    CreateWebSocket();

    //Parse the objects
    TokenPair       = JSON.parse(localStorage.getItem('UserToken'));
    UserObject      = JSON.parse(sessionStorage.getItem('User'));
    UserGroups      = JSON.parse(sessionStorage.getItem('Groups'));

    UpdatePage(TokenPair, UserObject, UserGroups);
}


function UpdatePage(TokenPair, UserObject, UserGroups) {
    //Load the groups
    for(let i = 0; i < UserGroups.length; i++)
    {
        CallApi('loadGroup', { groupID: UserGroups[i] }).then(
            (res) => {
                console.log(res);
                GroupData[i] = res;

                var GroupLink = document.createElement("a");
                GroupLink.textContent = res.name;
                GroupLink.href = "javascript:void(0)";
                GroupLink.addEventListener('click', () => { ShowGroup(i); });

                document.getElementById('GroupWrapper').appendChild(GroupLink);
                document.getElementById('GroupWrapper').appendChild(document.createElement("br")); //Append New Line
                
                if(i == 0)
                    ShowGroup(0);
            },
            (err) => {
                console.log(err);
            }
        );
    }

    //Update DOM
    document.getElementById('UsersName').textContent = UserObject.name;


    //If user has no goups, display "No Groups" message
    if (UserGroups.length < 1) {

        var NoGroupsMsg = document.createElement("p");
        NoGroupsMsg.textContent = "You should join a group, mate!";

        document.getElementById('GroupWrapper').appendChild(NoGroupsMsg);
        return;
    } 
}

function ShowGroup(id) {


    //Un-disable all the buttons
    document.getElementById('LunchButtonYes').disabled = false;
    document.getElementById('LunchButtonNo').disabled = false;
    document.getElementById('DecideButtonYes').disabled = false;
    document.getElementById('DecideButtonNo').disabled = false;
    document.getElementById('SetTime').disabled = false;


    SelectedGroupId = id;
    document.getElementById('GroupContentWrapper').style = "display: block;";
    console.log(id);
    console.log(GroupData[id]);

    //Update the login Popup
    document.getElementById('InvText').textContent = "Invite code for " + GroupData[id].name + " is " + GroupData[id].inviteCode + ".";

    //Update DOM
    document.getElementById('SelectedGroupInfo').textContent = GroupData[id].name;


    document.getElementById('LeaveMessage').textContent = "Do you really want to leave " + GroupData[id].name + "? :(";
    document.getElementById('LeaveYes').disabled = false;
    document.getElementById('LeaveNo').disabled = false;

    const thisUser = JSON.parse(sessionStorage.User);
    for (const key of Object.keys(GroupData[id].users)){
        console.log(Number(key), thisUser.id);
        console.log(GroupData[id].users[key].today.wantsToOrder);
        if (GroupData[id].users[key].today.wantsToOrder && Number(key) !== thisUser.id){
            document.getElementById('DecideButtonYes').disabled = true;
            document.getElementById('DecideButtonNo').disabled = true;
            break;
        }
    }

    var TimeEstimate = calculateOptimalTime(GroupData[id].users);
    document.getElementById('OrderTime').textContent = "Currently it looks like " + Math.floor(TimeEstimate[1] / 60) + ":" + (TimeEstimate[1] % 60 < 10 ? "0" + TimeEstimate[1] % 60 : TimeEstimate[1] % 60);
    updateOrderer();

    if (GroupData[id].finalDecision != null) {

        //Print out
        document.getElementById('LunchButtonYes').disabled = true;
        document.getElementById('LunchButtonNo').disabled = true;
        document.getElementById('DecideButtonYes').disabled = true;
        document.getElementById('DecideButtonNo').disabled = true;
        document.getElementById('SetTime').disabled = true;
    }

    
}

function CreateGroup() {

    document.getElementById('CreateGroupName').style = "";    
    CallApi('newGroup', { name: document.getElementById('CreateGroupName').value, timezone: parseInt(document.getElementById('CreateGroupZone').value) }).then(
        (res) => {
            if(res == undefined) {
                //Show an error, then return
                return document.getElementById('CreateGroupName').style = "color: red;";    
            }

            RefreshToken().then(
                () => {
                    window.location = window.location;
                },
                () => {
                    ForceLogin();
                }
            );
        },
        (err) => {
            console.log(err);
            window.location = "index.html";
        }
    );
}

function JoinGroup() {

    document.getElementById('JoinCode').style = ""; 
    CallApi('joinGroup', { inviteCode: document.getElementById('JoinCode').value }).then(
        (res) => {
            if(res == undefined) {
                return document.getElementById('JoinCode').style = "color: red;";
            }

            RefreshToken().then(
                () => {
                    window.location = window.location;
                },
                () => {
                    ForceLogin();
                }
            );
        },
        (err) => {
            console.log(err);
            window.location = "index.html";
        }
    );
}

function LeaveGroup() {
    //groupID: number (non-negative integer)

    CallApi('leaveGroup', { groupID: GroupData[SelectedGroupId].ID }).then(

        (res) => {
            RefreshToken().then(
                () => {
                    window.location = window.location;
                },
                
                () => {
                    ForceLogin();
                }
            );
        },
        (err) => {
            console.log(err);
            window.location = "index.html";
        }
    );
}

function setTodayEating(value){
    const groupID = SelectedGroupId;
    CallApi("setTodayEating", {
        groupID: GroupData[groupID].ID,
        eating: value
    })
    .catch(() => {
        window.location = "index.html";
    });
}

function setTodayRestaurant(value){
    const groupID = SelectedGroupId;
    CallApi("setTodayRestaurant", {
        groupID: GroupData[groupID].ID,
        restaurant: value
    })
    .catch(() => {
        window.location = "index.html";
    });
}

function setTodayOrdering(value){
    const groupID = SelectedGroupId;

    for (const user of Object.values(GroupData[groupID].users)){
		if (user.ordering){
			return;
		}
	}

    CallApi("setTodayOrdering", {
        groupID: GroupData[groupID].ID,
        ordering: value
    })
    .catch(() => {
        window.location = "index.html";
    });
}

function setTodayTime(){
    const groupID = SelectedGroupId;

    const fromHourInput = document.getElementById("RegFromHour");
    const fromMinuteInput = document.getElementById("RegFromMinutes");
    const toHourInput = document.getElementById("RegToHour");
    const toMinuteInput = document.getElementById("RegToMinutes");

    fromHourInput.style.color = "";
    fromMinuteInput.style.color = "";
    toHourInput.style.color = "";
    toMinuteInput.style.color = "";

    const from = Number(fromHourInput.value) * 60 + Number(fromMinuteInput.value);
    const to = Number(toHourInput.value) * 60 + Number(toMinuteInput.value);

    if (from < 0 || from > 1440 || to < 0 || to > 1440 || to < from){
        fromHourInput.style.color = "#ff0000";
        fromMinuteInput.style.color = "#ff0000";
        toHourInput.style.color = "#ff0000";
        toMinuteInput.style.color = "#ff0000";
        return;
    }

    CallApi("setTodayTime", {
        groupID: GroupData[groupID].ID,
        from: from,
        to: to
    })
    .catch(() => {
        window.location = "index.html";
    });
}




function implicitOrderer(groupID){
	const group = getGroupByID(groupID);

	let orderer = null;
	let orders = Infinity;

	for (const key of Object.keys(group.users).sort((a, b) => {return a.localeCompare(b)})){
		if (group.users[key].today.wantsToOrder !== false && group.users[key].orders < orders){
			orderer = key;
			orders = group.users[key].orders;
		}
	}

	return orderer;
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