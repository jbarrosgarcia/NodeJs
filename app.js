// imports
const express = require('express');
const app = express();
const bodyParser = require('body-parser');


// inicializamos la conexion con firebase
// necesitamos json con las credenciales 
var admin = require('firebase-admin');
var serviceAccount = require('./dbfirebase.json');
admin.initializeApp({

    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://dam18prueba.firebaseio.com/'
});

var db = admin.database();
// Referencia a la tabla jugadores de firebase
var refj = db.ref("/jugadores");
// Referencia a la tabla puntuacion de firebase
var refScore = db.ref("/puntuacion");
// Mapa que albergará los scores
var mapScore = new Map();
// Resultado de las puntuaciones
var resultado = null;
// Puntuacion de los jugadores
var score = 0;
// Lista de jugadores
var tjugadores = [];
var clave;
var obj;

// Por cada token de jugador ponemos en el mapScore su valor
refScore.once("value",function(snapshot){
    snapshot.forEach(function (snap) {
        mapScore.set(snap.key,snap.val());
        console.log(mapScore.size);
    });
    
});

// Añadimos los jugadores al topic para enviarles las notificaciones
refj.once("value",function(snapshot){
    snapshot.forEach(function(snap){
        tjugadores.push(snap.val().token);
        admin.messaging().subscribeToTopic(snap.val().token, 'jugadores');
    });
});

//Cuando se modifica una respuesta se dispara el metodo on
refj.on("child_changed", function(snapshot) {
    //nombre del child
    console.log("key: " + snapshot.key);
   
    //valores del child
    console.log("respuesta: " + snapshot.val().respuesta);
    
    //Si la respuesta es correcta se añade +1 al score y se modifica la tabla
    // en firebase, si es falsa se escribe el score sin sumarle +1
    if(snapshot.val().respuesta=="true"){
        if(mapScore.has(snapshot.key)){
            mapScore.set(snapshot.key,mapScore.get(snapshot.key)+1);
            clave = snapshot.key;
            console.log("clave: "+clave);
            score = mapScore.get(clave);
            obj = {};
            obj[clave] = score;
            refScore.update(obj);
        }else{
           mapScore.set(snapshot.key,1);
            clave = snapshot.key;
            console.log("clave: "+clave);
            score = mapScore.get(clave);
            obj = {};
            obj[clave] = score;
            refScore.update(obj);
        }
        
    // Si acaba un jugador se especifica el tópico, y el mensaje que se va a enviar
    // como notificación a los jugadores
    }else if (snapshot.val().acabo == "true"){
        
        var topic = 'jugadores';
        var message = {
          notification: {
            title: 'Puntuacion',
            body: 'El usuario '+clave+' tiene '+score+' puntos, intenta superarlo!'
          },
          topic: topic
        };

        // Se envía el mensaje a los usuarios registrados en el tópico
        admin.messaging().send(message)
          .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
          })
          .catch((error) => {
            console.log('Error sending message:', error);
        });
    }
});


//especificamos el subdirectorio donde se encuentran las páginas estáticas
app.use(express.static(__dirname + '/html'));

//extended: false significa que parsea solo string (no archivos de imagenes por ejemplo)
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/enviar', (req, res) => {
    let token = req.body.token;
    let msg = req.body.msg;
    let pagina = '<!doctype html><html><head></head><body>';
    pagina += `<p>(${token}/${msg}) Enviado </p>`;
    pagina += '</body></html>';
    res.send(pagina);
    
    // This registration token comes from the client FCM SDKs.
    var registrationToken = token;
    
    // See documentation on defining a message payload.
   

});

app.get('/mostrar', (req, res) => {
    let pagina = '<!doctype html><html><head></head><body>';
    pagina += 'Muestro<br>';
    pagina += '<div id="resultado">' + resultado + '</div>'
    pagina += '<p>...</p>';
    pagina += '</body></html>';
    res.send(pagina);
});


var server = app.listen(8080, () => {
    console.log('Servidor web iniciado');
});