export default [
  {
    name: "Invoices",
    path: '/resiliency/invoices',
    component:  () => import(/* webpackChunkName: "register" */'../components/resiliency/Invoices.vue'),
    meta:{
      layout: 'master',
      hasAccess: ['admin'],
      requiresAuth: true
    }
  },
  {
    name: "Statuses",
    path: '/resiliency/statuses',
    component:  () => import(/* webpackChunkName: "register" */'../components/resiliency/Statuses.vue'),
    meta:{
      layout: 'master',
      hasAccess: ['admin'],
      requiresAuth: true
    }
  },
  {
    name: "Auto Payments",
    path: '/resiliency/auto-payments',
    component:  () => import(/* webpackChunkName: "register" */'../components/resiliency/AutoPayments.vue'),
    meta:{
      layout: 'master',
      hasAccess: ['admin'],
      requiresAuth: true
    }
  },
  {
    name: "Reconcile Accounts",
    path: '/resiliency/reconcile',
    component:  () => import(/* webpackChunkName: "register" */'../components/resiliency/Reconcile.vue'),
    meta:{
      layout: 'master',
      hasAccess: ['admin'],
      requiresAuth: true
    }
  },
  {
    name: "Triggers",
    path: '/resiliency/triggers',
    component:  () => import(/* webpackChunkName: "register" */'../components/resiliency/Triggers.vue'),
    meta:{
      layout: 'master',
      hasAccess: ['admin'],
      requiresAuth: true
    }
  },
  {
    name: "invoice Allocation",
    path: '/resiliency/invoice-allocation',
    component:  () => import('../components/resiliency/InvoiceAllocation.vue'),
    meta:{
      layout: 'master',
      hasAccess: ['admin'],
      requiresAuth: true
    }
  },
  {
    name: "Payment Allocation",
    path: '/resiliency/payment-allocation',
    component:  () => import('../components/resiliency/PaymentAllocation.vue'),
    meta:{
      layout: 'master',
      hasAccess: ['admin'],
      requiresAuth: true
    }
  },
  {
    name: "Jobs",
    path: '/resiliency/jobs',
    component:  () => import(/* webpackChunkName: "register" */'../components/resiliency/Jobs.vue'),
    meta:{
      layout: 'master',
      hasAccess: ['admin'],
      requiresAuth: true
    }
  },
]
