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
A valid teslamotors.com login and password is required and must be inserted into the top of this program in "creds"

To execute run "node main"

#stream.js 

A sample application which uses the TESLA HTTP Long Polling "STREAMING" API to get continuous telemetry from the Tesla Model S. 
A valid teslamotors.com login and password is required and must be inserted into the top of this program in "creds"
By default the output goes to a file called "stream_output.txt". Each time you run the program you will over-write this file so copy old log data before running the application a second time.

To execute run "node stream"

#Requirements

The applications provided require the 'request' node module. Run "npm install request" once before running the applications.
Edit the credentials at the top of the programs before running or authentication will fail.

#Support

For more information, feedback, or community support see the Tesla Motors Club forum at http://www.teslamotorsclub.com/showthread.php/13410-Model-S-REST-API

