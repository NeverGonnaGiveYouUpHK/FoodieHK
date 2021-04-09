const crypto = require("crypto");

module.exports.hash = function hash(password){
	return new Promise((resolve, reject) => {
		const salt = crypto.randomBytes(16);

		crypto.scrypt(password, salt, 64, (err, derivedKey) => {
			if (err) return reject(err);

			resolve({
				salt: salt,
				hash: derivedKey
			});
		});
	});
}

module.exports.verify = function verify(password, salt, hash){
	return new Promise((resolve, reject) => {
		crypto.scrypt(password, salt, 64, (err, derivedKey) => {
			if (err) return reject(err);

			try {
				const match = crypto.timingSafeEqual(derivedKey, hash);
				resolve(match);
			} catch (error){
				reject(error);
			}
		});
	});
}