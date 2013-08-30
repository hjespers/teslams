/*
	Try and find username and password from optimist.
	If not found, attempt to load it from ~/.teslams/config.json

	format of config.json:

	{
		"username": "teslamotors.com username/email",
		"password": "teslamotors.com password"
	}

	If there is any trouble loading or parsing that file,
	make the optimist args required as usual.
*/
exports.config = function (opt)
{
	var config,
		configFile = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'] +
			"/.teslams/config.json",
		configSuccess = false;

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
