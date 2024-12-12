import axios from "axios";
import moment from "moment";

const docManagerClient = axios.create({
  baseURL: process.env.VUE_APP_DOCMANAGER_BASE_URL,
  headers: {
    "X-storageapi-key": process.env.VUE_APP_DOC_GDS_API_KEY,
    "X-tenant-doc-auth-token": process.env.VUE_APP_DOC_AUTH_TOKEN,
    "X-storageapi-date": moment().format("x"),
  },
});

export default docManagerClient;
