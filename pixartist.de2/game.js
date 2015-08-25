var simplex = require('simplex-noise');
var rnd = require('random-seed');
var event = require('events');
var settings =
 {
    chunkSize: 16,
    worldHeight: 256,
    noiseScaleBase: 0.01,
    tileTypeCount: 6,
    maxUpdatesPerTick: 64
}
Number.prototype.mod = function (n)
{
    return ((this % n) + n) % n;
};
var getWorldLocation = function(pTile, pChunk)
{
    return addPoint3(pTile, scalePoint3(pChunk, settings.chunkSize));
}
//type
var TileType = 
 {
    AIR: 0,
    GRANITE: 1,
    DIRT: 2,
    GRASS: 3,
    LEAFS: 4,
    LOG: 5
};

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
    return new Point3(a.x + b.x, a.y + b.y, a.h || 0 + b.h || 0);
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

//world
var World = function (seed)
{
    this.chunks = [];
    this.updateQueue = [];
    this.updateQueue[0] = [];
    this.updateQueue[1] = [];
    this.activeUpdateQueue = 0;
    this.seed = seed;
    this.random = new rnd(seed);
    this.noise = new simplex(this.random);
};
World.prototype.getChunk = function (p)
{
    console.log("Getting chunk " + p);
    var c = this.chunks[p.x];
    if (c == undefined)
        this.chunks[p.x] = [];
    c = this.chunks[p.x][p.y];
    if (c == undefined)
    {
        var c = new Chunk(p.x, p.y, this);
        this.chunks[p.x][p.y] = c;
    }
    return c;
}
World.prototype.getTile = function (p, callback)
{
    console.log("Getting tile " + p);
    var cp = new Point2(Math.floor(p.x / settings.chunkSize), Math.floor(p.y / settings.chunkSize));
    var tp = new Point3(p.x.mod(settings.chunkSize), p.y.mod(settings.chunkSize), p.h);
    var c = this.getChunk(cp);
    if (!c.ready)
        c.eventEmitter.once('ready', function ()
        {
            callback(p, c.tiles[tp.x][tp.y].tiles[tp.h]);
        });
    else
        callback(p, c.tiles[tp.x][tp.y].tiles[tp.h]);
}
World.prototype.setTileType = function (p, t, update, callback)
{
    
    if (update == undefined)
        update = true;
    this.getTile(p, function (p, tile)
    {
        console.log("Setting tile " + p + " to " + t);
        tile.setType(t, update)
        if (callback)
            callback(p, tile);
    });
}
World.prototype.requestUpdate = function (p)
{
    console.log("Adding " + p + " to update queue");
    if (this.updateQueue[this.activeUpdateQueue][p] == undefined)
        this.updateQueue[this.activeUpdateQueue].push(p);
    else
        console.log(p + " already in update queue");
}
World.prototype.tick = function ()
{
    var q = 1 - this.activeUpdateQueue;
    var i = 0;
    console.log("Tick: " + this.updateQueue[q].length);
    while(this.updateQueue[q].length > 0 && i < settings.maxUpdatesPerTick)
    {
        
        var p = this.updateQueue[q].shift();
        this.getTile(p, function (pos, t)
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
World.prototype.toJSON = function ()
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
}
//chunk
var Chunk = function (x, y, world)
{
    console.log("Creating chunk " + x + " " + y);
    this.eventEmitter = new event.EventEmitter();
    this.world = world;
    this.location = new Point2(x, y);
    this.tiles = [];
    this.ready = false;
    for (var x = 0; x < settings.chunkSize; x++)
    {
        this.tiles[x] = [];
        for (var y = 0; y < settings.chunkSize; y++)
        {
            this.tiles[x][y] = {top: 0, tiles: []};
            for (var h = 0; h < settings.worldHeight; h++)
            {
                this.tiles[x][y].tiles[h] = new Tile(x, y, h, this);
            }
        }
    }
    this.ready = true;
    this.eventEmitter.emit('created', this);
};

Chunk.prototype.getTile = function(p)
{
    return this.tiles[p.x][p.y].tiles[p.h];
}

Chunk.prototype.toJSON = function ()
{
    var json = [];
    for (var x = 0; x < settings.chunkSize; x++)
    {
        json[x] = [];
        for (var y = 0; y < settings.chunkSize; y++)
        {
            json[x][y] = [];
            for (var h = 0; h < settings.worldHeight; h++)
            {
                json[x][y][h] = this.tiles[x][y].tiles[h].toJSON();
            }
        }
    }
    return json;
}

//tile
var Tile = function (localX, localY, localH, chunk)
{
    
    this.chunk = chunk;
    this.tileLocation = new Point3(localX, localY, localH);
    this.neighbours = [];
    var wl = getWorldLocation(this.tileLocation, this.chunk.location);
    
    this.neighbours.push(addPoint3(wl, new Point3(1, 0, 0)));
    this.neighbours.push(addPoint3(wl, new Point3(-1, 0, 0)));
    this.neighbours.push(addPoint3(wl, new Point3(0, 1, 0)));
    this.neighbours.push(addPoint3(wl, new Point3(0, -1, 0)));
    if (localH < settings.worldHeight - 1)
        this.neighbours.push(addPoint3(wl, new Point3(0, 0, 1)));
    if (localH > 0)
        this.neighbours.push(addPoint3(wl, new Point3(0, 0, -1)));

    Object.defineProperty(this, "worldLocation", 
    {
        get :
 function ()
        {
            return getWorldLocation(this.tileLocation, this.chunk.location);
        }
    });
    var n = (1 + chunk.world.noise.noise3D(this.tileLocation.x * settings.noiseScaleBase, this.tileLocation.y * settings.noiseScaleBase, this.tileLocation.h * settings.noiseScaleBase)) / 2;
    this.setType(Math.floor(n * settings.tileTypeCount));
};

Tile.prototype.setType = function (type, update)
{
    this.type = type;
    if (update)
    {
        for (var i = 0; i < this.neighbours.length; i++)
        {
            this.chunk.world.requestUpdate(this.neighbours[i]);
        }
    }
}
Tile.prototype.update = function ()
{
    console.log("Updating " + this.worldLocation.toString());
}
Tile.prototype.toJSON = function ()
{
    return { t: this.type };
}
exports.World = World;
exports.Chunk = Chunk;
exports.Point2 = Point2;
exports.Point3 = Point3;
exports.TileType = TileType;