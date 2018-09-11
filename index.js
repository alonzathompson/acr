const express = require('express');
const socket = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const hb = require('express-handlebars');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/cardTest',{
    useNewUrlParser: true
  }, function(err){
    if (err) {
      console.log(err)
      return
    }
    console.log('DB CONNECTED: ');
  });  
mongoose.set('useCreateIndex', true);

const port = process.env.Port || 3000;
const app = express();

app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', hb({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const server = app.listen(port, () => {
    console.log("App listening on port 3000")
});

const io = socket(server); 
const acrLogic = require('./src/acrlogic');
const a = acrLogic(io);

app.get("/", (req,res) => {
     /*a.readDataBlocks().then((res) => {
         console.log(res);
     });*/

    res.render('home', {
        title: "RFID login tracker",
        device: a.data.device,
        type: a.data.type,
        UID: a.data.UID,
        rawData: a.data.rawArr
    });
});

app.post('/', (req,res) => {
    let bN = req.body.blockNumber;
    let bD = req.body.blockData;

    console.log(bN, bD);

    if(bN !== null || bN !== undefined || bN !== "" && bD !== null || bD !== undefined || bD !== ""){
        a.writeDataBlocks(bN, bD);
    }

    res.json({
       write: "successful",
       blockNumber: bN,
       blockData: bD
    });
});

io.on('connection', (socket) => {
    console.log('we have a connection', socket.id);

    socket.on('readAscii', function(data) {
        console.log(data);
        socket.emit('readAscii', a.data.asciiStrings);
    });

    socket.on('disconnect', function(){
        console.log('user disconnected');
      });

    socket.on('tryingRec', function(data){
        console.log(data);
    });

    socket.on('writeData', function(data){
        console.log(data);
        a.writeUser(data.email, data.pass);
    })

    
})
