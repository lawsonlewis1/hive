const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require("socket.io");
const io = new Server(server);
const sqlite3 = require('sqlite3');

app.use(express.static(__dirname + '/public/static'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/static/template/index.html');
});

const room = 'hive';
io.on('connection', async (socket) => {
    socket.join(room);
    let db = new sqlite3.Database('./players.db');
    db.serialize(() => {
        db.each(`SELECT name
                 from players`, (err, row) => {
            if (err) {
                console.log(err)
            }
            socket.emit('playerIn', {id: socket.id, name: row.name})
        })
    });
    db.close();
    socket.on('playerIn', (player) => {
        let db = new sqlite3.Database('./players.db');
        db.run(`INSERT INTO players(id, name)
                VALUES (?, ?)`, [socket.id, player['name']], (err) => {
            if (err) {
                console.log(err)
            }
            console.log(socket.id + " added");
        });
        db.close();
        socket.to(room).emit('playerIn', player);
    })
    socket.on('move', (data) => {
        socket.to(room).emit('move', data);
    })
    socket.on('stack', (data) => {
        socket.to(room).emit('stack', data);
    })
    socket.on('disconnect', () => {
        let db = new sqlite3.Database('./players.db');
        db.run(`DELETE
                FROM players
                WHERE id = ?;`, [socket.id], (err) => {
            if (err) {
                console.log(err)
            }
            console.log(socket.id + " removed");
        });
        db.close();
        socket.to(room).emit('playerOut', {id: socket.id})
    })
});


server.listen(3000, () => {
    console.log('listening on http://localhost:3000');
});
