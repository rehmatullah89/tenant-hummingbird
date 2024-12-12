import api from "../../assets/api.js";
import moment from "moment";
import Vue from "vue";
const types = {
  SET_NOTIFICATIONS: "SET_NOTIFICATIONS",
  READ_NOTIFICATION: "READ_NOTIFICIATION",
};

function base64ToArrayBuffer(base64) {
  var binaryString = window.atob(base64);
  var binaryLen = binaryString.length;
  var bytes = new Uint8Array(binaryLen);
  for (var i = 0; i < binaryLen; i++) {
    var ascii = binaryString.charCodeAt(i);
    bytes[i] = ascii;
  }
  return bytes;
}

class Notifications {
  constructor() {
    this.namespaced = true;
    this.state = {
      notifications: [],
    };
    this.getters = {
      notifications: (state) => state.notifications.filter((n) => n.active),
    };
    this.actions = {
      setSuccessNotification({ commit }, notification) {
        let payload = {};
        payload = notification;
        payload.id = notification.id + "_Success";
        payload.status = "formSuccess";
        payload.icon = "mdi-check";
        payload.title = "Success";
        payload.form_errors = payload.formErrors ? payload.formErrors : [];
        commit("setFormAlertMessage", payload);
        setTimeout(() => {
          commit("removeNotification", notification.id);
        }, 6000);
      },
      setErrorNotification({ commit, getters }, notification) {
        let payload = {};
        payload = notification;
        payload.id = notification.id + "_Error";
        payload.status = "formError";
        payload.icon = "mdi-alert";
        payload.title = "Warning";
        payload.form_errors = payload.formErrors ? payload.formErrors : [];
        if (payload.form_errors.length == 0) {
          let index = getters.notifications.findIndex(
            (n) => n.id === notification.id
          );
          if (index >= 0) {
            commit("clearNotification", notification.id);
          }
          return;
        }
        commit("setFormAlertMessage", payload);
      },
      setRemoveNotification({ commit }, notification) {
        commit("removeNotification", notification.id);
      },
      setClearNotification({ commit }, notification) {
        commit("removeNotification", notification.id);
      },
    };
    this.mutations = {
      setFormAlertMessage(state, payload) {
        let found = state.notifications.findIndex((n) => n.id === payload.id);
        if (found >= 0) {
          state.notifications[found].text = payload.text;
          state.notifications[found].errors = payload.form_errors;
          state.notifications[found].active = true;
        } else {
          state.notifications.push({
            id: payload.id,
            type: "alert",
            icon: payload.icon,
            title: payload.title,
            dismissible: true,
            status: payload.status,
            loading: false,
            text: payload.text,
            errors: payload.form_errors,
            action: false,
            btn_text: false,
            active: true,
          });
        }
      },
      setAlert(state, payload) {
        let statuses = [
          {
            success: {
              icons: "mdi-check",
              title: "Success!",
            },
            warning: {
              icons: "mdi-alert",
              title: "Warning",
            },
            error: {
              icons: "mdi-block-helper",
              title: "Error!",
            },
          },
        ];

        let found = state.notifications.findIndex((n) => n.id === payload.id);
        if (found >= 0) {
          state.notifications[found].icon = statuses[payload.status]
            ? statuses[payload.status].icon
            : null;
          state.notifications[found].title = payload.title;
          state.notifications[found].status = payload.status;
          state.notifications[found].text = payload.text;
          state.notifications[found].active = true;
        } else {
          state.notifications.push({
            id: payload.id,
            type: "alert",
            icon: statuses[payload.status]
              ? statuses[payload.status].icon
              : null,
            title: payload.title,
            dismissible: true,
            status: payload.status,
            loading: false,
            text: payload.text,
            action: false,
            btn_text: false,
            active: true,
          });
        }
      },
      [types.SET_NOTIFICATIONS](state, notifications) {
        state.notifications = notifications;
      },

      [types.READ_NOTIFICATION](state, notification) {},
      removeNotification(state, id) {
        let index = state.notifications.findIndex((n) => n.id === id);
        Vue.set(state.notifications[index], "active", false);
      },
      clearNotification(state, id) {
        let index = state.notifications.findIndex((n) => n.id === id);
        Vue.set(state.notifications, index, []);
      },
    };
  }
}

export default Notifications;
