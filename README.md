#Tesla Model S REST API

An implementation in Node.js of the client side interface to the Tesla Model S API documented at: 

	http://docs.timdorr.apiary.io/

This is unofficial documentation of the Tesla Model S REST API used by the iOS and Android apps. It features functionality to monitor and control the Model S remotely. Documentation is provided on the Apiary.io site linked above.

These programs and documentation do not come from the Tesla Motor Company.

Be careful when using these programs as they can lock and unlock your car as well as control various functions relating to the charging system, sun_roof, lights, horn, and other subsystems of the car.

Be careful not to send your login and password to anyone other than Tesla or you are giving away the authentication details required to control your car.

Use these programs at your own risk. The author (Hans Jespersen) does not guaranteed the proper functioning of these applications in any way including any damage that might result as a result of using this code. Use of these functions can change the settings on your car and may have negative consequences such as (but not limited to) unlocking the doors, opening the sun_roof, and reducing the charge in the battery.

#teslams.js 

Contains a library of functions and constants which allow the uses the TESLA "REST" API to get and set values on the Tesla Model S. 

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
