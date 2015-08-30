var q = require('q');
module.exports = new Auth();

function Auth()
{

}

Auth.prototype.authenticate = function(username, password)
{
    var userData = {id:0};
    var deferred = q.defer();
    if (username === "pixartist")
        deferred.resolve(userData);
    else
        deferred.reject("User not found");
    return deferred.promise;
}