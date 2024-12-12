"use strict";

const _ = require('lodash');
const ClsHooked = require("cls-hooked");
const id = "hummingbird";
const namespace = ClsHooked.createNamespace(id);

const clsContext = {
  addMiddleware(req, res, next) {
    namespace.bindEmitter(req);
    namespace.bindEmitter(res);

    namespace.run(() => next());
  },
  
  getNamespace() {
    return namespace;
  },

  get(key) {
    if (namespace && namespace.active) {
      return namespace.get(key);
    }
  },

  set(key, value) {
    if (namespace && namespace.active) {
      return namespace.set(key, value);
    }
  },

  /**
   * Append the newly added key and value to parentKey property inside active namespace
   * [parentKey]: [{ key, value }, { key, value }]
   *
   * @param {string} key
   * @param {*} value
   * @param {string} parentKey
   */
  push(key, value, parentKey = "events") {
    const previousData = clsContext.get(parentKey) || [];

    if(_.findIndex(previousData, function(d) { return _.isEqual(d[key], value) }) != -1) {
      console.log(`Following event with same data already exists `, { [key] : value });
      return; 
    };

    const modifiedData = [...previousData];
    modifiedData.push({ [key] : value });
		clsContext.set(parentKey, modifiedData);

    // console.log("Active Namespace data: ", JSON.stringify(namespace.active));
  },

  /* removeActiveContext() {
    const activeContextId = clsContext.getNamespace().active.id;
    for (const [key, value] of namespace._contexts) {
      if (value.id === activeContextId) namespace._contexts.delete(key)
    }
  } */
};

module.exports = clsContext;