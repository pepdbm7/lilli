'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

require('dotenv').config();
var fs = require('fs');
var path = require('path');
var pluralize = require('pluralize');

var Table = function () {
    function Table(table, query) {
        _classCallCheck(this, Table);

        this._table = table;
        this._database = path.join(process.cwd(), process.env.LILLI_DATA_DIRECTORY || 'data', table + '.json');
        this._charset = process.env.LILLI_CHARSET || 'UTF8';
        this._entity = require('' + path.join(process.cwd(), process.env.LILLI_MODEL_DIRECTORY || 'model', 'entity', pluralize.singular(table)));
        this._primaryKey = 'id';
        this._relations = {};
        this._data = this._readData();
        this._query = query || this._data.slice();
    }

    _createClass(Table, [{
        key: '_readData',
        value: function _readData() {
            var data = JSON.parse(fs.readFileSync(this._database, this._charset)) || [];
            return Object.freeze(data);
        }
    }, {
        key: '_writeData',
        value: function _writeData(data) {
            fs.writeFileSync(this._database, JSON.stringify(data), this._charset);
            return this._readData();
        }
    }, {
        key: '_setRelation',
        value: function _setRelation(table, props, type) {
            var model = require('' + path.join(process.cwd(), process.env.LILLI_MODEL_DIRECTORY || 'model', 'table', table));
            this._relations[table] = _extends({ type: type, model: model }, props);
        }
    }, {
        key: '_oneToOne',
        value: function _oneToOne(relatedTable, entity, index) {
            this._query[index][pluralize.singular(relatedTable._table)] = relatedTable.where(_defineProperty({}, this._relations[relatedTable._table].foreignKey, entity[this._primaryKey])).first();
        }
    }, {
        key: '_oneToMany',
        value: function _oneToMany(relatedTable, entity, index) {
            this._query[index][relatedTable._table] = relatedTable.where(_defineProperty({}, this._relations[relatedTable._table].foreignKey, entity[this._primaryKey])).all();
        }
    }, {
        key: '_manyToOne',
        value: function _manyToOne(relatedTable, entity, index) {
            this._query[index][pluralize.singular(relatedTable._table)] = relatedTable.where(_defineProperty({}, relatedTable._primaryKey, entity[this._relations[relatedTable._table].foreignKey])).first();
        }
    }, {
        key: '_manyToMany',
        value: function _manyToMany(relatedTable, entity, index) {
            this._oneToMany(relatedTable, entity, index);
        }
    }, {
        key: '_group',
        value: function _group(query, field, left) {
            var _this = this;

            var groups = [];
            var next = left.shift();
            var table = next ? pluralize.plural(next) : this._table;

            query.forEach(function (element) {
                var index = groups.findIndex(function (group) {
                    return group[field] === element[field];
                });
                if (index < 0) {
                    var _groups$push;

                    groups.push((_groups$push = {}, _defineProperty(_groups$push, field, element[field]), _defineProperty(_groups$push, table, []), _groups$push));

                    index = groups.length - 1;
                }

                groups[index][table].push(element);
            });

            if (next) groups.forEach(function (group) {
                return group[table] = _this._group(group[table], next, left);
            });
            return groups;
        }
    }, {
        key: 'setPrimaryKey',
        value: function setPrimaryKey(key) {
            this._primaryKey = key;
        }
    }, {
        key: 'hasOne',
        value: function hasOne(table, props) {
            this._setRelation(table, props, 'oneToOne');
        }
    }, {
        key: 'hasMany',
        value: function hasMany(table, props) {
            this._setRelation(table, props, 'oneToMany');
        }
    }, {
        key: 'belongsTo',
        value: function belongsTo(table, props) {
            this._setRelation(table, props, 'manyToOne');
        }
    }, {
        key: 'belongsToMany',
        value: function belongsToMany(table, props) {
            this._setRelation(table, props, 'manyToMany');
        }
    }, {
        key: 'newEntity',
        value: function newEntity(query) {
            return new this._entity(query);
        }
    }, {
        key: 'contains',
        value: function contains(tables) {
            var _this2 = this;

            tables.forEach(function (table) {
                _this2._query.forEach(function (element, index) {
                    var relatedTable = new _this2._relations[table].model();
                    _this2['_' + _this2._relations[table].type](relatedTable, element, index);
                });
            });

            return this;
        }
    }, {
        key: 'select',
        value: function select(fields) {
            fields.push(this._primaryKey);
            this._query.forEach(function (element) {
                for (var key in element) {
                    if (!fields.includes(key)) delete element[key];
                }
            });

            return this;
        }
    }, {
        key: 'where',
        value: function where(query) {
            var _this3 = this;

            var _loop = function _loop(key) {
                _this3._query = _this3._query.filter(function (element) {
                    return element[key] == query[key];
                });
            };

            for (var key in query) {
                _loop(key);
            }

            return this;
        }
    }, {
        key: 'order',
        value: function order(query) {
            var fields = Object.keys(query);
            var direction = Object.values(query);
            this._query.sort(function (oa, ob) {
                var result = void 0,
                    index = 0;
                do {
                    var dir = direction[index].toLowerCase();
                    var a = oa[fields[index]],
                        b = ob[fields[index]];
                    if (a == null || b == null) {
                        result = dir === 'asc' ? a === b ? 0 : !a ? 1 : -1 : a === b ? 0 : !b ? 1 : -1;
                    } else if (typeof a === 'string') {
                        a = a.toLowerCase();
                        b = b.toLowerCase();
                        result = dir === 'asc' ? a > b ? 1 : b > a ? -1 : 0 : a < b ? 1 : b < a ? -1 : 0;
                    } else {
                        result = dir === 'asc' ? a > b ? 1 : b > a ? -1 : 0 : a < b ? 1 : b < a ? -1 : 0;
                    }
                } while (!result && ++index < direction.length);
                return result;
            });

            return this;
        }
    }, {
        key: 'save',
        value: function save(entity) {
            var _this4 = this;

            var data = this._data.slice();
            var index = data.findIndex(function (element) {
                return element[_this4._primaryKey] === entity[_this4._primaryKey];
            });
            index < 0 ? data.push(entity) : data[index] = entity;
            this._data = this._writeData(data);
            return entity;
        }
    }, {
        key: 'delete',
        value: function _delete(entity) {
            var _this5 = this;

            var data = this._data.slice();
            data = data.filter(function (element) {
                return element[_this5._primaryKey] !== entity[_this5._primaryKey];
            });
            this._data = this._writeData(data);
            return true;
        }
    }, {
        key: 'group',
        value: function group(fields) {
            var field = fields.shift();
            var groups = this._group(this._query, field, fields);
            return groups;
        }
    }, {
        key: 'count',
        value: function count() {
            return this._query.length;
        }
    }, {
        key: 'all',
        value: function all() {
            return this._query;
        }
    }, {
        key: 'first',
        value: function first() {
            return this._query[0];
        }
    }, {
        key: 'get',
        value: function get(value) {
            return this.where(_defineProperty({}, this._primaryKey, value)).first();
        }
    }]);

    return Table;
}();

module.exports = Table;