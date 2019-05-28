var http = require("http");

http.createServer(function(request, response) {
    response.writeHead(200, { "Content-Type": "text/plain" });
    var date = new Date();
    var current_hour = date.getSeconds();
    response.write(current_hour.toString());
    response.end();
}).listen(8080);