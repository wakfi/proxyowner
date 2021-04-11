function main(){
//loads in Discord.js library
const Discord = require(`discord.js`);
const clientOps = require(`${process.cwd()}/components/clientOps.json`);
const configPath = `${process.cwd()}/components/config.json`;
const {token} = require(`${process.cwd()}/components/token.json`)
const config = require(configPath);
const {prefix, ownerId, features} = config;
const client = new Discord.Client(clientOps);

const {verifyPermissions, verifyPermissionsFor} = require(`${process.cwd()}/util/verifyPermissions.js`);
const firstLetterCapital = require(`${process.cwd()}/util/firstLetterCapital.js`);
const addTimestampLogs = require(`${process.cwd()}/util/addTimestampLogs.js`);
const selfDeleteReply = require(`${process.cwd()}/util/selfDeleteReply.js`);
const authorReply = require(`${process.cwd()}/util/authorReply.js`);
const recordFile = require(`${process.cwd()}/util/recordFile.js`);
const parseArgs = require(`${process.cwd()}/util/parseArgs.js`);
const padZeros = require(`${process.cwd()}/util/padZeros.js`);

//this is the file that holds the login info, to keep it seperate from the source code for safety
client.once("ready", async () =>
{
	addTimestampLogs();
	console.log(`${client.user.username} has started, with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
	client.user.setActivity(config.activity);
});

/*
 modified from https://github.com/AnIdiotsGuide/discordjs-bot-guide/blob/master/coding-guides/raw-events.md
*/
client.on(`raw`, async packet =>
{
	// We don't want this to run on unrelated packets
    if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
	const data = packet.d;
    // Grab the channel the message is from
    const channel = await client.channels.fetch(data.channel_id);
	const messageWasCached = channel.messages.cache.has(packet.d.message_id);
    // Fetches & resolves with message if not cached or message in cache is a partial, otherwise resolves with cached message
    const message = await channel.messages.fetch(data.message_id);
	// Emojis can have identifiers of name:id format, so we have to account for that case as well
	const emoji = data.emoji.id ? `${data.emoji.id}` : data.emoji.name;
	// This gives us the reaction we need to emit the event properly, in top of the message object
	const reaction = message.reactions.cache.get(emoji) || new Discord.MessageReaction(client, packet.d, 0, message);
	if(!reaction) return;
	reaction.message = message;
	// Fetch and verify user
	const user = await message.client.users.fetch(packet.d.user_id);
	if(!user || user.bot) return;
	// Check which type of event it is to select callback
	if (packet.t === 'MESSAGE_REACTION_ADD')
	{
		// Adds the currently reacting user to the reaction's ReactionUserManager
		if(!messageWasCached) reaction._add(user);
		messageReactionAdd(reaction, user);
	} else if(packet.t === 'MESSAGE_REACTION_REMOVE') {
		// Removes the currently reacting user from the reaction's ReactionUserManager
		if(!messageWasCached) reaction._remove(user);
		messageReactionRemove(reaction, user);
	}
});

function messageReactionAdd(reaction, user)
{
	if(reaction.emoji.name === `📌`)
	{
		if(reaction.users.cache.size == 1)
		{
			if(features.reactPin)
			{
				reaction.message.pin().catch(console.error);
			}
		}
	}
}

function messageReactionRemove(reaction, user)
{
	if(reaction.emoji.name === `📌`)
	{
		if(reaction.users.cache.size === undefined || reaction.users.cache.size === 0)
		{
			if(features.reactPin)
			{
				reaction.message.unpin().catch(console.error);
			}
		}
	}
}

//this event triggers when a message is sent in a channel the bot has access to
client.on("message", async message => 
{
	const args = message.content.slice(prefix.length).trim().split(/ +/g);
	const command = args.shift().toLowerCase();

	if(message.author.bot) return;

	if(message.content.indexOf(prefix) !== 0) return;
	
	if(command === "ping")
	{
		// Calculates ping between sending a message and editing it, giving a nice round-trip latency.
		// The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
		const m = await message.channel.send("Ping?");
		return m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
	} else if(command === "uptime") {
		//responds with the current time connected to the discord server in hh:mm:ss format. If hour exceeds 99, will adjust to triple digit, etc
		let s = client.uptime;
		let ms = s % 1000;
		s = (s - ms) / 1000;
		let secs = s % 60;
		s = (s - secs) / 60;
		let mins = s % 60;
		let hrs = (s - mins) / 60;
		let p = Math.floor(Math.log10(hrs)) + 1;
		if(Math.log10(hrs) < 2) p = 2;
		return message.channel.send("I have been running for " + padZeros(hrs, p) + ':' + padZeros(mins) + ':' + padZeros(secs)).catch(err=>{});
	}

	// commands from users using prefix go below here
	let commandLUT = {
		//Emergency Kill switch, added after channel spam so that i would have a way other than ssh to stop it
		"kill": function() {
			return [
				['ADMINISTRATOR'],
				[],
				async function() {
					process.exit(1);
				}
			].reverse();
		},

		//utilizes a bulk message deltion feature available to bots, able to do up to 100 messages at once, minimum 3. Adjusted to erase command message as well
		"purge": function() {
			return [
				['MANAGE_MESSAGES'],
				['MANAGE_MESSAGES'],
				async function() {
					// This command removes messages from all users in the channel in bulk, up to 100

					// get the delete count, as an actual number.
					const deleteCount = parseInt(args[0], 10) + 1;

					// Ooooh nice, combined conditions. <3
					if(!deleteCount || deleteCount < 2 || deleteCount > 100)
						return message.reply(`Please provide a number between 2 and 99 (inclusive) for the number of messages to delete`);

					// So we get our messages, and delete them. Simple enough, right?
					const fetched = await message.channel.messages.fetch({limit: deleteCount});
					message.channel.bulkDelete(deleteCount)
					.catch(error => {console.error(e.stack); message.reply(`Couldn't delete messages because: ${error}`)});
				}
			].reverse();
		},

		"deletehook": function() {
			return [
				['MANAGE_WEBHOOKS'],
				['MANAGE_WEBHOOKS'],
				async function() {
					let hooks = await message.channel.fetchWebhooks();
					let hook = hooks.first();
					hook.delete();
					message.channel.send(`Deleted ${hook.name}`);
				}
			].reverse();
		},

		"edithook": function() {
			return [
				['MANAGE_WEBHOOKS'],
				['MANAGE_WEBHOOKS'],
				async function() {
					let hooks = await message.channel.fetchWebhooks();
					let hook = hooks.first();
					let oldName = hook.name;
					hook.edit(args.join(" "));
					message.channel.send(`Renamed ${oldName} to ${args.join(" ")}`);
				}
			].reverse();
		},

		"addrole": function() {
			return [
				[],
				['MANAGE_ROLES'],
				async function() {
					try
					{
						await message.member.roles.add(args.join(' '));
					} catch(e) {
						console.error(e.stack);
						await message.reply('an error occurred');
					}
				}
			].reverse();
		},

		"removerole": function() {
			return [
				[],
				['MANAGE_ROLES'],
				async function() {
					try
					{
						await message.member.roles.remove(args.join(' '));
					} catch(e) {
						console.error(err.stack);
						await message.reply('an error occurred');
					}
				}
			].reverse();
		},

		"createguild": function(){return [async function() {
			if(message.author.id !== ownerId) return;
			
			try 
			{
				const guild = await client.guilds.create(args.join(" "));
				const defaultChannel = await guild.channels.create("general2", {"type" : "text"});
				const invite = await defaultChannel.createInvite();
				message.author.send(invite.url);
				const role = await guild.roles.create({data:{name:'Tester', permissions:['ADMINISTRATOR']}});
				message.author.send(role.id);
			} catch (e) {
				console.error(e.stack);
				await message.reply('an error occurred');
			}
		}]},

		"createsuperadmin": function(){return [async function() {
			if(message.author.id !== ownerId) return;

			try 
			{
				const name = args.join(' ') || 'Tester';
				const guild = message.guild;
				const role = await guild.roles.create({data:{name: name, permissions: ['ADMINISTRATOR'], position: guild.roles.highest.position + 1}});
				await message.author.send(role.id);
			} catch (e) {
				console.error(e.stack);
				await message.reply('an error occurred');
			}
		}]},

		//only the specified users (the bot owner, usually) can user this, changes the status message
		"status": function(){return [async function() {
			if(message.author.id !== ownerId) return;
			
			client.user.setActivity(args.join(" "));
		}]},
		
		"presence": function(){return [async function() {
			if(message.author.id !== ownerId) return;
			
			const newActivity = parseArgs(args, {'name':'n', 'type':'t', 'url':'u'});
			if(!newActivity.name)
			{
				const type = (function(args){ //switch expression workaround
					switch(args[0].toUpperCase())
					{
						case 'PLAYING':
						case 'PLAY':
							args.shift();
							return 'PLAYING';
						case 'STREAMING':
						case 'STREAM':
							args.shift();
							return 'STREAMING';
						case 'LISTENING':
						case 'LISTEN':
							if(args[1].toUpperCase() === 'TO') 
							{
								args.shift();
							}
						case 'LISTENTO':
						case 'LISTENINGTO':
							args.shift();
							return 'LISTENING';
						case 'WATCHING':
						case 'WATCH':
							args.shift();
							return 'WATCHING';
						default:
							return 'PLAYING';
					}
				})(args);
				if(args.length == 0) return selfDeleteReply(message, `you must include activity text`, '15s');
				const activityText = args.join(' ');
				Object.defineProperty(newActivity, 'name', {value: activityText, writable: false, enumerable: true, configurable: true});
				Object.defineProperty(newActivity, 'type', {value: type, writable: false, enumerable: true, configurable: true});
			}
			const type = (function(arg){ //switch expression workaround
				switch(arg.toUpperCase())
				{
					case 'PLAYING':
					case 'PLAY':
						return 'PLAYING';
					case 'STREAMING':
					case 'STREAM':
						return 'STREAMING';
					case 'LISTENING':
					case 'LISTEN':
					case 'LISTENTO':
					case 'LISTEN TO':
					case 'LISTENINGTO':
					case 'LISTENING TO':
						return 'LISTENING';
					case 'WATCHING':
					case 'WATCH':
						return 'WATCHING';
					default:
						throw new TypeError('type must be one of: PLAYING, STREAMING, LISTENING, WATCHING');
				}
			})(newActivity.type || 'PLAYING');
			newActivity.type = type;
			if(newActivity.type !== type)
			{
				Object.defineProperty(newActivity, 'type', {value: type, writable: false, enumerable: true, configurable: true});
			}
			try {
				config.activity = newActivity;
				await message.client.user.setPresence({activity:config.activity});
				await recordFile(config, configPath).catch(e=>
				{
					console.error(`Error saving updated activity`);
					console.error(e.stack);
				});
				selfDeleteReply(message, `Activity has been changed to \`${firstLetterCapital(config.activity.type==='LISTENING'? 'LISTENING TO':config.activity.type)} ${config.activity.name}\``, 0);
			} catch(e) {
				console.error(e.stack);
				selfDeleteReply(message, `an error occurred while trying to change my activity: ${e}`, '20s');
			}
		}]},
	}

	let log = true;
	let execute = commandLUT[command] ?? function(){return [async function(){log=false}]};
	let requredPermissions, memberRequiredPermissions, commandFunc;
	try
	{
		[commandFunc, requredPermissions=[], memberRequiredPermissions=[]] = execute();
		execute = commandFunc;
		// Pre-command-execution permission checks
		if(!verifyPermissions(message, requredPermissions))
			return await selfDeleteReply(message, `I don't have Permissions to do that`);
		if(message.author.id !== ownerId && !verifyPermissionsFor(message.member, memberRequiredPermissions))
			return await authorReply(message, `Sorry, you don't have permissions to use this!`);
		
		await execute();
	} catch(e) {
		console.error(e.stack);
		return message.channel.send('Uh Oh! Something bad happened :( Please inform a developer about this issue').catch(o_O=>{});
	}
	if(log) console.log('processing ' + command + ' command');
});

client.on('error', e => console.error(e.stack));

//executes the function to log the client into discord
client.login(token);
}

main();
