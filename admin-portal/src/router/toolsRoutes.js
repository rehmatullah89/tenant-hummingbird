export default [
  {
    name: "Hash",
    path: '/hash',
    component:  () => import(/* webpackChunkName: "register" */'../components/tools/Hash.vue'),
    meta:{
      layout: 'master',
      hasAccess: ['admin'],
      requiresAuth: true
    }
  },
  {
    name: "Unhash",
    path: '/unhash',
    component:  () => import(/* webpackChunkName: "register" */'../components/tools/Unhash.vue'),
    meta:{
      layout: 'master',
      hasAccess: ['admin'],
      requiresAuth: true
    }
  },
  {
    name: "Deployment Plan",
    path: '/deployment-plan',
    component:  () => import(/* webpackChunkName: "register" */'../components/tools/MigrateData.vue'),
    meta:{
      layout: 'master',
      hasAccess: ['admin'],
      requiresAuth: true
    }
  },
]
