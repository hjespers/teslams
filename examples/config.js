/*
	Try and find username and password from optimist.
	If not found, attempt to load it from ~/.teslams/config.json

	format of config.json:

	{
		"username": "teslamotors.com username/email",
		"password": "teslamotors.com password",
		"visualize": {
			"baseUrl": "/teslavis",
			"webusers": [
				{ "id": 1, "username": "dirk", "password": "secret" },
				{ "id": 2, "username": "bob", "password": "different" }
			]
		}
	}

	If there is any trouble loading or parsing that file,
	make the optimist args required as usual.

	This now also contains the web user/password database and path for visualize.js.
	Please note that here all the properties need to be in quotes as we are parsing
	this file as JSON - so don't just copy the array as it was in visualize.js before
	(where id, username and password were NOT quoted).
*/
exports.config = function (opt)
{
	var config,
		configFile = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'] +
				"/.teslams/config.json",
		configSuccess = false;

	if (opt.argv['$0'].indexOf("visualize.js") != -1)
	{
		// we are calling from visualize.js, so let's get the user/password pairs for that
		try
		{
			config = JSON.parse(require('fs').readFileSync(configFile).toString());
			configSuccess = config.hasOwnProperty('visualize');
		}
		catch (err)
		{
			console.warn("Unable to load " + configFile + "; web server authentication turned off");
		}
		if (configSuccess)
		{
			console.log("found " + config.visualize.webusers.length + " user / password entries; enabling web authentication");
		}
		else
		{
			console.log("didn't find 'visualize' property in config file, web authentication turned off");
		}
		return config;
	}
	// if no user name & password supplied on cmd line options, check environment variable
	if (!opt.argv.username && !opt.argv.password){
		config = {
			username: process.env.TSLA_USERNAME,
			password: process.env.TSLA_PASSWORD 
		};
		if (config.username != undefined && config.password != undefined){
			console.log('Teslamotors.com logon information loaded from environment variables $TSLA_USERNAME and $TSLA_PASSWORD');
			return config;
		}
	}

	// if no user name & password supplied on cmd line options, look in config file
	if (!opt.argv.username && !opt.argv.password)
	{
		try
		{
			config = JSON.parse(require('fs').readFileSync(configFile).toString());
			configSuccess = config.hasOwnProperty('username') && config.hasOwnProperty('password');
		}
		catch (err)
		{
			console.warn("Unable to load " + configFile + "; username & password are required arguments");
		}
	}
	if (configSuccess)
	{
		console.log('Teslamotors.com logon information loaded from ' + configFile);
	}
	else
	{
		// fall back to making them optimist required options
		opt.demand('u');
		opt.demand('p');
		config =
		{
			username: opt.argv.username,
			password: opt.argv.password
		};
	}
	return config;
};
