var simplex = require('simplex-noise');
var rnd = require('random-seed');
var event = require('events');
var Content = require('./dataDefinitions.js');
var q = require('sorted-array');
var events = require('events');
Number.prototype.mod = function (n)
{
    return ((this % n) + n) % n;
};
function isNumber(obj)
{ return !isNaN(parseFloat(obj)) }

//point2
var scalePoint2 = function (p, v)
{
    return new Point2(p.x * v, p.y * v);
};
var addPoint2 = function (a, b)
{
    return new Point2(a.x + b.x, a.y + b.y);
}

var Point2 = function (x, y)
{
    this.x = x;
    this.y = y;
};
Point2.prototype.toString = function ()
{
    return "{" + this.x + ", " + this.y + "}";
}
//point3
var scalePoint3 = function (p, v)
{
    return new Point3(p.x * v, p.y * v, p.h * v);
};
var addPoint3 = function (a, b)
{
    return new Point3(a.x + b.x, a.y + b.y, a.h + b.h);
}
var dist3 = function (a, b)
{
    var d = new Point3(b.x - a.x, b.y - a.y, b.h - a.h);
    return Math.sqrt(d.x * d.x + d.y * d.y + d.h * d.h);
}
var dist3sq = function (a, b)
{
    var d = { x: b.x - a.x, y: b.y - a.y, h: b.h - a.h };
    return d.x * d.x + d.y * d.y + d.h * d.h;
}
var Point3 = function (x, y, h)
{
    this.x = x;
    this.y = y;
    this.h = h;
}
Point3.prototype.toString = function ()
{
    return "{" + this.x + ", " + this.y + ", " + this.h + "}";
}


var Directions = 
 [
    new Point3(-1, 0, 0),
    new Point3(1, 0, 0),
    new Point3(0, -1, 0),
    new Point3(0, 1, 0),
    new Point3(0, 0, -1),
    new Point3(0, 0, 1)
];
var Direction = 
 {
    LEFT: 0,
    RIGHT: 1,
    INFRONT: 2,
    BEHIND: 3,
    BELOW: 4,
    ABOVE: 5
}
var settings =
 {
    terrainNoise: {
        baseValue: 40,
        overallFactor: 22,
        normalize: false,
        layers: [
            {
                scale: 0.02,
                amplitude: 1.0,
                z: 0.0
            }
        ]
    },
    soilNoise: {
        baseValue: 0,
        overallFactor: 22,
        normalize: true,
        layers: [
            {
                scale: 0.3,
                amplitude: 1.0,
                z: 0.0
            }
        ]
    },
    caveNoise: {
        baseValue: 0,
        overallFactor: 1,
        normalize: true,
        layers: [
            {
                scale: 0.06,
                amplitude: 1.0,
                z: 0.0
            }
        ]
    },
    climateNoise: {
        baseValue: 20,
        overallFactor: 60,
        normalize: false,
        layers: [
            {
                scale: 0.01,
                amplitude: 1.0,
                z: 0.0
            }
        ]
    },
    caveLimit: 0.15,
    maxUpdatesPerTick: 64,
    worldSize: new Point3(312, 312, 64)
}
//world
var World = function (seed)
{
    this.events = new events.EventEmitter();
    this._pfif = 0;
    this.kingdoms = [];
    this.updateQueue = [];
    this.updateQueue[0] = [];
    this.updateQueue[1] = [];
    this.activeUpdateQueue = 0;
    this.seed = seed;
    this.random = new rnd(seed);
    this.noise = new simplex(Math.random);
    this.created = false;
    this.create();
    
};
World.prototype.getNoiseV2 = function (x, y, settings)
{
    var v = 0.0;
    for (var i = 0; i < settings.layers.length; i++)
    {
        var t = this.noise.noise3D(x * settings.layers[i].scale, y * settings.layers[i].scale, settings.layers[i].z) * settings.layers[i].amplitude;
        if (settings.normalize)
            t = (t + 1) * 0.5;
        v += t;
    }
    v *= settings.overallFactor;
    v += settings.baseValue;
    return v;
}
World.prototype.getNoiseV3 = function (x, y, h, settings)
{
    var v = 0.0;
    for (var i = 0; i < settings.layers.length; i++)
    {
        var t = this.noise.noise4D(x * settings.layers[i].scale, y * settings.layers[i].scale, h * settings.layers[i].scale, settings.layers[i].z) * settings.layers[i].amplitude;
        if (settings.normalize)
            t = (t + 1) * 0.5;
        v += t;
    }
    v *= settings.overallFactor;
    v += settings.baseValue;
    return v;
}
World.prototype.neighbour = function (index, direction)
{
    return this.tiles[this.tiles[index].neighbours[direction]];
}
World.prototype.create = function()
{
    this.climate = [];
    this.tiles = [];
    this.tileMap = [];
    for (var x = 0; x < settings.worldSize.x; x++)
    {
        this.tileMap[x] = [];
        this.climate[x] = [];
        for (var y = 0; y < settings.worldSize.y; y++)
        {
            this.tileMap[x][y] = [];
            this.climate[x][y] = this.getNoiseV2(x, y, settings.climateNoise);
            var altitude = this.getNoiseV2(x, y, settings.terrainNoise);
            var soil = this.getNoiseV2(x, y, settings.soilNoise);
            wasBlock = true;
            for (var h = 0; h < settings.worldSize.h; h++)
            {
                var caveValue = this.getNoiseV3(x, y, h, settings.caveNoise);
                var index = this.tiles.length;
                var tile = new Tile(index, new Point3(x, y, h), -1, this);
                if (caveValue > settings.caveLimit)
                {
                    wasBlock = false;
                    if (h < altitude - soil)
                    {
                        tile.setBlock(Content.Tiles['Granite'], true);
                        wasBlock = true;
                    }
                    else if (h < altitude - 1)
                    {
                        tile.setBlock(Content.Tiles['Soil'], true);
                        wasBlock = true;
                    }
                    else if (h < altitude)
                    {
                        tile.setFloor(Content.Tiles['Grass'], true);
                        wasBlock = true;
                    }
                    
                }
                else
                {
                    if (wasBlock)
                    {
                        tile.setFloor(Content.Tiles.Granite, true);
                    }
                    wasBlock = false;
                }
                this.tiles.push(tile);
                this.tileMap[x][y][h] = index;
            }
        }
        console.log("Generating heightmap: " + 100 * (x / settings.worldSize.x) + "%");
    }
    //traverse map again
    for (var x = 0; x < settings.worldSize.x; x++)
    {
        for (var y = 0; y < settings.worldSize.y; y++)
        {
            for (var h = 0; h < settings.worldSize.h; h++)
            {
                var index = this.tileMap[x][y][h];
                var self = this.tiles[index];
                self.getNeighbours(); //set neighbours;
                if (self.hasFloor() && !self.hasBlock())
                {
                    var below = this.neighbour(index, Direction.BELOW);
                    if (below && below.hasBlock())
                    {
                        for (var i = Direction.LEFT; i <= Direction.BEHIND; i++)
                        {
                            var n = this.neighbour(index, i);
                            if (n && n.hasBlock() && !n.content.isRamp)
                            {
                                self.setBlock(self.content.floor, true);
                                self.content.isRamp = true;
                                break;
                            }
                            
                        }

                    }
                }
            }
        }
        console.log("Traversing tiles: " + 100 * (x / settings.worldSize.x) + "%");
    }
    console.log("Done");
    this.created = true;
}
World.prototype.addPlayer = function(playerId)
{
    if (this.kingdoms[playerId] == undefined)
    {
        this.kingdoms[playerId] = new Kingdom(playerId);
    }
    return this.kingdoms[playerId];
}
World.prototype.isLegalCoord = function(p)
{
    return p.x >= 0 && p.y >= 0 && p.h >= 0 && p.x < settings.worldSize.x && p.y < settings.worldSize.y && p.h < settings.worldSize.h;
}
World.prototype.getIndex = function (p)
{
    if (this.isLegalCoord(p))
        return this.tileMap[p.x][p.y][p.h];
    return -1;
}
World.prototype.getTile = function (p)
{
    console.log("Getting tile " + p);
    if (isNumber(p))
    {
        if (p >= 0 && p < this.tiles.length)
            return this.tiles[p];
    }
    else
    {
        if (this.isLegalCoord(p))
            return this.tiles[this.tileMap[p.x][p.y][p.h]];
    }
    return 0;
}

World.prototype.getDiscoveredTiles = function (userId)
{
    var tiles = [];
    for (var x = 0; x < settings.worldSize.x; x++)
    {
        for (var y = 0; y < settings.worldSize.y; y++)
        {
            for (var h = 0; h < settings.worldSize.h; h++)
            {
                var t = this.tiles[this.tileMap[x][y][h]];
                if (!t.isEmpty())
                {
                    if (t.discoveredBy[userId])
                    {
                        tiles.push(t.toJSON());
                    }
                }
            }
        }
    }
    return tiles;
}
World.prototype.getTopTile = function (x, y)
{
    for (var h = settings.worldSize.h - 1; h >= 0; h--)
    {
        if (!this.tiles[this.tileMap[x][y][h]].isEmpty())
        {
            return this.tiles[this.tileMap[x][y][h]];
        }
    }
    return undefined;
}
World.prototype.discoverGroup = function (userId, locationIndices, maxDistance)
{
    var discovered = [];
    var visited = [];
    for (var i = 0; i < locationIndices.length; i++)
    {
        var t = this.tiles[locationIndices[i]];
        if (t.visited[userId] == undefined || t.visited[userId] < maxDistance)
        {
            this._discoverGroupIt(userId, t.tileLocation, maxDistance * maxDistance, [locationIndices[i]], discovered);
            t.visited[userId] = maxDistance;
        }
    }
    return discovered;
}
World.prototype._discoverGroupIt = function (user, root, mds, toVisit, discovered)
{
    visited = [];
    while (toVisit.length > 0)
    {
        var i = toVisit.pop();
        visited.push(i);
        var self = this.tiles[i];
        self.tmpv = true;

        if (!self.discoveredBy[user])
        {
            self.discoveredBy[user] = true;
            if (self.hasItem())
                this.kingdoms[user].itemLocations.push(i);
            discovered.push(i);
        }

        if (!self.hasBlock() || self.content.isRamp)
        {
            var hasFloor = self.hasFloor();
            var nbs = self.neighbours;
            for (var i = 0; i < nbs.length; i++)
            {
                if (nbs[i] >= 0)
                {
                    var nb = this.tiles[nbs[i]];
                    if (!(nb.tmpv || nb.tmptv))
                    {
                        
                        if (dist3sq(root, nb.tileLocation) <= mds)
                        {
                            if (nb.tileLocation.h >= self.tileLocation.h || !hasFloor)
                            {
                                toVisit.push(nbs[i]);
                                nb.tmptv = true
                            }
                        }
                    }
                }
            }
        }
    }
    for (var i = 0; i < visited.length; i++)
    {
        this.tiles[i].tmpv = false;
        this.tiles[i].tmptv = false;
    }
}
World.prototype.findPath = function (fromIndex, toIndex, callback)
{
    setTimeout(this._astar.bind(this, fromIndex, toIndex, callback), 10);
}
World.prototype._astar = function (fromIndex, toIndex, callback)
{
    console.log("starting pathfinder");
    var queue = new q([], this._pfcmp.bind(this));
    var i = fromIndex;
    var current = this.tiles[i];
    var tloc = this.tiles[toIndex].tileLocation;
    current._pfdist = 0;
    current._pfprev = -1;
    current._pfc = this._pfif;
    current._pfvis = this._pfif;
    var c = 0;
    do
    {
        current = this.tiles[i];
        current._pfvis = this._pfif;
        for (var k = 0; k < current.neighbours.length; k++)
        {
            if (current.neighbours[k] >= 0)
            {
                var nb = this.tiles[current.neighbours[k]];
                
                if (nb._pfvis != this._pfif) // unvisited
                {
                    if (!nb.traversable()) //non-walkable
                    {
                        nb._pfvis = this._pfif;
                    }
                    else
                    {
                        if (nb._pfc != this._pfif) // unchecked
                        {
                            nb._pfc = this._pfif;
                            nb._pfprev = i;
                            nb._pfdist = current._pfdist + 1;
                            nb._pfhdist = nb._pfdist + dist3(nb.tileLocation, tloc);
                            queue.insert(current.neighbours[k]);
                        }
                        else if (nb._pfdist > current._pfdist + 1) //closer  path
                        {
                            queue.remove(current.neighbours[k]);
                            nb._pfdist = current._pfdist + 1;
                            nb._pfhdist = nb._pfdist + dist3(nb.tileLocation, tloc);
                            queue.insert(current.neighbours[k]);
                            nb._pfprev = i;
                        }
                    }
                }
            }
        }
        
        if (queue.array.length < 1)
            break;
        i = queue.array.pop(1);
        c++;
    } 
    while(i != toIndex);
    console.log("PF took " + c + " steps");
    this._pfif++;
    if (i == toIndex)
    {
        var path = [];
        while (i != fromIndex)
        {
            path.push(i);
            i = this.tiles[i]._pfprev;
        }
        path.push(fromIndex);
        callback(fromIndex, toIndex, path);
        return;
    }
    callback(fromIndex, toIndex, undefined);
}
World.prototype._pfcmp = function (a, b)
{
    return this.tiles[b]._pfhdist - this.tiles[a]._pfhdist;
}
World.prototype.requestUpdate = function (i)
{
    if (this.updateQueue[this.activeUpdateQueue].indexOf(i) < 0)
        this.updateQueue[this.activeUpdateQueue].push(i);
}
World.prototype.tick = function ()
{
    var q = 1 - this.activeUpdateQueue;
    var i = 0;
    console.log("Tick: " + this.updateQueue[q].length);
    while(this.updateQueue[q].length > 0 && i < settings.maxUpdatesPerTick)
    {
        
        var i = this.updateQueue[q].shift();
        this.getTile(i, function (pos, t)
        {
            t.update();
        });
        i++;
    }
    if (this.updateQueue[q].length < 1)
    {
        console.log("Switching update queue");
        this.activeUpdateQueue = q;
    }
}
/*World.prototype.toJSON = function ()
{
    var chunks = [];
    for (x in this.chunks)
    {
        for(y in this.chunks[x])
        {
            chunks.push({ x: x, y: y, chunk: this.chunks[x][y].toJSON() });
        }
    }
    return { seed: this.seed, chunks: chunks }
}*/
//chunk


//tile
var Tile = function (index, p, owner, world)
{
    
    this.index = index;
    this.world = world;
    this.owner = owner;
    this.tileLocation = new Point3(p.x, p.y, p.h);
    this.neighbours = [];
    this.discoveredBy = [];
    this.visited = [];
    this.content = {floor: 0, block: 0, isRamp: false, items: []};
};
Tile.prototype.getNeighbours = function ()
{
    for (var d in Direction)
    {
        var l = addPoint3(this.tileLocation, Directions[Direction[d]]);
        this.neighbours[Direction[d]] = this.world.getIndex(l);
    }
}
Tile.prototype.updateNeighbours = function ()
{
    for (var i = 0; i < this.neighbours.length; i++)
    {
        if(this.neighbours[i] >= 0)
            this.world.requestUpdate(this.neighbours[i]);
    }
}

Tile.prototype.addItems = function (type, count, update, unchecked)
{
    var added = 0;
    count = count || 0;
    for (var i = 0; i < this.content.items.length && count > 0; i++)
    {
        if (this.content.items[i].type == type)
        {
            var c = Math.min(count, Content.Items.info[type].maxStack - this.content.items[i].count);
            this.content.items[i].count += c;
            count -= c;
            added += c;
        }
    }
    while (count > 0 && (unchecked || this.content.items.length < Content.Tiles.info[this.content.block]))
    {
        var c = Math.min(count, Content.Items.info[type].maxStack);
        this.content.items.push({ type: type, count: c });
        count -= c;
        added += c;
    }
    this.dropItemsDown();
    if (update && added > 0)
    {
        this.world.events.emit('blockUpdate', this);
        this.updateNeighbours();
    }
    return added;
}
Tile.prototype.removeItems = function (type, count, update)
{
    var removed = 0;
    count = count || 0;
    for (var i = 0; i < this.content.items.length && count > 0; i++)
    {
        if (this.content.items[i].type == type)
        {
            var c = Math.min(this.content.items[i].count, count);
            this.content.items[i].count -= c;
            if (this.content.items[i].count <= 0)
                this.content.items.splice(i, 1);
            removed += c;
        }
    }
    if (update && removed > 0)
    {
        this.world.events.emit('blockUpdate', this);
        this.updateNeighbours();
    }
    return removed;
}

Tile.prototype.setBlock = function (type, skipUpdate)
{
    
    if (this.content.block != type)
    {
        
        this.content.block = type;
        if (!this.hasFloor())
            this.setFloor(type, true);
        else
            this.world.events.emit('blockUpdate', this);
        
        if (!(skipUpdate === true))
            this.updateNeighbours();
        return true;
    }
    
    return false;
}
Tile.prototype.setFloor = function (type, skipUpdate)
{
    if (this.content.floor != type)
    {
        this.content.floor = type;
        //drop items down
        if (!this.dropItemsDown())
            this.world.events.emit('blockUpdate', this);
        if (!(skipUpdate === true))
            this.updateNeighbours();
        return true;
    }
    return false;
}
Tile.prototype.dropItemsDown = function ()
{
    if (!this.hasFloor() && this.content.items.length > 0)
    {
        var tt = this.world.getTopTile(this.tileLocation.x, this.tileLocation.y);
        if (tt != undefined)
        {
            if (this.content.items.length > 0)
            {
                while (this.content.items.length > 0)
                {
                    var i = this.content.items.pop();
                    tt.addItems(i.type, i.count, false, true);
                }
                this.world.events.emit('blockUpdate', this);
                return true;
            }
        }
    }
    return false;
}
Tile.prototype.traversable = function ()
{
    if (this.hasFloor() && (!this.hasBlock() || this.content.isRamp))
        return true;
    else
    {
        var below = this.world.neighbour(this.index, Direction.BELOW);
        if (below)
        {
            return below.hasBlock() && below.content.isRamp;
        }
    }
}
Tile.prototype.hasBlock = function ()
{
    return this.content.block != undefined && this.content.block > 0;
}
Tile.prototype.hasFloor = function ()
{
    return this.content.floor != undefined && this.content.floor > 0;
}
Tile.prototype.hasItem = function ()
{
    return this.content.items.length > 0;
}
Tile.prototype.isEmpty = function ()
{
    return !this.hasBlock() && !this.hasFloor() && !this.hasItem();
}
Tile.prototype.getItemCount = function (type)
{
    var c = 0;
    for (var i = 0; i < this.content.items.length; i++)
    {
        if (this.content.items[i].type == type)
            c += this.content.items[i].count;
    }
    return c;
}
Tile.prototype.update = function ()
{
    console.log("Updating " + this.worldLocation.toString());
    
}
Tile.prototype.toJSON = function ()
{
    return {i: this.index, p: this.tileLocation, c: this.content};
}
var Kingdom = function (playerId, world)
{
    this.owner = playerId;
    this.world = world;
    this.units = [];
    this.tasks = [];
    this.areas = [];
    this.itemLocations = [];
    this.professions = [];
    this.professions.push({ Worker: [Content.Jobs.Hauling] });
}
var Unit = function (id, x, y, h, kingdom)
{
    this.id = id;
    this.location = new Point3(x, y, h);
    this.kingdom = kingdom;
    this.task = undefined;
    this.profession = -1;
}
Unit.prototype.tick = function ()
{
    if (this.task != undefined)
    {
        if (!this.task.tick())
        {
            this.task = undefined;
        }
    }
    else if(this.profession >= 0)
    {
        if (this.kingdom.professions[this.profession] != undefined)
        {
            var p = this.kingdom.professions[this.profession];
            for (var i = 0; i < p.length; i++)
            {
                this.task = Content.Jobs.info[p[i]](this);
                if (this.task.failed)
                {
                    this.task = undefined;
                }
                else
                {
                    break;
                }
            }
        }
    }
}



exports.Content = Content;
exports.World = World;
exports.Point2 = Point2;
exports.Point3 = Point3;
exports.settings = settings;