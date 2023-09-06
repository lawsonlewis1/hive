const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static(__dirname + '/static'));

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/static/template/index.html');
});

io.on('connection', (socket) => {
	socket.on('disconnect', () => {
	})
	socket.on('move', (data) => {
		socket.broadcast.emit('move', data);
	})
});

server.listen(3000, () => {
	console.log('listening on *:3000');
});
