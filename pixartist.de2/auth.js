var q = require('q');
module.exports = new Auth();

function Auth()
{

}

Auth.prototype.authenticate = function(username, password)
{
    var deferred = q.defer();
    deferred.resolve("Success");
    return deferred.promise;
}