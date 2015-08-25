
var game = require('./game.js');
var auth = require('./auth.js');
var express = require('express');
var cookieSession = require('cookie-session')
var q = require('q');
var app = express();
app.set('trust proxy', 1) // trust first proxy 

app.use(cookieSession({
    name: 'session',
    secret: '31"!!aßs2'
}));

var authCheck = function (req, res, callback)
{
    if (req.session.loggedIn)
    {
        callback(req, res);
    }
    else
        res.status(401).send("Please login");
}

app.get('/login', function (req, res)
{
    if (req.query.p && req.query.u)
    {
        auth.authenticate(req.query.u, req.query.p)
        .then(function (msg)
        {
            req.session.loggedIn = true;
            res.status(200).send();
            
        },function (error)
        {
            res.status(400).send(error);
        });
    }
    else
    {
        res.status(400).send("Missing authentication information");
    }
});
app.get('/logout', function (req, res)
{
    req.session.loggedIn = false;
    res.status(200).send();
});

app.get('/worldSelect', function (req, res)
{
    authCheck(req, res, function (req, res)
    {
        res.status(200).send("Data");
    });
});
app.listen(8080)