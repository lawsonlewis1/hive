const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require("socket.io");
const io = new Server(server);
const sqlite3 = require('sqlite3');

app.use(express.static(__dirname + '/public/static'));
app.use('/interactjs', express.static(__dirname + '/node_modules/interactjs/dist/'))

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
            socket.emit('playerIn', {id: socket.id, name: row.name, boardWidth: row.width, boardHeight: row.height})
        })
    });
    db.serialize(() => {
        db.each(`SELECT id, x, y
                 FROM positions`, (err, row) => {
            if (err) {
                console.log(err)
            }
            socket.emit('move', {id: row.id, x: row.x, y: row.y})
        })
    });
    db.close();
    socket.on('playerIn', (player) => {
        let db = new sqlite3.Database('./players.db');
        db.run(`INSERT INTO players(id, name, width, height)
                VALUES (?, ?, ?,
                        ?)`, [socket.id, player['name'], player['boardWidth'], player['boardHeight']], (err) => {
            if (err) {
                console.log(err)
            }
            console.log(socket.id + ` (${player['name']}) joined`);
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
    socket.on('new_pos', (data) => {
            let db = new sqlite3.Database('./players.db');
            db.run(`INSERT INTO positions (id, x, y)
                    VALUES (?, ?, ?);`,
                [data['id'], data['x'], data['y']], (err) => {
                    if (err) {
                        console.log(err)
                    }
                    console.log(`${data['id']} x: ${data['x']} y: ${data['y']}`)
                });
            db.close();
        }
    )
    socket.on('msg', (data) => {
        let db = new sqlite3.Database('./players.db');
        db.get(`SELECT name
                FROM players
                WHERE id = ?`, [data['id']], (err, row) => {
            if (err) {
                console.log(err)
            }
            socket.to(room).emit('msg', {id: data['id'], name: row.name, msg: data['msg']})
        });
        db.close();
    })
    socket.on('disconnect', async () => {
        let db = new sqlite3.Database('./players.db');
        db.run(`DELETE
                FROM players
                WHERE id = ?;`, [socket.id], (err) => {
            if (err) {
                console.log(err)
            }
            console.log(socket.id + " left");
        });
        const sockets = await io.in(room).fetchSockets();
        if (sockets.length === 0) {
            db.run(`DELETE
                    FROM positions;`)
            db.run(`DELETE
                    FROM players;`)
        }
        db.close();
        socket.to(room).emit('playerOut', {id: socket.id})
    })
});


server.listen(3000, () => {
    console.log('listening on http://localhost:3000');
});
