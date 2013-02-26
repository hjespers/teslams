#Tesla Model S REST API

An implementation in Node.js of the client side interface to the Tesla Model S API documented at: 

	http://docs.timdorr.apiary.io/

This is unofficial documentation of the Tesla Model S REST API used by the iOS and Android apps. It features functionality to monitor and control the Model S remotely. Documentation is provided on the Apiary.io site linked above.

These programs and documentation do not come from Tesla Motors Inc.

Be careful when using these programs as they can lock and unlock your car as well as control various functions relating to the charging system, sun_roof, lights, horn, and other subsystems of the car.

Be careful not to send your login and password to anyone other than Tesla or you are giving away the authentication details required to control your car.

#Disclaimer

Use these programs at your own risk. The author (Hans Jespersen) does not guaranteed the proper functioning of these applications. This code attempts to use the same interfaces used by the official Tesla phone apps. However, it is possible that use of this code may cause unexpected damage for which nobody but you are responsible. Use of these functions can change the settings on your car and may have negative consequences such as (but not limited to) unlocking the doors, opening the sun roof, or reducing the available charge in the battery.

#teslams.js 

Contains a library of functions and constants which allow the uses the TESLA "REST" API to get and set values on the Tesla Model S. 

Functions include:

	mobile_enabled( vid )  - check is remote/mobile control is on or off
	get_charge_state( vid ) - get the full set of charge state information
	get_climate_state( vid ) - get the full set of climate state information 
	get_drive_state( vid )  - get the full set of drive state information
	get_vehicle_state( vid ) - get the full set of vehicle state information 
	get_gui_settings( vid ) - get the GUI setting
	wake_up( vid ) - wake up the communication with the car (if dormant). Triggers new tokens needed for streaming API
	open_charge_port( vid ) - open the charge port door 
	charge_state( vid, state ) - set the charging state 
	charge_range( vid, range ) - set the range mode 
	flash( vid ) - flash the headlights 
	honk( vid ) - honk the horn 
	door_lock( vid, state ) - lock/unlock the doors 
	set_temperature( vid, dtemp, ptemp )  - set the climate control temperatures
	auto_conditioning( vid, state ) - turn on/off the climate control (HVAC) system
	sun_roof( vid, state ) - control the sun roof 

Constants include:

	CHARGE_OFF - turns the charger off
	CHARGE_ON - turns the charger on
	RANGE_STD - set the charge mode to standard range
	RANGE_MAX - set the charge mode to maximum range
	LOCK_OFF - turns the door locks off (unlock)
	LOCK_ON - turns the door locks on (locked)
	TEMP_HI - highest temperature setting on climate control
	TEMP_LO - lowest temperature setting on climate control
	CLIMATE_OFF - turns climate control off
	CLIMATE_ON - turns climate control on
	ROOF_CLOSE - closes the roof
	ROOF_VENT - puts the roof in vent position
	ROOF_COMFORT - puts the roof in the 80% open position (for reduced noice)
	ROOF_OPEN - puts the roof in the 100% open position

#main.js

A sample application which uses the teslams.js library to call common functions provided in the REST API.
A valid teslamotors.com login and password is required and must be inserted into the config.json configuration file.

The main.js application requires the 'request' node module. Run "npm install request" once before running the applications.

	npm install request

To execute run: 

	node main

#teslacmd.js

A sample command line application which uses the teslams.js library and takes command line arguments that allow all know REST API functions to be used.

To work this program requires the node modules "optimist" in addition to "request" which is required by all applications
	
	npm install request
	npm install optimist

To execute run:

	teslacmd.js -u <username> -p <password>

For help run :

	$ teslacmd.js --help
	Usage: teslacmd.js -u username -p password -cdFgHimPtvw -A [on|off] -C [start|stop] 
	                   -R [std|max] -S [close|vent|comfort|open] -L [lock|unlock] -T temp

	Options:
	  -u, --username  Teslamotors.com login                                        [required]
	  -p, --password  Teslamotors.com password                                     [required]
	  -c              Display the charge state                                     [boolean]
	  -d, --drive     Display the drive state                                      [boolean]
	  -F, --flash     Flash the car headlights                                     [boolean]
	  -g, --gui       Display the GUI settings                                     [boolean]
	  -H, --honk      Honk the car horn                                            [boolean]
	  -m, --mobile    Display the mobile state                                     [boolean]
	  -P, --port      Open charge port door                                        [boolean]
	  -t              Display the climate/temp state                               [boolean]
	  -v              Display the vehicle state                                    [boolean]
	  -i, --id        Print vehicle identification "--no-i" for silent mode        [boolean]  [default: true]
	  -w, --wake      Wake up the car telemetry                                    [boolean]
	  -R, --range     Charging range mode: "std" or "max"                        
	  -S, --roof      Move the car sunroof to: "close", "vent", "comfort", "open"
	  -T, --temp      Set the car climate control temperature (in Celcius)       
	  -L, --lock      Lock/Unlock the car doors                                  
	  -A, --climate   Turn the air conditioning and heating on/off               
	  -C, --charge    Turn the charging on/off                                   
	  -?, --help      Print usage information                                    
	
	Missing required arguments: u, p
	
#stream.js 

A sample application which uses the TESLA HTTP Long Polling "STREAMING" API to get continuous telemetry from the Tesla Model S. 
A valid teslamotors.com login and password is required and must be configured in the config.json file. 
By default the output goes to a file called "stream_output.txt" which can also be changed in the config.json file. Each time you run the program you will over-write the output file so copy old log data before running the application a second time.


To execute run:

	node stream
	
#Streaming API Security Tokens

Tokens always expire at one of 4 times, corresponding to the top of the hour (:00), or in 15 minutes increments thereafter (:15, :30, :45). New tokens are generated at these 15 minute intervals. 

- every HTTP Long Poll will timeout in ~2 minutes (121.5 seconds give or take a few milliseconds)
- if you get a token it will be good for somewhere between 15-30 minutes depending on what time of day it was when you started
- if you check every 15 minutes for a new token then you should see your old one listed as the the second in the token list and you can switch the first token in the list for another 15 minutes.
- if you ever get undefined tokens, or get an HTTP 401: Unauthorized return code, then call REST API /wake_up, followed by /vehicles, and the last two active tokens will be once again revealed


#Requirements

All sample applications requires the 'request' node module. Run "npm install request" once before running the applications.

	npm install request

The main.js and stream.js application require that you edit the credentials in the file "config.json" before running the programs or authentication will fail.

	{
	"username": "yourMyTeslaLogin@email.com",
	"password": "yourPassword",
	}

#Support

For more information, feedback, or community support see the Tesla Motors Club forum at http://www.teslamotorsclub.com/showthread.php/13410-Model-S-REST-API

