// import ListAccount from '../components/admin/ListAccounts.vue';

export default [
	{
		name: "Administrators",
		path: '/admins',
		component: () => import(/* webpackChunkName: "adminAccounts" */'../components/admin/Index.vue'),
		meta: {
			requiresAuth: true,
			hasAccess: ['admin'],
      layout: 'master'
		}
	},
  {
    name: "Databases",
    path: '/databases',
    component: () => import(/* webpackChunkName: "adminAccounts" */'../components/databases/Index.vue'),
    meta: {
      requiresAuth: true,
      hasAccess: ['admin'],
      layout: 'master'
    }
  },
  {
    name: "Redshift Databases",
    path: '/redshift-databases',
    component: () => import(/* webpackChunkName: "adminAccounts" */'../components/redshift/Index.vue'),
    meta: {
      requiresAuth: true,
      hasAccess: ['admin'],
      layout: 'master'
    }
  },
  {
    name: "Companies",
    path: '/companies',
    component:  () => import(/* webpackChunkName: "register" */'../components/companies/Index.vue'),
    meta:{
      requiresAuth: true,
      hasAccess: ['admin'],
      layout: 'master'
    }
  },
]
