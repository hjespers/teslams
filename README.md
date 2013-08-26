#Tesla Model S REST API


                                       .,:;;rssiS522XX22225Siiisr;;:.
                                ;53A@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@M&r
                               @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
                              @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
                             B@@@@@@@@@@@@@@s;;::,.....  ..,:;;s@@@@@@@@@@@@@@@
                            i@@B@B#@@@@@@@@@.                   @@@@@@@@@@@@@@@#
                           .@@A#@#@@@@@@@@@@@      H@@@@2      @@@@@@@@@@@@@#@@@i
                      :    M@@M@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@M@@@.   :,.
                .2sr;:s:   @@MH#@#@@@@@@#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@2   s:;riXs
                 r2X39XS:   ;r.             .....        ...                  .:;  5955225i,
                        :    :i                                               .    .
                        ;:..   ;:,....,,,,,,::,::::::::,,,,,,,,,,,,,,,,......,  .,.,,
                      ...;....  ,r;,,,::::::::::::::::::::::::::::::::,,,::,. ..,..:..,.
                  .:Sr.,.,       .,......,,,,,,,,,,,,,,,,,,,,,,,,,,......,.   ....::;rr3;,
                  :,h.s:  ,;,.         .................,,,,.............  .,,,;;r   2.ir:.
                  :.r,,   :B59i;:..,.                                    ,:;rs222X   . r,:.
                  :. :..   ..;rrr:.,:.     ..,,::;;;:,::;;;:,,,.       .,,.:;;;.      ,, :,
                  r,                  i2A#BG#@@@@@@@@@@@@@@@@@@#MMGSiS;                 .;:
                  s;,,,...          2@@@@@@#@@@@@@@@A&X&H@@@@@@@@@@@@@@@r         ....,,:s;
                  Sr;;:::,,,,.... ;@@@#@@@@@@@@@@@@@@@M@@@@@@@@@@#@@@@@@@@. ..,,,,,::::;;i;
                  S;:,.,,,,::::,.;@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ .::::,,..  .:s:
                  sr@HX;;,....,:. M@@@###@@@@@@@@@@@@@@@@@@@@@@@@@@@@#@@@@9 ,,    .,;2B@&;:
                  r:@@@@@@@BhSr,   .SH#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@##B2.   :i&@@@@@@@@9;:
                  ; X@A;S@@@@@@@;             ...,,,,:::,,,,,..,,..        ,M@@@@@@@Ss@@:;,
                  :  ;#M9@@@@@@@@S  i2s;:,..                       ..:;2; :@@@@@@@@@BA5  ;,
                  Hhr. .. ..,:;r2s  r@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@   i;,         ;5M;
                  @@@@@MH&9X2isssS25iiii522X3933XX225SSiiiii55S55522255522Srrri29AM#@@@@@@,
                  H@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@.
                  r@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
                   #@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@i
                      ,,:rrsS52222X39h&AHBM###M#########MMMBBBBHAAA&G93XX225Sisr;::,,..


An implementation in Node.js of the client side interface to the Tesla Model S API documented at: 

	http://docs.timdorr.apiary.io/

This is unofficial documentation of the Tesla Model S REST API used by the iOS and Android apps. It features functionality to monitor and control the Model S remotely. Documentation is provided on the Apiary.io site linked above.

These programs and documentation do not come from Tesla Motors Inc.

Be careful when using these programs as they can lock and unlock your car as well as control various functions relating to the charging system, sun roof, lights, horn, and other subsystems of the car.

Be careful not to send your login and password to anyone other than Tesla or you are giving away the authentication details required to control your car.

#Disclaimer

Use these programs at your own risk. The authors do not guaranteed the proper functioning of these applications. This code attempts to use the same interfaces used by the official Tesla phone apps. However, it is possible that use of this code may cause unexpected damage for which nobody but you are responsible. Use of these functions can change the settings on your car and may have negative consequences such as (but not limited to) unlocking the doors, opening the sun roof, or reducing the available charge in the battery.

#Contributors
Marshall Rose (https://github.com/mrose17)
Dirk Hohndel (https://github.com/dirkhh)

#Installation

To use these programs you must download and install 'node' from http://nodejs.org
. Once node is installed, use the included 'npm' utility to download and install the teslams tools and all it's dependent modules

	npm install -g teslams
	
or if you are not logged in as the root (administrator) use:
	
	sudo npm install -g teslams

#chargebar.js - monitor your car from your desktop 


<img src="http://farm9.staticflickr.com/8236/8535066907_f22a61b061_c.jpg">

This application displays the charge state of a Tesla Model S in an ASCII terminal window. 

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


#climatemon.js - monitor the temperature of your car from your desktop 

<img src="http://farm9.staticflickr.com/8099/8573246292_3361647e14_b.jpg">

This application displays and controls the climate control system of a Tesla Model S.
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


#teslamap.js - dude, where's my car?

<img src="http://farm9.staticflickr.com/8248/8555931850_c2ae011075_z.jpg">

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


#teslacmd.js - CLI swiss army knife for the REST API 

A sample command line application which uses the teslams.js library and takes command line arguments that allow all know REST API functions to be used.

To execute run:

	teslacmd -u <username> -p <password>

For help run :

	teslacmd --help

	Usage: teslacmd.js -u <username> -p <password> -cdFgHimPtvw -A [on|off] -C [start|stop] 
	                   -R [std|max|50-100] -S [close|vent|comfort|open|0-100] -L [lock|unlock] -T <temp>

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
	  -R, --range     Charging range mode: "std", "max", or %limit (50% or more)                       
	  -S, --roof      Move the car sunroof to any position or %open
	  -T, --temp      Set the car climate control temperature (in Celcius)       
	  -L, --lock      Lock/Unlock the car doors                                  
	  -A, --climate   Turn the air conditioning and heating on/off               
	  -C, --charge    Turn the charging on/off                                   
	  -?, --help      Print usage information                                    
	
	Missing required arguments: u, p
	
#streaming.js - Capture and log real-time telemetry while driving

<img src=http://farm9.staticflickr.com/8241/8526534730_75643b3247_c.jpg>

A sample application which uses the TESLA HTTP Long Polling "STREAMING" API to get continuous telemetry from the Tesla Model S. 
A valid teslamotors.com login and password is required and must be provided on the command line options. 

By default the output goes to a file called "streaming.out" which can also be changed with command line options. Each time you run the program you will over-write the output file so copy old log data or specify a different output file before running the application a second time.

Data can be stored in MongoDB using the --db flag. This requires that you separately download, install, and start mongodb on your local host (see http://www.mongodb.org/downloads).

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

	Missing required arguments: u, p

#visualize.js - Display historical or realtime streaming data in a browser using Google Maps and provide an energy/speed graph

A sample application that uses streaming data collected in MongoDB by the streaming.js app and makes it visible in a browser. 

To execute run:

For help run:

	visualize --help

        Usage: node visualize.js --db <MongoDB database> [--port <http listen port>] [--replay <number of minutes>] [--silent] [--verbose]

        Options:
	          -p, --port     Listen port for the local http server               [default: 8766]
	          -r, --replay   number of minutes ago that the replay should start  [default: 5]
	          -d, --db       MongoDB database name                               [required]
	          -s, --silent   Silent mode: no output to console                   [boolean]
	          -v, --verbose  Verbose mode: more output to console                [boolean]
	          -?, --help     Print usage information

        Missing required arguments: d

Point your browser to http://localhost:8766 to view the various visualizations.

URLs are of the form http://localhost:8766/energy?from=YYYY-MM-DD-HH-MM&to=YYYY-MM-DD-HH-MM 


#teslams.js - The main library (for javascript programmers)

Contains a library of functions and constants which allow the uses the TESLA "REST" API to get and set values on the Tesla Model S. 
All functions take an optional callback that will be passed the javascript object returned from the TESLA API.

Functions include:

	get_vid()               - get the "id" of the Model S by logging into the Tesla portal
	vehicles()              - login to portal and get vehicles list and options data
	all()                   - get array of all vehicles (if more than one, we salute you!)
	mobile_enabled()        - check is remote/mobile control is on or off
	get_charge_state()      - get the full set of charge state information
	get_climate_state()     - get the full set of climate state information 
	get_drive_state()       - get the full set of drive state information
	get_vehicle_state()     - get the full set of vehicle state information 
	get_gui_settings()      - get the GUI setting
	wake_up()               - wake up the communication with the car (if dormant) 
	open_charge_port()      - open the charge port door 
	charge_state()          - set the charging state 
	charge_range()          - set the range mode 
	flash()                 - flash the headlights 
	honk()                  - honk the horn 
	door_lock()             - lock/unlock the doors 
	set_temperature()       - set the climate control temperatures
	auto_conditioning()     - turn on/off the climate control (HVAC) system
	sun_roof()              - control the sun roof 
	stream()                - low-level interface to streaming service

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

#example.js - a hello world app that uses the "teslams" node module 

A very simple sample application which uses the teslams.js library to call common functions provided in the REST API.
A valid teslamotors.com login and password is required and must be inserted into the config.json configuration file.

The example.js application requires that you edit the credentials in the file "config.json" before running the programs or authentication will fail. All other examples get the username and password from the command line options.

	{
	"username": "yourMyTeslaLogin@email.com",
	"password": "yourPassword",
	}

To execute change into the examples directory to run:

	cd ~/node_modules/teslams/examples
	node example


#Feedback and Support

For more information, feedback, or community support see the Tesla Motors Club forum at http://www.teslamotorsclub.com/showthread.php/13410-Model-S-REST-API or email teslams@googlegroups.com

