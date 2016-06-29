var express = require('express'),
    app = express(),
    server = require('http').Server(app),
    io = require('socket.io')(server)
    bodyParser = require('body-parser'),
    instances = {};

setInterval(function() {
    Object.keys(instances).forEach(function(name) {
        if (Date.now() - instances[name].timestamp >= 11 * 60 * 1000) {
            delete instances[name];
            io.sockets.emit('instance_removed', name);
        }
    });
}, 60 * 1000);

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/instances/:name/logs', function(req, res) {
    instances[req.params.name] = {
        timestamp: Date.now(),
        log: req.body.log, 
        count: ( instances[req.params.name].count ? instances[req.params.name].count + 1 : 1 )
    };

    io.sockets.emit('date_updated', {
        name: req.params.name,
        log: req.body.log,
        count: instances[req.params.name].count
    });
});

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

instances['aaa'] = { log: {caller: '111', url: '/api/test', body: {name:'allen'}, query: {age:31}}, count: 132 };
instances['bbb'] = { log: {caller: '222', url: '/api/demo', body: {name:'john'}, query: {age:18,tel: 09123123123, date: Date.now()}}, count: 97 };
instances['ccc'] = { log: {caller: '333', url: '/api/hello', body: {name:'jeff'}, query: {age:27}}, count: 115 };
instances['ddd'] = { log: {caller: '444', url: '/api/world', body: {name:'daniel',tel: 09123123123, date: Date.now()}, query: {age:24}}, count: 109 };

io.on('connection', function (socket) {
    io.sockets.emit('first_connected', Object.keys(instances).map(function(name) {
        return {
            name: name, 
            log: instances[name].log, 
            count: instances[name].count
        };
    }));
});