//*Express module imports
const express = require('express');
const app = express();
const http = require('http');

//*MongoDB module imports
const mongoose = require('mongoose');
const cors = require('cors');
const { uri }  = require('./database');

//*Socket.io module imports
const { Server } = require('socket.io');
const server = http.createServer(app);

//*Routes
const accountRouter = require('./routes/account.routes');
const classRouter = require('./routes/class.routes');
const roomRouter = require('./routes/room.routes');
const teamRouter = require('./routes/team.routes');
const activityRouter = require('./routes/activity.routes');
const adminRouter = require('./admin/admin.routes');

//*Socket.io connection
const socketConnect = require('./socket');

//*PORT the server uses
const PORT = process.env.PORT || 5000;

const fileModel = require('./models/files.model');
const soloRoomModel = require('./models/solo_rooms.model');
const consoleScript = require('./utils/consoleScript');

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS,CONNECT,TRACE"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Content-Type-Options, Accept, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
    );
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Private-Network", true);
    //  Firefox caps this at 24 hours (86400 seconds). Chromium (starting in v76) caps at 2 hours (7200 seconds). The default value is 5 seconds.
    res.setHeader("Access-Control-Max-Age", 7200);
  
    next();
});

const io = new Server(server, {
  cors: {
      origin: "*",
      // origin: "http://localhost:5173",
      methods: ["GET", "POST"]
  }
});

//*Use io within Rest API routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(accountRouter);
app.use(classRouter);
app.use(roomRouter);
app.use(teamRouter);
app.use(activityRouter);
app.use(adminRouter);

//*Connects to the database
mongoose.connect(uri).then(() => {
    console.log('Connected to database.');
    
    server.listen(PORT, () => {
        console.log(`Server is running on port:${PORT}`);
    });
    
    socketConnect(io);                
}).catch((err) => {
    console.log('Error. Connection failed.', err);
});

app.get('/view/:room_id/:file_name', async (req, res) => {
  try {    
    const file = await fileModel.findOne({ 
      room_id: req.params.room_id, 
      name: req.params.file_name 
    });

    if (!file) {
      return res.status(404).send('File not found.');
    }

    const type = () => {
      if (file.type === 'html') return 'text/html';
      else if (file.type === 'js') return 'text/javascript';
      else if (file.type === 'css') return 'text/css';
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', type());
    
    return res.send(consoleScript(file.type) + file.content);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ status: false, message: 'Server error. Retrieving file failed.' });
  }
})
// res.header('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://code.jquery.com; script-src-elem 'self' 'unsafe-inline' https://code.jquery.com");

app.get('/view/solo/:room_id/:file_name', async (req, res) => {
  try {
    console.log(req.params.room_id);
    console.log(req.params.file_name);


    const room = await soloRoomModel.findOne({ room_id: String(req.params.room_id) })
                 .select('files owner_id')
                 .lean();
    if (!room) {
      return res.status(404).send('Room not found.');
    };

    const files = room.files;
    const file = files.find(f => f.name === req.params.file_name);

    if (!file) {
      return res.status(404).send('File not found.');
    }

    const type = () => {
      if (file.type === 'html') return 'text/html';
      else if (file.type === 'js') return 'text/javascript';
      else if (file.type === 'css') return 'text/css';
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', type());

    return res.send(file.content);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ status: false, message: 'Server error. Retrieving file failed.' });
  }
});

app.get('/loaderio-70ec60b7dea504301b50ba59b116a4e8/', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  return res.send('loaderio-70ec60b7dea504301b50ba59b116a4e8');
});

app.get('/api/server-date', (req, res) => res.status(200).json({ date: new Date() }));