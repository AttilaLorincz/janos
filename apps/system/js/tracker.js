/*global config Promise */
window.tracker = {
  start: function() {
    var self = this;

    if (!config.tracker) {
      throw '[Tracker] No config.tracker set up';
    }
    if (!config.tracker.serverUrl || !config.tracker.deviceId) {
      throw '[Tracker] Config.tracker needs { serverUrl, deviceId }';
    }

    // @todo: reuse registrations
    console.log('[Tracker] Creating');
    this.register().then(function(endpoint) {
      console.log('[Tracker] Registration succeeded, listening on', endpoint);
    }).catch(function(err) {
      console.error('[Tracker] Registration failed', err);
    });
  },

  register: function() {
    var self = this;

    return new Promise(function(res, rej) {
      var rr = navigator.push.register();
      rr.onsuccess = function() {
        var endpoint = this.result;

        self.registerEndpoint(endpoint, res, rej);
      };
      rr.onerror = function() {
        console.error('[Tracker] push.register failed', rr.error);
        rej(rr.error);
      };
    });
  },

  registerEndpoint: function(endpoint, res, rej) {
    var x = new XMLHttpRequest({ mozSystem: true });
    x.onload = function() {
      if (x.status === 200) {
        res(endpoint);
      }
      else {
        rej('server response was ' + x.status + ' ' + x.responseText);
      }
    };
    x.onerror = function() {
      rej('xhr onerror ' + x.error);
    };

    console.log('[Tracker] post to', config.tracker.serverUrl + '/register', {
      name: config.tracker.deviceId,
      url: endpoint
    });

    x.open('POST', config.tracker.serverUrl + '/register');
    x.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    x.send(JSON.stringify({
      name: config.tracker.deviceId,
      url: endpoint
    }));
  }
};

navigator.mozSetMessageHandler('push', function(msg) {
  console.log('[Tracker] got push message!', msg);

  var options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 10000
  };

  function success(pos) {
    var crd = pos.coords;

    var x = new XMLHttpRequest({ mozSystem: true });
    console.log('[Tracker] sendLocation', crd);
    x.onload = function() {
      console.log('[Tracker] sent location response', x.status);
    };
    x.onerror = function() {
      console.error('[Tracker] error sending location', x.error);
    };
    x.open('POST', config.tracker.serverUrl + '/location/' + config.tracker.deviceId);
    x.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    x.send(JSON.stringify({
      lat: crd.latitude,
      lon: crd.longitude,
      accuracy: crd.accuracy
    }));
  }

  function error(err) {
    console.error('ERROR(' + err.code + '): ' + err.message);

    // send fake location
    success({
      coords: {
        latitude: 52.510387,
        longitude: 13.428635,
        accuracy: 50
      }
    });
  }

  navigator.geolocation.getCurrentPosition(success, error, options);
});
navigator.mozSetMessageHandler('push-register', function() {
  console.log('got push-register message');
  window.tracker.start();
});
