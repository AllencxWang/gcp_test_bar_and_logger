(function(document, io, ko) {

var vm = {},
    socket = io.connect('http://104.199.138.139:8080');

vm.caller = ko.observable('john doe');
vm.rates = ko.observableArray(['Low', 'Mid', 'High']);
vm.rate = ko.observable();
vm.interval = ko.pureComputed(function() {
    switch(vm.rate()) {
        case 'Low':
            return 200;
        case 'Mid':
            return 50;
        case 'High':
            return 20;
    }
});
vm.rps = ko.pureComputed(function() {
    return 1000 / vm.interval();
});

vm.started = ko.observable(false);
vm.canStart = ko.pureComputed(function() {
    return vm.caller().length && !vm.started();
});

vm.instances = ko.observableArray([]);
vm.loadBalancer = 'http://130.211.9.177';

vm.start = function() {
    vm.started(true);
    vm.timer = setInterval(function() {
        var xhr = new XMLHttpRequest(),
            now = Date.now();
        xhr.timeout = 3000;
        if (now % 2) {
            xhr.open('POST', vm.loadBalancer);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({
                now: new Date(now),
                caller: vm.caller()
            }));
        } else {
            xhr.open('GET', vm.loadBalancer+'?timestamp='+now+'&caller='+vm.caller());
            xhr.send();
        }
    }, vm.interval());
};

vm.stop = function() {
    clearInterval(vm.timer);
    vm.started(false);
}

socket.on('first_connected', function(data) {
    var newData = data.map(function(instance) {
        return ko.observable(instance);
    });
    vm.instances(newData);
});

socket.on('data_updated', function(data) {
    var found = false;
    for(var i = 0; i < vm.instances().length; ++i) {
        if (vm.instances()[i]().name === data.name) {
            vm.instances()[i](data);
            found = true;
            break;
        }
    }
    // if the instance is not in the instances list then add it 
    if(!found) {
        vm.instances.push(ko.observable(data));
    }
});

socket.on('instance_removed', function(data) {
    var newData = vm.instances().filter(function(instance) {
        return instance().name !== data;
    });
    vm.instances(newData);
});

ko.applyBindings(vm);

}(document, io, ko));

