

export default [
    {
        path: '/',
        redirect: '/dashboard',
        meta: {
            layout: 'unauthenticated'
        }
    },
    {
        name: "Login",
        path: '/login',
        component: () => import(/* webpackChunkName: "login" */'../components/Login.vue'),
        meta:{
            layout: 'unauthenticated'
        }
    },
    {
        name: "Logout",
        path: '/logout',
        component: () => import(/* webpackChunkName: "logout" */'../components/Logout.vue'),
    },
    {
        name: "ResetPassword",
        path: '/reset-password',
        component: () => import(/* webpackChunkName: "resetPassword" */'../components/ResetPassword.vue'),
        meta:{
            layout: 'unauthenticated'
        }
    },
    {
        name: "ForgotUsername",
        path: '/forgot-username',
        component: () => import(/* webpackChunkName: "forgotUsername" */'../components/ForgotUsername.vue'),
        meta:{
            layout: 'unauthenticated'
        }
    },
    {
        name: "Register",
        path: '/register',
        component:  () => import(/* webpackChunkName: "register" */'../components/Register.vue'),
        meta:{
            layout: 'unauthenticated'
        }
    },
    {
        name: "NewPassword",
        path: '/reset-password/:hash',
        component: () => import(/* webpackChunkName: "newPassword" */'../components/NewPassword.vue'),
        meta:{
            layout: 'unauthenticated'
        }
    },
    {
        name: "Switch",
        path: '/switch',
        component: () => import(/* webpackChunkName: "switch" */'../components/Switch.vue'),
        meta:{
            hasAccess: ['admin']
        }

    },
    {
        path: '/404',
        component: () => import(/* webpackChunkName: "404" */'../components/NotFound.vue')
    },
    {
        path: '*',
        redirect: '/404'
    }
]
