var simplex = require('simplex-noise');
var rnd = require('random-seed');
var event = require('events');

Number.prototype.mod = function (n)
{
    return ((this % n) + n) % n;
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

var getWorldLocation = function (pTile, pChunk)
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
var Direction = 
 {
    LEFT: new Point3(-1, 0, 0),
    RIGHT: new Point3(1, 0, 0),
    INFRONT: new Point3(0, -1, 0),
    BEHIND: new Point3(0, 1, 0),
    BELOW: new Point3(0, 0, -1),
    ABOVE: new Point3(0, 0, 1)
}
var settings =
 {
    noiseScaleBase: 0.01,
    tileTypeCount: 6,
    maxUpdatesPerTick: 64,
    worldSize: new Point3(128, 128, 32)
}
//world
var World = function (seed)
{
    this.updateQueue = [];
    this.updateQueue[0] = [];
    this.updateQueue[1] = [];
    this.activeUpdateQueue = 0;
    this.seed = seed;
    this.random = new rnd(seed);
    this.noise = new simplex(this.random);
    this.create();
};
World.prototype.create = function()
{
    this.tiles = [];
    for (var x = 0; x < settings.worldSize.x; x++)
    {
        this.tiles[x] = [];
        for (var y = 0; y < settings.worldSize.y; y++)
        {
            this.tiles[x][y] = [];
            for (var h = 0; h < settings.worldSize.h; h++)
            {
                var n = this.noise.noise4D(x * settings.noiseScaleBase, y * settings.noiseScaleBase, h * settings.noiseScaleBase, 0) * settings.tileTypeCount;
                this.tiles[x][y][h] = Math.floor(n);
            }
        }
        console.log("Generating world: " + 100 * (x / settings.worldSize.x) + "%");
    }
    console.log("Done");
}
World.prototype.isLegalCoord = function(p)
{
    return p.x >= 0 && p.y >= 0 && p.h >= 0 && p.x < settings.worldSize.x && p.y < settings.worldSize.y && p.h < settings.worldSize.h;
}
World.prototype.getTile = function (p)
{
    console.log("Getting tile " + p);
    if (this.isLegalCoord(p))
        return this.tiles[p.x][p.y][p.h];
    return 0;
}
World.prototype.setTileType = function (p, t, update)
{
    if (this.isLegalCoord(p))
        this.tiles[p.x][p.y][p.h].setType(t, update);
}
World.prototype.requestUpdate = function (i)
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
var Tile = function (p, t, world)
{
    
    this.world = world;
    this.tileLocation = new Point3(p.x, p.y, p.h);
    this.neighbours = [];
    for(var d in Direction)
    {
        var l = addPoint3(p, Direction[d]);
        if (world.isLegalCoord(l))
            this.neighbours.push(l);
    }
    this.type = t;
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
exports.Point2 = Point2;
exports.Point3 = Point3;
exports.TileType = TileType;