#to start run 'foreman start -f Procfile.visualize'
#this example is for a local mongodb instance 
mongod: mongod
#streaming.js will work with a remote instance of mongo if either $MONGOLABS_URI or $MONGOHQ_URI environment variables are set 
streaming: sleep 10; node examples/streaming.js --db tesla --zzz 
#visualize.js will work with a remote instance of mongo if either $MONGOLABS_URI or $MONGOHQ_URI environment variables are set 
#visualize.js will use the $PORT environment variable as an HTTP Listen port, if set. Foreman defaults to PORT=5000
web: node examples/visualize/visualize.js --db tesla
