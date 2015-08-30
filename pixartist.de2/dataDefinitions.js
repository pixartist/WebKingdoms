var drop = function (itemType, amount, chance)
{
    return { type: itemType, amount: amount || 1, chance: chance || 1 };
}
var toolType = 
 {
    PICKAXE: 0,
    LUMBERAXE: 1,
    WEAPON: 2,

};
//items
var ItemTypeInfo = function ()
{
    this.info = [];
    this.addType = function (name, id, maxStack)
    {
        this[name] = id;
        this.info[id] = { maxStack: maxStack || 1};
    }
}
var iti = new ItemTypeInfo();
iti.addType('Soil', 0, 32);
iti.addType('Raw granite', 1, 32);
iti.addType('Birch log', 2);

//tiles
var TileTypeInfo = function()
{
    this.info = [];
    this.addType = function (name, id, drops, miningLevel, requiredToolType, maxItemStacks, spawns)
    {
        this[name] = id;
        this.info[id] = { drops: drops || [], miningLevel: miningLevel || 0, requiredToolType: requiredToolType || 0, maxItemStacks: maxItemStacks ||0, spawns: spawns || []};
    }
};

var tti = new TileTypeInfo();
tti.addType('Air', 0, [], 0, 0, 1);
tti.addType('Granite', 1, [iti['Raw granite']], 3);
tti.addType('Soil', 2, [iti['Soil']], 1);
tti.addType('Grass', 3, [iti['Soil']], 1);
tti.addType('Birch log', 4, [iti['Birch log']], 2);
tti.addType('Birch leafs', 5);

var JobInfo = function ()
{
    this.info = [];
    this.addJob = function (name, id, func)
    {
        this[name] = id;
        this.info[id] = func;
    }
}
var HaulingJob = function (unit)
{
    this.failed = false;
    this.tick = function ()
    {

    }
}
var ji = new JobInfo();
ji.addJob('Hauling', 0, HaulingJob);


var AreaInfo = function ()
{
    this.info = [];
    this.addAreaInfo = function (name, id)
    {
        this[name] = id;
        this.info[id] = {};
    }
}
var ai = new AreaInfo();
ai.addAreaInfo("Stockpile", 0);

module.exports.Areas = ai;
module.exports.Tiles = tti;
module.exports.Items = iti;
module.exports.Jobs = ji;
module.exports.ToolType = toolType;