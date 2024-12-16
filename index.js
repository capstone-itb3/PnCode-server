//*Express module imports
const express = require('express');
const app = express();
const http = require('http');

//*Environmental variables
require('dotenv').config();

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
const assignedRoomModel = require('./models/assigned_rooms.model');
const teamModel = require('./models/teams.model');
const activityModel = require('./models/activities.model');

const allowedOrigins = ['https://pncode.site', process.env.FRONTEND_URL];
const originReqHeader = (header) => allowedOrigins.includes(header) ? header : allowedOrigins[0];

const { verifyStudent, verifyProfessor } = require('./utils/verifyAccess');
const consoleScript = require('./utils/consoleScript');

const path = require('path');
const cookieParser = require('cookie-parser');

const middlewareAuth = require('./middleware');
const middlewareAdmin = require('./admin/adminMiddleware');


app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    originReqHeader(req.header('Origin'))
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS,CONNECT,TRACE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Content-Type-Options, Accept, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
  );
  res.setHeader("Access-Control-Allow-Credentials", 'true');
  res.setHeader("Access-Control-Allow-Private-Network", true);
  res.setHeader("Access-Control-Max-Age", 7200);

  next();
});

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
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


app.get('/view/:room_id/:file_name', middlewareAuth, async (req, res) => {
  try {    
    const file = await fileModel.findOne({ 
      room_id: req.params.room_id, 
      name: req.params.file_name 
    });

    if (!file) {
      return res.status(404).send('File not found.');
    }

    const room = await assignedRoomModel.findOne({ room_id: req.params.room_id })
                 .select('activity_id owner_id');

    const activity = await activityModel.findOne({ activity_id: room.activity_id })
                 .select('class_id');

    const team = await teamModel.findOne({ team_id: room.owner_id })
                 .select('members');
      
    !team ? team.members = [] : null;

    if (req.user.position === 'Student' && !verifyStudent(team.members, req.user.uid)) {
      return res.status(403).send('File not found.');
    }
    if (req.user.position === 'Professor' && !await verifyProfessor(activity.class_id, req.user.uid)) {
      return res.status(403).send('File not found.');
    }
             
    const type = () => {
      if (file.type === 'html') return 'text/html';
      else if (file.type === 'js') return 'text/javascript';
      else if (file.type === 'css') return 'text/css';
    }

    res.setHeader('Access-Control-Allow-Origin', originReqHeader(req.header('Origin')));
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', type());

    return res.send(consoleScript(file.type) + file.content);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ status: false, message: 'Server error. Retrieving file failed.' });
  }
})

app.get('/view/solo/:room_id/:file_name', async (req, res) => {
  try {
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

    res.setHeader('Access-Control-Allow-Origin', originReqHeader(req.header('Origin')));
    res.setHeader('Access-Control-Allow-Methods', 'GET');    
    res.setHeader('Content-Type', type());

    return res.send(consoleScript(file.type) + file.content);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ status: false, message: 'Server error. Retrieving file failed.' });
  }
});


app.get('/view/admin/:room_id/:file_name', middlewareAdmin, async (req, res) => {
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

    res.setHeader('Access-Control-Allow-Origin', originReqHeader(req.header('Origin')));
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', type());

    return res.send(consoleScript(file.type) + file.content);
  } catch (e) {
    return res.status(500).json({ status: false, message: 'Server error. Retrieving file failed.' });
  }
})

app.get('/favicon.ico', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', originReqHeader(req.header('Origin')));
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  return res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

app.get('/api/server-date', (req, res) => res.status(200).json({ date: new Date() }));