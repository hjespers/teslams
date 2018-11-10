# Tesla REST API


An implementation in Node.js of the client side interface to the Tesla API documented at:

http://docs.timdorr.apiary.io/

This is unofficial documentation of the Tesla REST API used by the iOS and Android apps. It features functionality to monitor and control the remotely. Documentation is provided on the Apiary.io site linked above.

These programs and documentation do not come from Tesla Motors Inc.

Be careful when using these programs as they can lock and unlock your car as well as control various functions relating to the charging system, sun roof, lights, horn, and other subsystems of the car.

Be careful not to send your login and password to anyone other than Tesla or you are giving away the authentication details required to control your car.

Also ensure that you don't overwhelm the Tesla servers with requests. Calling REST APIs at very high frequency can put substantial load on the Tesla servers and might get your IP blocked by Tesla.

# Disclaimer

Use these programs at your own risk. The authors do not guaranteed the proper functioning of these applications. This code attempts to use the same interfaces used by the official Tesla phone apps. However, it is possible that use of this code may cause unexpected damage for which nobody but you are responsible. Use of these functions can change the settings on your car and may have negative consequences such as (but not limited to) unlocking the doors, opening the sun roof, or reducing the available charge in the battery.

# Contributors
Marshall Rose (https://github.com/mrose17)
Dirk Hohndel (https://github.com/dirkhh)
Arthur Blake (https://github.com/arthurblake)
Hans Jespersen (https://github.com/hjespers)
Nick Triantos
Chris Crewdson (https://github.com/ChrisCrewdson)

# Installation

To use these programs you must download and install 'node' from http://nodejs.org
. Once node is installed, use the included 'npm' utility to download and install the teslams tools and all it's dependent modules

	npm install -g teslams

or if you are not logged in as the root (administrator) use:

	sudo npm install -g teslams

Alternatively, to run from github sources, clone teslams, go to the main folder and run

	npm install

All example programs require credentials to authenticate with the Tesla API. You can specify a config.json, format specified below, with $TSLA_CONFIG_FILE. This default location for the config file is `~/.teslams/config.json` if not specified. It's highly recommended to use the token approach with a secure file location, see the next section for details.
# Authentication


   	{
		"username": "Your teslamotors.com username/email",
		"password": "Your teslamotors.com password"
	}


Alternatively, the token can be passed via --token in order to reuse a pre-existing authentication token (and avoid using login and password). A 90 day token can be generated using 'teslacmd -u username -p password --print_token' and you can store it for reuse in ~/.teslams/config.json in place of username and password in the following format:

	{
		"token": "abc123abc123abc123abc123abc123abc123abc123"
	}

Another alternative, username and password can be passed on the cli with -u and -p. Take care that no other users can access the system, as this will expose credentials in your history and process table `ps -ax`. The username and password can be passed as $TSLA_USERNAME and $TSLA_PASSWORD environment variables. These environment variable allow the execution of these apps in Heroku or other Platform-as-a-Service providers.

# teslams.js - The main library (for javascript programmers)

Contains a library of functions and constants which allow the uses the TESLA "REST" API to get and set values on the Tesla.
All functions take an optional callback that will be passed the javascript object returned from the TESLA API.

Function quick reference:

	get_vid(opt, cb)               - get the "id" of the vehicle by logging into the Tesla portal
	vehicles(opt, cb)              - login to portal and get vehicles list and options data
	all(opt, cb)                   - get array of all vehicles (if more than one, we salute you!)
	mobile_enabled(vid, cb)        - check is remote/mobile control is on or off
	get_charge_state(vid, cb)      - get the full set of charge state information
	get_climate_state(vid, cb)     - get the full set of climate state information
	get_drive_state(vid, cb)       - get the full set of drive state information
	get_vehicle_state(vid, cb)     - get the full set of vehicle state information
	get_gui_settings(vid, cb)      - get the GUI setting
	wake_up(vid, cb)               - wake up the communication with the car (if dormant)
	open_charge_port(vid, cb)      - open the charge port door
	charge_state({id, charge}, cb) - set the charging state
	charge_range({id, range, percent}, cb) - set the range mode. See RANGE constants.
	flash(vid, cb)                 - flash the headlights
	honk(vid, cb)                  - honk the horn
	door_lock({id, lock}, cb) .    - boolean toggle door locks
	set_temperature({id, dtemp, ptemp}, vb) - set the driver and passenger temp
	auto_conditioning({id, climate}, cb) - turn on/off the HVAC system. See CLIMATE constants
	sun_roof({id, roof, percent}, cb) - control the sun roof. See roof constants
	stream(opt, cb)                - low-level interface to streaming service
	set_token(token)               - set the bearer token for authenticating using a previously generated token

Constants include:

	CHARGE_OFF   - turns the charger off
	CHARGE_ON    - turns the charger on
	RANGE_STD    - set the charge mode to standard range
	RANGE_MAX    - set the charge mode to maximum range
	LOCK_OFF     - turns the door locks off (unlock)
	LOCK_ON      - turns the door locks on (locked)
	TEMP_HI      - highest temperature setting on climate control (32C/90F)
	TEMP_LO      - the lowest temperature setting on climate control (17C/63F)
	CLIMATE_OFF  - turns climate control off
	CLIMATE_ON   - turns climate control on
	ROOF_CLOSE   - closes the roof
	ROOF_VENT    - puts the roof in vent position
	ROOF_COMFORT - puts the roof in the 80% open position (for reduced noice)
	ROOF_OPEN    - puts the roof in the 100% open position

# teslacmd.js - Command Line Interface for all functions supported in the REST API

A sample command line application which uses the teslams.js library and takes command line arguments that allow all know REST API functions to be used.

To execute run:

	teslacmd -u <username> -p <password>

For help run :

	teslacmd --help

	Usage: teslacmd.js -u <username> -p <password> OR --id <id_string> --token <bearer_token>
	                   -acdDFgHimMPtvVwXZ
	                   -A [on|off] -C [start|stop] -L [lock|unlock] -O <offset>
	                   -R [std|max|50-90|100] -S [close|vent|comfort|open|0-100] -T <temp>
	Options:
	  -u, --username  Teslamotors.com login                                                       [required]
	  -p, --password  Teslamotors.com password                                                    [required]
	      --id        Vehicle id for the car you want to control                                  [required]
	      --token     Teslamotors.com Bearer token (use --print_token to get a new token)         [required]
	  -a, --all       Print info for all vehicle on the users account                             [boolean]
	  -c              Display the charge state                                                    [boolean]
	  -d, --drive     Display the drive state                                                     [boolean]
	  -D, --debug     Display debug information                                                   [boolean]
	  -F, --flash     Flash the car headlights                                                    [boolean]
	  -g, --gui       Display the GUI settings                                                    [boolean]
	  -H, --honk      Honk the car horn                                                           [boolean]
	  -i, --info      Print vehicle info                                                          [boolean]
	  -m, --mobile    Display the mobile state                                                    [boolean]
	  -M, --metric    Convert measurements in metric unit                                         [boolean]
	  -P, --port      Open charge port door                                                       [boolean]
	  -t              Display the climate/temp state                                              [boolean]
	  -v              Display the vehicle state                                                   [boolean]
	  -V, --version   Print version of teslams software                                           [boolean]
	  -w, --wake      Wake up the car telemetry                                                   [boolean]
	  -X, --isplugged Check if car is plugged in and continue only if connected to a charger      [boolean]
	  -Z, --isawake   Check if car is asleep and continue only if awake                           [boolean]
	  -A, --climate   Turn the air conditioning and heating on/off
	  -C, --charge    Turn the charging on/off
	  -L, --lock      Lock/Unlock the car doors
	  -O, --vehicle   Vehicle offset (i.e. 0 or 1) for accounts with multiple vehicles
	  -R, --range     Charging range mode: "std" or "max" or any percent from 50-90 or 100
	  -S, --roof      Move the car sunroof to: "close", "vent", "comfort", "open" or any percent
	  -T, --temp      Set the car climate control temperature (in Celcius)
	  -?, --help      Print usage information

# streaming.js - Capture and log real-time telemetry to a file or MongoDB for analytics and visualization

<img src=http://farm9.staticflickr.com/8241/8526534730_75643b3247_c.jpg>

A sample application which uses the TESLA HTTP Long Polling "STREAMING" API to get continuous telemetry from the Tesla Model S.
A valid teslamotors.com login and password is required and must be provided on the command line options.

By default the output goes to a file called "streaming.out" which can also be changed with command line options. Each time you run the program you will over-write the output file so copy old log data or specify a different output file before running the application a second time.

Data can be stored in MongoDB using the --db flag. This requires that you separately download, install, and start mongodb on your local host (see http://www.mongodb.org/downloads or https://docs.docker.com/samples/library/mongo/).

To execute run:

	streaming -u <username> -p <password>

For help run :

	streaming --help

	Usage: node ./streaming -u <username> -p <password> [--file <filename>] [--db <MongoDB database>] [--values <value_list>] [--silent]

	Options:
		  -u, --username  Teslamotors.com login                  [required]
		  -p, --password  Teslamotors.com password               [required]
		  -s, --silent    Silent mode: no output to console      [boolean]
		  -f, --file      Output file.                           [default: "streaming.out"]
		  -d, --db        MongoDB database location
		  -v, --values    List of values to collect              [default: "speed,odometer,soc,elevation,est_heading,est_lat,est_lng,power,shift_state"]
		  -?, --help      Print usage information


# visualize.js - Graphically display historical data captured using streaming.js

A sample application that uses streaming data collected in MongoDB by the streaming.js app and makes it visible in a browser. For this app to work you need to be logging the streaming data into a database (see the streaming app above for details). Visualize then takes those data and shows them as a web application. You can connect to the main page for a simple welcome screen that allows you to pick the data range and then select one of the (currently) three supported applications:

- map: visualize the path and speed of the car over a period of time. This can also do live tracking of the progress of the car. It uses Google Maps and AJAX to update the map (either in real time, or in "fast forward" mode when looking at the past).
- energy: visualize the energy used and regenerated while driving, charging (voltage and current) and SOC (state of charge) over the time period given.
- stats: visualize daily driving, charging and Wh/mile.

To execute run:

        node examples/visualize/visualize.js --db <MongoDB database>

For help run:

	node examples/visualize/visualize.js --help

        Usage: node visualize.js --db <MongoDB database> [--port <http listen port>] [--silent] [--verbose]

        Options:
	          -p, --port     Listen port for the local http server               [default: 8766]
	          -d, --db       MongoDB database name                               [required]
	          -s, --silent   Silent mode: no output to console                   [boolean]
	          -v, --verbose  Verbose mode: more output to console                [boolean]
	          -?, --help     Print usage information


Point your browser to http://localhost:8766 to view the various visualizations.

URLs are of the form http://localhost:8766/energy?from=YYYY-MM-DD-HH-MM&to=YYYY-MM-DD-HH-MM

visualize.js now supports authentication. In your ~/.teslams/config.json file simply add a section for visualize like this:

	"visualize": {
		"webusers": [
			{ "id": 1, "username": "dirk", "password": "secret" },
			{ "id": 2, "username": "bob", "password": "different" }
  		]
  	}

if you don't have a "visualize" property in your config file, authentication is off by default.



# chargebar.js - monitor your car from your desktop


<img src="https://user-images.githubusercontent.com/2879972/48303962-2d112500-e4d7-11e8-9015-fc09cd6e3f31.jpg">

This application displays the charge state of a Tesla in an ASCII terminal window.

To execute run:

	chargebar -u <username> -p <password>

For help run :

	chargebar --help

	Usage: chargebar.js -u <username> -p <password>

	Options:
	  -u, --username  Teslamotors.com login                                                             [required]
	  -p, --password  Teslamotors.com password                                                          [required]
	  -?, --help      Print usage information

	Missing required arguments: u, p


# climatemon.js - monitor the temperature of your car from your desktop

<img src="https://user-images.githubusercontent.com/2879972/48303961-2b476180-e4d7-11e8-85db-e54851764366.jpg">

This application displays and controls the climate control system of a Tesla.
Colors are white/yellow when climate control is off
Interior temperature bar is blue when cooling and red when heating

To execute run:

	climatemon -u <username> -p <password>

	CTRL-D toggles climate control on/off
	CTRL-C to exit

For help run :

	climatemon --help

	Usage: climatemon.js -u username -p password

	Options:
	  -u, --username  Teslamotors.com login     [required]
	  -p, --password  Teslamotors.com password  [required]

	Missing required arguments: u, p


# teslamap.js - dude, where's my car?

<img src="https://user-images.githubusercontent.com/2879972/48303959-28e50780-e4d7-11e8-8da1-baf84bff6bbb.jpg">

A sample application which uses the teslams.js library to determine the car location and optionally launch a browser using Google Maps.

To execute run:

	teslamap -u <username> -p <password>

For help run :

	teslamap --help

	Usage: teslamap.js -u <username> -p <password> [--json || --url || --kml] [--map]

	Options:
	  -u, --username  Teslamotors.com login                                                             [required]
	  -p, --password  Teslamotors.com password                                                          [required]
	  -j, --json      Display the drive state info                                                      [boolean]
	  -m, --map       Open a map in the default browser which displays the current location of the car  [boolean]
 	  -k, --kml       Print out the location of the car in KML format                                   [boolean]
	  -U, --url       Print a URL to google maps on the console                                         [boolean]
	  -?, --help      Print usage information

	Missing required arguments: u, p

# example.js - a hello world app that uses the "teslams" node module

A very simple sample application which uses the teslams.js library to call common functions provided in the REST API.
A valid teslamotors.com login and password is required and must be inserted into the config.json configuration file.

The example.js application requires that you edit the credentials in the file "config.json" before running the programs or authentication will fail. All other examples get the username and password from the command line options.

	{
	"username": "yourMyTeslaLogin@email.com",
	"password": "yourPassword"
	}

To execute change into the examples directory to run:

	cd ~/node_modules/teslams/examples
	node example

# Feedback and Support

For more information, feedback, or community support see the Tesla Motors Club forum at http://www.teslamotorsclub.com/showthread.php/13410-Model-S-REST-API or email teslams@googlegroups.com
