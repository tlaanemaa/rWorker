const net = require('net');
const handleSocket = require('./socket_handler');

// A queue for startup events while server is not yet ready
const startUpQueue = [];

// Check if ip is localhost
function isValidIP(address) {
  return (
    address === '127.0.0.1' ||
    address === '::ffff:127.0.0.1'
  );
}

// Create local socket server for communication between R and Node.js
const server = net.createServer((socket) => {
  // Kill all connections that are not from localhost
  if (!isValidIP(socket.remoteAddress)) {
    socket.destroy();
  }

  // Pass socket over to socket handler
  handleSocket(socket);
});

// Clear statup queue after we get ready
server.on('listening', () => {
  for (let i = 0, n = startUpQueue.length; i < n; i += 1) {
    startUpQueue[i]();
  }
});

// Start the local socket server
module.exports.listen = port => server.listen(port);

// Check if server is listening
module.exports.whenReady = callback => (
  server.listening ? callback() : startUpQueue.push(callback)
);
