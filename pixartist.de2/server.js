var port = 8081;
var game = require('./game.js');
var auth = require('./auth.js');
var express = require('express');
var session = require('./session.js');
var bodyParser = require('body-parser');
var q = require('q');
var app = express();

//=============== setup app
app.set('trust proxy', 1) // trust first proxy 
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

var users = {};
var worlds = [new game.World(0)];
function pushUpdate(user, type, data)
{
    var s = session.get(users[user]);
    if (s)
    {
        
        if (s.updateStack[type])
            s.updateStack[type].push(data);
        else
            s.updateStack[type] = [data];
    }
}
worlds[0].events.on('blockUpdate', function (block)
{
    for (var k in block.discoveredBy)
    {
        pushUpdate(k, 'tiles', block);
    }
});


app.use(session);
var authCheck = function (req, res, callback)
{
    if (req.session)
    {
        callback(req, res);
    }
    else
        res.status(401).send("Please login");
}
app.use(function (req, res, next)
{
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

//=============== routing
app.post('/login', function (req, res)
{
    console.log("Login request");
    if (req.body.p && req.body.u)
    {
        auth.authenticate(req.body.u, req.body.p)
        .then(
            function (userData, msg)
            {
                console.log("Login successful");
                var sid = session.open(60 * 10);
                users[userData.id] = sid;
                var s = session.get(sid);
                s.updateStack = {};
                s.userData = userData;
                res.status(200).send(sid);
                
            },
            function (error)
            {
                console.log("Login error");
                res.status(400).send(error);
            });
    }
    else
    {
        res.status(400).send("Missing authentication information");
    }
});
app.post('/logout', function (req, res)
{
    console.log("Logout request");
    if (req.session)
        session.close(req.session);
    res.status(200).send();
});

app.get('/worldSelect', function (req, res)
{
    console.log("World select request");
    authCheck(req, res, function (req, res)
    {
        var w = req.query.world;
        if (w != undefined)
        {
            w = parseInt(w);
            if (w >= 0 && w < worlds.length)
            {
                if (worlds[w].created)
                {
                    res.status(200).send("World " + w + " selected");
                    req.session.world = w;
                    var kingdom = worlds[w].addPlayer(req.session.userData.id);
                    pushUpdate(req.session.userData.id, 'kingdom', kingdom);

                    
                    //push initial world data
                    setTimeout(function ()
                    {
                        //temporary world discovery
                        var tt = worlds[w].getTopTile(150, 150);
                        worlds[w].discoverGroup(req.session.userData.id, [tt.index], 200);
                        req.session.updateStack['tiles'] = worlds[w].getDiscoveredTiles(req.session.userData.id);
                    }, 0);
                    


                }
                else
                {
                    res.status(403).send("World " + w + " not ready, please try again in a few seconds");
                }
            }
            else
                res.status(400).send("World " + w + " not found");
        }
        else
        {
            res.status(400).send("No world selected");
        }
    });
});
var firstUpdate = true;
app.get('/update', function (req, res)
{
    
    authCheck(req, res, function (req, res)
    {
        res.status(200).send(req.session.updateStack);
        req.session.updateStack = {};
        if (firstUpdate)
        {
            firstUpdate = false;
            //temporary path test
            var t1 = worlds[0].getTopTile(20, 20);
            var t2 = worlds[0].getTopTile(30, 30);
            if (t1 != undefined && t2 != undefined)
            {
                worlds[0].findPath(t1.index, t2.index, function (from, to, path)
                {
                    if (path != undefined)
                    {
                        console.log("Path length: " + path.length);
                        for (var i = 0; i < path.length; i++)
                        {
                            if (!worlds[0].tiles[path[i]].setBlock(game.Content.Tiles['Birch log']))
                            {
                                console.log("Could not set block " + worlds[0].tiles[path[i]].tileLocation)
                            }
                        }
                    }
                    else
                    {
                        console.log("No path found");
                    }
                });
            }
            else
            {
                console.log("Failed to find top tile");
            }
        }
    });
});
app.get('/worldInfo', function (req, res)
{
    var w = req.session.world;
    if (w != undefined && w >= 0 && w < worlds.length)
    {
        res.status(200).send(game.settings);
    }
    else
    {
        res.status(400).send("Invalid world " + w);
    }
});
app.listen(port);
console.log("Listening on " + port);