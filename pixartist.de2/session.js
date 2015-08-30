var uuid = require('uuid');
var sessions = {};
module.exports.duration = 10 * 60;
module.exports.autoRefresh = true;
setInterval(function ()
{
    for (var sid in sessions)
    {
        if (sessions[sid].expiration == undefined || Date.now() / 1000 > sessions[sid].expiration)
            sessions[sid] = undefined;
    }
}, 5000);
var session = function (req, res, next)
{
    if (req.body.sid != undefined)
    {
        var s = sessions[req.body.sid];
    }
    else if (req.query.sid != undefined)
    {
        var s = sessions[req.query.sid];
    }
    if (s != undefined)
    {
        if (s.expiration == undefined || Date.now() / 1000 > s.expiration)
            sessions[sid] = undefined;
        else
        {
            if(module.exports.autoRefresh)
                s.expiration = Date.now() / 1000 + module.exports.duration
            req.session = s;
        }
    }
    next();
    
}

module.exports = session;
module.exports.open = function ()
{
    var sid = uuid.v4();
    sessions[sid] = { expiration : Date.now() / 1000 + module.exports.duration, updateStack: [] };
    return sid;
}
module.exports.close = function (sid)
{
    sessions[sid] = undefined;
}
module.exports.get = function(sid)
{
    return sessions[sid];
}