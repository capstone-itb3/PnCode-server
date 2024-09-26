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

//*Websocket module imports
const WebSocket = require('ws');

//*Utilities
const { v4: uuid } = require('uuid');
const jwt = require('jsonwebtoken');
//const multer = require('multer');

//*Models
const studentModel = require('./models/students.model');
const professorModel = require('./models/professors.model');
const courseModel = require('./models/courses.model');
const sectionModel = require('./models/sections.model');
const soloRoomModel = require('./models/solo_rooms.model');
const assignedRoomModel = require('./models/assigned_rooms.model');
const teamModel = require('./models/teams.model');
const activityModel = require('./models/activities.model');

//*Routes
const accountRouter = require('./routes/account.routes');
const roomRouter = require('./routes/room.routes');
const teamRouter = require('./routes/team.routes');
const activityRouter = require('./routes/activity.routes');

//*Socket.io connection
const socketConnect = require('./socket');

//*Authentication middleware
const middlewareAuth = require('./middleware');

//*PORT the server will use
const PORT = process.env.PORT || 5000;

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
app.use(roomRouter);
app.use(teamRouter);
app.use(activityRouter);




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