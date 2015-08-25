var http = require('http');
var querystring = require('querystring');
var user = "pixartist";
var pw = "860319";
var host = "localhost";
var port = "8080";
//login
var postData = querystring.stringify({
    'username' : user,
    'password': pw
});
var request = http.request(
    {
        host: host, 
        port: port,
        path: '/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        }
    }, function (res)
    {
        console.log(res);
    });
request.write(postData);
request.end();
//game loop
/*
setInterval(function ()
{

}, 1000);
 * */