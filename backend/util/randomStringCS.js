const crypto = require("crypto");

module.exports = function randomStringCS(length, charset){
	const randoms = crypto.randomBytes(length * 4);

	let string = "";

	for (let i = 0; i < length; i++){
		string += charset.charAt(randoms.readUInt32LE(i) / 4294967295 * charset.length);
	}

	return string;
}