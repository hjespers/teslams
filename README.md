Tesla Model S REST API
====================

An implementation is Node.js of the interface documented at:

http://docs.timdorr.apiary.io/

This is unofficial documentation of the Tesla Model S REST API used by the iOS and Android apps. It features functionality to monitor and control the Model S remotely. Documentation is provided on the Apiary.io site linked above.

Manifest
========
tesla.js  - uses the TESLA "REST" API to get and set values on the Tesla Model S. A valid teslamotors.com login and password is required and must be inserted into the top of this program in "creds"

stream.js  - uses the TESLA "STREAMING" API to get a continuous stream of telemetry from the Tesla Model S. A valid login/password is also needed in "creds". Output goes to a file called stream_output.txt. Each time you run the program you will over-write this file.
