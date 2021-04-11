const parsePositionalArgs = require(`${process.cwd()}/util/parsePositionalArgs.js`);
const parseTruthyArgs = require(`${process.cwd()}/util/parseTruthyArgs.js`);

//convenience method to merge parsePositionalArgs and parseTruthyArgs into one function
function parseArgs(args,flags,options)
{
	if(typeof options === 'undefined') options = {};
	if(typeof args === 'string') args = args.split(' '); //this causes strings to be valid which is convenient
	if(options.truthy) return parseTruthyArgs(args,flags,options);
	// Default is behavior is parsing positional flags
	return parsePositionalArgs(args,flags,options);
}

module.exports = parseArgs;