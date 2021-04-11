const {Message, MessageEmbed} = require(`${process.cwd()}/util/structs.js`);
const delay = require(`${process.cwd()}/util/delay.js`);

function selfDeleteReply(message, input, options)
{
	return new Promise(async (resolve,reject) =>
	{
		let emb = undefined;
		if(typeof input === 'object' && options === undefined) {options = input; input = '';}
		let duration = (typeof options === 'object') ? options.duration : options; //backwards compatability, also more convenient syntax in general
		if(typeof options !== 'object') options = {};
		if(!(message instanceof Message)) throw new TypeError(`message is not Discord Message`);
		if(input === undefined) input = 'an unknown error occured';
		if(duration === undefined) duration = '15s';
		if(input instanceof MessageEmbed) {emb = input;input='';}
		if(!options.embed) options.embed = emb;
		if(input) {options.content = input; input = ''}
		if(!options.allowedMentions) options.allowedMentions = {parse: options.mentionTypes, users: options.mentionUsers, roles: options.mentionRoles};
		/*
		const messageOptions = {
			embed: options.embed,
			allowedMentions: options.allowedMentions,
			content: options.content,
			tts: options.tts,
			nonce: options.nonce,
			files: options.files,
			code: options.code,
			split: options.split,
			reply: options.replyTo
		};*/
		const replyMsg = options.sendStandard ? await message.channel.send(input, options) : await message.reply(input, options);
		if(duration == 0) return void resolve(replyMsg);
		await delay(duration);
		await replyMsg.delete();
		resolve(replyMsg);
	});
}

module.exports = selfDeleteReply;
