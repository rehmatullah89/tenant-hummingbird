
export default [
	{
		name: "CompanyOnboard",
		path: '/onboarding',
		component: () => import(/* webpackChunkName: "adminAccounts" */'../components/onboarding/CompanyOnboard/Index.vue'),
		meta: {
			requiresAuth: true,
			hasAccess: ['cocoonadmin', 'admin'],
            layout: 'master'
		}
	},
]