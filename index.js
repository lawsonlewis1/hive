const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static(__dirname + '/public/static'));

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/public/static/template/index.html');
});

const room = 'hive';
io.on('connection', (socket) => {
	socket.join(room);
	socket.on('move', (data) => {
		socket.to(room).emit('move', data);
	})
});


server.listen(3000, () => {
	console.log('listening on *:3000');
});
