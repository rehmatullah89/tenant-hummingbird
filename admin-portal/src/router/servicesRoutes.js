export default [
  {
    name: "Accounting",
    path: "/services/Accounting",
    component: () => import("../components/services/Accounting.vue"),
    meta: {
      layout: "master",
      hasAccess: ["admin"],
      requiresAuth: true,
    },
  },
  {
    name: "InboundCommunication",
    path: "/services/InboundCommunication",
    component: () => import("../components/services/InboundCommunication.vue"),
    meta: {
      layout: "master",
      hasAccess: ["admin"],
      requiresAuth: true,
    },
  },
  {
    name: "DocmanagerSubscribe",
    path: "/services/DocmanagerSubscribe",
    component: () => import("../components/services/DocmanagerSubscribe.vue"),
    meta: {
      layout: "master",
      hasAccess: ["admin"],
      requiresAuth: true,
    },
  },
  {
    name: "DocmanagerTemplateUpload",
    path: "/services/DocmanagerTemplateUpload",
    component: () =>
      import("../components/services/DocmanagerTemplateUpload.vue"),
    meta: {
      layout: "master",
      hasAccess: ["admin"],
      requiresAuth: true,
    },
  },
];
