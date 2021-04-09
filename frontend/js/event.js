
const CallbackTable = [

    //Login Events
    {element: "LogInButton", event: "click", callback: LogIn},

    //Register Events
    {element: "RegisterButton", event: "click", callback: Register},

    //CheckBox
    {element: "AutoLogIn", event: "click", callback: () => { console.log(document.getElementById('AutoLogIn').checked); localStorage.setItem('AutoRelogin', document.getElementById('AutoLogIn').checked); }},
];

window.onload = function() {

    document.getElementById('AutoLogIn').checked = localStorage.getItem('AutoRelogin');

    //Assign Callbacks
    for (var i = 0; i < CallbackTable.length; i++)
        document.getElementById(CallbackTable[i].element).addEventListener(CallbackTable[i].event, CallbackTable[i].callback);

    //Check, if user has AutoLogin
    if(localStorage.getItem('AutoRelogin') && !localStorage.getItem('AutoReloginOverride')) {
        RefreshToken().then(

            //If succeeded, log in
            (res) => {
                window.location = "user.html";
            }
        );
    }

    localStorage.setItem('AutoReloginOverride', false);
}




