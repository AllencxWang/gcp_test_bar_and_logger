var express = require('express'),
    app = express(),
    server = require('http').Server(app),
    io = require('socket.io')(server)
    bodyParser = require('body-parser'),
    instances = {};


// https://cloud.google.com/compute/docs/shutdownscript#provide_a_shutdown_script_file
// although above link shows that there has a shutdown script which can be used as signal to clean things up
// but I didn't find out where it is, but, based on the below link's instruction:
// https://cloud.google.com/compute/docs/autoscaler/understanding-autoscaler-decisions
// if an instance idled over 10 minutes, the auto scaler will shut it down
// so we can use this property to manually remove an instance which is no longer existed
setInterval(function() {
    Object.keys(instances).forEach(function(name) {
        // the elapsed time threshold must be longer than the health-check interval of GCP settings
        if (Date.now() - instances[name].timestamp >= 15 * 1000) {
            delete instances[name];
            io.sockets.emit('instance_removed', name);
        }
    });
}, 30 * 1000);

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/instances/:name/logs', function(req, res) {
    instances[req.params.name] = {
        timestamp: Date.now(),
        log: req.body,
        count: ( req.params.name in instances ? instances[req.params.name].count + 1 : 1 )
    };

    io.sockets.emit('data_updated', {
        name: req.params.name,
        log: req.body,
        count: instances[req.params.name].count
    });

    res.status(200).end();
});

app.put('/instances/:name/health_check', function(req, res) {
    if (req.params.name in instances) {
        instances[req.params.name].timestamp = now();
    }
    res.status(200).end();
});

// we can set shutdown script to every foo server
// to tell it to issue a curl request to this route to remove itself from the active instace list
app.delete('/instances/:name', function(req, res) {
    if (instances[req.params.name]) {
        res.status(200).json(instances[req.params.name]);
        delete instances[req.params.name];
        io.sockets.emit('instance_removed', name);
    } else {
        res.status(400).end();
    }
});

app.use('*', function(req, res) {
    res.status(404).send('<html><h1>404 Not Found</h1></html>');
});


server.listen(8080, function () {
    console.log('server is running on port 8080');
});

io.on('connection', function (socket) {
    io.sockets.emit('first_connected', Object.keys(instances).map(function(name) {
        return {
            name: name, 
            log: instances[name].log, 
            count: instances[name].count
        };
    }));
});