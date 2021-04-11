const {Permissions} = require(`${process.cwd()}/util/structs.js`);

exports.verifyPermissionsFor = function(member, permissions = []) {
	// member is assumed to be Discord.GuildMember
	if(!member.guild) return false;
	return permissions.map(perm => Permissions.FLAGS[perm]).reduce(((hasPerms, perm) => hasPerms && member.hasPermission(perm)), true);
};
exports.verifyPermissions = function(source, permissions = []) {
	// source is assumed to be Discord.Message, Discord.Guild, or Discord.GuildMember
	source = source.guild?.me ?? source.me ?? source;
	return exports.verifyPermissionsFor(source, permissions);
};
exports.channelPermissions = function(source, member) {
	// member is assumed to be Discord.GuildMember or undefined
	if(member === undefined) member = source.guild.me;
	// source is assumed to be Discord.ChannelResolvable or Discord.Message
	source = source.channel ?? source;
	// returns a read-only Discord.Permissions
	if(!source.isText) return false;
	return member.permissionsIn(source);
};
