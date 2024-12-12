"use strict";

const ClsHooked = require("cls-hooked");
const id = "hummingbird";
const namespace = ClsHooked.createNamespace(id);

const clsContext = {
  addMiddleware(req, res, next, data) {
    namespace.run(() => next(data));
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
    const modifiedData = [...previousData];
    modifiedData.push({ [key] : value });
		clsContext.set(parentKey, modifiedData);

    // console.log("Active Namespace data: ", JSON.stringify(namespace.active));
  },
};

module.exports = clsContext;