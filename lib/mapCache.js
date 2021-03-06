/**
 * A Map-based implementation of the NormalizedCache.
 * Note that you need a polyfill for Object.entries for this to work.
 */
var MapCache = /** @class */ (function () {
    function MapCache(data) {
        if (data === void 0) { data = {}; }
        this.cache = new Map(Object.entries(data));
    }
    MapCache.prototype.get = function (dataId) {
        return this.cache.get("" + dataId);
    };
    MapCache.prototype.set = function (dataId, value) {
        this.cache.set("" + dataId, value);
    };
    MapCache.prototype.delete = function (dataId) {
        this.cache.delete("" + dataId);
    };
    MapCache.prototype.clear = function () {
        return this.cache.clear();
    };
    MapCache.prototype.toObject = function () {
        var obj = {};
        this.cache.forEach(function (dataId, key) {
            obj[key] = dataId;
        });
        return obj;
    };
    MapCache.prototype.replace = function (newData) {
        var _this = this;
        this.cache.clear();
        Object.entries(newData).forEach(function (_a) {
            var dataId = _a[0], value = _a[1];
            return _this.cache.set(dataId, value);
        });
    };
    return MapCache;
}());
export { MapCache };
export function mapNormalizedCacheFactory(seed) {
    return new MapCache(seed);
}
//# sourceMappingURL=mapCache.js.map