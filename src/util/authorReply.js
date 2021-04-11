const {Message} = require(`${process.cwd()}/util/structs.js`);
const selfDeleteReply = require(`${process.cwd()}/util/selfDeleteReply.js`);

function authorReply(message, input)
{
	return new Promise(async (resolve,reject) =>
	{
		if(typeof message === "undefined") throw new TypeError(`message is undefined`);
		if(!(message instanceof Message)) throw new TypeError(`message is not Discord Message`);
		if(input === undefined) input = "an unknown error occured";
		try {
			resolve(await message.author.send(input));
		} catch(e) {
			reject(e, await selfDeleteReply(message,`It looks like I can't DM you. Do you have DMs disabled?`, 0));
		}
	});
}

module.exports = authorReply;
