

function LogIn() {

	var email       = document.getElementById('LogEmail').value;
	var password    = document.getElementById('LogPassword').value;

	//Login success / fail methods
	var LoginFail = function(msg) {
		document.getElementById('LogStatus').textContent = msg;	
		document.getElementById('LogStatus').style = "color: red;";	
	}

	var LoginSuccess = function(msg) {
		
		document.getElementById('LogStatus').textContent = msg;	
		document.getElementById('LogStatus').style = "";	

		window.location = "user.html";
	}



	//Send request to server
	fetch('/api/login', {
		method: 'POST',
		body: JSON.stringify({
			email: email,
			password: password
		}),
		headers: {
			"Content-Type": "application/json"
		}
	}).then(function(res){

		if(res.status != 200) { 
			return res.json().then(function(body) {
				LoginFail(body.message);
			});
		}

		res.json().then(function(body){
			localStorage.setItem('UserToken', JSON.stringify({
				refresh: body.refreshToken,
				access: body.accessToken
			}));        

			sessionStorage.setItem('User', JSON.stringify({
				id: body.ID,
				name: body.name,
				email: body.email
			}));

			sessionStorage.setItem('Groups', JSON.stringify(body.groups));


			LoginSuccess("Logged In Successfully!");
		});
	});

}

function Register() {
	
	var email       = document.getElementById('RegEmail').value;
	var password    = document.getElementById('RegPassword').value;
	var name        = document.getElementById('RegFullName').value;

	//Registration success / fail methods
	var RegFail = function(msg) {
		document.getElementById('RegStatus').textContent = msg;	
		document.getElementById('RegStatus').style = "color: red;";	
	}

	var RegSuccess = function(msg) {
		document.getElementById('RegStatus').textContent = msg;	
		document.getElementById('RegStatus').style = "";
	}



	//Send request to server
	fetch('/api/register', {
		method: 'POST',
		body: JSON.stringify({
			email: email,	
			name: name,
			password: password
		}),
		headers: {
			"Content-Type": "application/json"
		}
	}).then(function(res){

		if(res.status != 200) {
			return res.json().then(function(body) {
				RegFail(body.message);
			});
		} 
		
		res.json().then(function(body){
				  
			RegSuccess("Registered Successfuly!");
			document.getElementById('LogEmail').value = email;
			document.getElementById('LogPassword').value = password;
			LogIn();
		});
	});
}

function RefreshToken() {
	return new Promise((resolve, reject) => {
		//If no token found, exit
		if(localStorage.getItem('UserToken') == undefined) reject();

		//Retrive the object
		var token = JSON.parse(localStorage.getItem('UserToken'));

		//Send request to server
		fetch('/api/refreshToken', {
			method: 'POST',
			body: JSON.stringify({
				accessToken	: token.access,	
				refreshToken: token.refresh
			}),
			headers: {
				"Content-Type": "application/json"
			}
		}).then(function(res){

			if(res.status != 200) {
				//Target: index.html
				//Whipe session & local storages
				res.json().then(function(body){ console.log(body)});
				sessionStorage.clear();
				localStorage.removeItem('UserToken');

				//If failed, do not auto log in
				localStorage.getItem('AutoReloginOverride', true);

				location = "index.html";
			} 

			res.json().then(function(body){

				localStorage.setItem('UserToken', JSON.stringify({
					refresh: body.refreshToken,
					access: body.accessToken
				}));        

				sessionStorage.setItem('User', JSON.stringify({
					id: body.ID,
					name: body.name,
					email: body.email
				}));

				sessionStorage.setItem('Groups', JSON.stringify(body.groups));
				resolve();
			});
		});
	});
}