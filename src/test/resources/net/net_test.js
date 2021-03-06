/*
 * Copyright 2011-2012 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var vertx = require('vertx');
var vertxTest = require('vertx_tests');
var vassert = vertxTest.vassert;

// for testing NetSocket.sendFile
var fs = require('vertx/file_system');
var tu = require('test_utils');

var netTest = {
  testConnect: function() {
    var server = vertx.net.createNetServer();

    server.connectHandler(function(sock) {
      vassert.assertTrue(sock.localAddress().ipaddress !== null);
      vassert.assertTrue(sock.localAddress().port > -1);
      vassert.assertTrue(sock.remoteAddress().ipaddress !== null);
      vassert.assertTrue(sock.remoteAddress().port > -1);
      sock.dataHandler(function(data) {
        sock.write(data);
      });
    });

    server.listen(1234, 'localhost', function(err, server) {
      vassert.assertTrue(err === null);

      var client = vertx.net.createNetClient();
      client.connect(1234, 'localhost', function(err, sock) {
        vassert.assertTrue(err === null);
        vassert.assertTrue(sock !== null);
        vassert.assertTrue(sock.localAddress().ipaddress !== null);
        vassert.assertTrue(sock.localAddress().port > -1);
        vassert.assertTrue(sock.remoteAddress().ipaddress !== null);
        vassert.assertTrue(sock.remoteAddress().port > -1);

        sock.dataHandler(function(data) {
          vassert.testComplete();
        });

        sock.write( new vertx.Buffer('this is a buffer'));
      });
    });
  },

  testNoConnect: function() {
    var client = vertx.net.createNetClient();
    client.connectTimeout(500);
    client.connect(1234, '127.0.0.2', function(err, sock) {
      vassert.assertTrue(err !== null);
      vassert.testComplete();
    });
  },

  testNetSocketSSL: function() {
    var server = vertx.net.createNetServer();
    server.keyStorePath('./src/test/keystores/server-keystore.jks');
    server.keyStorePassword('wibble');
    server.trustStorePath('./src/test/keystores/server-truststore.jks');
    server.trustStorePassword('wibble');

    server.connectHandler(function(sock) {
      sock.ssl();
      sock.dataHandler(function(data) {
        vassert.assertTrue(sock.isSSL());
        sock.write(data);
      });
    });

    server.listen(4043, 'localhost', function(err, server) {
      vassert.assertTrue(err === null);

      var client = vertx.net.createNetClient();
      client.ssl(true);
      client.trustAll(true);
      client.keyStorePath('./src/test/keystores/client-keystore.jks');
      client.keyStorePassword('wibble');
      client.trustStorePath('./src/test/keystores/client-truststore.jks');
      client.trustStorePassword('wibble');
      client.connect(4043, 'localhost', function(err, sock) {
        vassert.assertTrue("Should not have received an error: " + err, err === null);
        vassert.assertTrue(sock !== null);
        vassert.assertTrue(sock.localAddress().ipaddress !== null);
        vassert.assertTrue(sock.localAddress().port > -1);
        vassert.assertTrue(sock.remoteAddress().ipaddress !== null);
        vassert.assertTrue(sock.remoteAddress().port > -1);

        sock.dataHandler(function(data) {
          vassert.testComplete();
        });

        sock.write( new vertx.Buffer('this is a buffer'));
      });
    });
  },

  testSendFile: function() {
    var server = vertx.net.createNetServer();
    var client = vertx.net.createNetClient();
    var content = "Some data to write to the file";
    var fileName = './test-send-file.html';
    setupFile(fileName, content);
    server.connectHandler(function(socket) {
      socket.sendFile(fileName);
    });
    server.listen(1234, 'localhost', function(err, srv) {
      vassert.assertTrue(err === null);
      client.connect(1234, 'localhost', function(err, sock) {
        vassert.assertTrue(err === null);
        vassert.assertTrue(sock !== null);
        sock.dataHandler(function(body) {
            vassert.assertTrue(tu.buffersEqual(new vertx.Buffer(content), body));
            if (fs.existsSync(fileName)) fs.deleteSync(fileName);
            vassert.testComplete();
        });
      });
    });
  },

  testSendFileWithHandler: function() {
    var server = vertx.net.createNetServer();
    var client = vertx.net.createNetClient();
    var content = "Some data to write to the file";
    var fileName = './test-send-file.html';
    setupFile(fileName, content);

    server.connectHandler(function(socket) {
      socket.sendFile(fileName, function(err) {
        vassert.assertTrue(err === null);
      });
    });

    server.listen(1234, 'localhost', function(err, srv) {
      vassert.assertTrue(err === null);
      client.connect(1234, 'localhost', function(err, socket) {
        vassert.assertTrue(err === null);
        vassert.assertTrue(socket !== null);
        socket.dataHandler(function(body) {
            vassert.assertTrue(tu.buffersEqual(new vertx.Buffer(content), body));
            if (fs.existsSync(fileName)) fs.deleteSync(fileName);
            vassert.testComplete();
        });
      });
    });
  },


};

function setupFile(fileName, content, func) {
  if (fs.existsSync(fileName)) {
    fs.deleteSync(fileName);
  }
  fs.createFileSync(fileName);
  fs.writeFileSync(fileName, content);
}

vertxTest.startTests(netTest);

