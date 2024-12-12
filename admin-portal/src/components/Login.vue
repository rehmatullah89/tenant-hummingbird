<template>



        <div class="login-box">

            <div class="login-form w-form">
              <v-row class="ma-0 pa-0">
                <v-col md="12" class="pt-0 px-5 ma-0">
                  <status @resetStatus="errorClear($options.name)" v-if="errorHas($options.name)" :message="errorGet($options.name)" status="error"></status>
                  <h1>Hummingbird Admins</h1>
                </v-col>
              </v-row>
              <v-row class="ma-0 pa-0">
                <v-col md="12" class="pt-0 px-5 ma-0">
                    <label for="email" class="label">Email:</label>
                    <v-text-field
                      class="ma-0"
                      type="text"
                      hide-details
                      v-validate="'required|max:255'"
                      v-model="email"
                      required
                      dense
                      outlined
                      id="email"
                      name="email"
                      :class="{'custom-field-error' : errors.first('email')}"
                      :error-messages="errors.first('email')"
                      ></v-text-field>
                </v-col>
              </v-row>
              <v-row class="ma-0 pa-0">
                <v-col md="12" class="pt-0 px-5 ma-0">
                  <label for="password" class="label">Password:</label>
                  <v-text-field
                    class="ma-0"
                    type="password"
                    hide-details
                    v-validate="'required|max:255'"
                    v-model="password"
                    required
                    dense
                    outlined
                    id="password"
                    name="password"
                    :class="{'custom-field-error' : errors.first('password')}"
                    :error-messages="errors.first('password')"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row class="ma-0 pa-0">
                <v-col md="12" class="pt-0 px-5 ma-0">

                <hb-btn color="primary" :disabled="isLoading($options.name)" @click="login">Login</hb-btn>
                <span v-show="isLoading($options.name)" >
                    <loader color="#00b2ce" size="20px" class="inline-loader"></loader>
                </span>
                </v-col>
              </v-row>
            </div>
        </div>

</template>

<script type="text/babel">
    import Status from './includes/Messages.vue';
    import Loader from './assets/CircleSpinner.vue';
    import api from '../assets/api.js';
    import { mapGetters } from 'vuex';
    export default {
        name: "Login",
        data() {
            return {
                email: '',
                password: '',
                redirect: '',
                showLogin:false
            }
        },
        beforeCreate(){
            if(this.checkAuth){
                if(this.getUserType == 'admin' ){
                    var redirect = this.redirect || '/dashboard';
                    this.$router.push(redirect);

                } else if(this.getUserType == 'tenant' ){
                    var redirect = this.redirect || '/my-account';
                    this.$router.push(redirect);
                }
            }
        },
        created(){
            this.$nextTick(() => {
                this.showLogin = true;
            })
        },
        computed:{
            ...mapGetters({
                isAdmin: 'authenticationStore/isAdmin',
                checkAuth: 'authenticationStore/checkAuth',
            })
        },
        components: {
            Loader,
            Status
        },
        methods:{
            async authenticate(contact, token){
                var redirect = this.$route.query.redirect || '';

                this.$store.dispatch('authenticationStore/setAuthenticated', {
                    is_authenticated: true,
                    auth_token: token
                });

               // await this.$store.dispatch('authenticationStore/getLoggedInUser', true);
                if(contact.superadmin){
                  redirect = redirect || '/companies';
                   contact.role = 'admin'
                }else{
                  // redirect = 'onboarding';
                  // contact.role = 'cocoonadmin'
                  redirect = redirect || '/companies';
                  contact.role = 'agent'
                }    
                this.$store.dispatch('authenticationStore/setAdminType', contact.role);          
                
                this.$store.dispatch('authenticationStore/setUserData', { contact });

                this.errorClear(this.$options.name);

                await this.$router.push(redirect);

            },
            async login(){

                var contact = {};
                var token = '';
                var data = {
                    email: this.email,
                    password: this.password
                };

                let status = await this.validate(this);
                if(!status) return;
                let r = await api.post(this, api.LOGIN_URL, data, this.$options.name);
                contact = r.contact;
                token = r.token;
                await this.authenticate(contact, token);
            }

        }
    }

</script>
<style scoped>
  .login-box{
    position:absolute;
    top: 0;
    margin-top: 0;
    height: 100%;
    bottom: 0;
    padding: 50px;
    width: 450px;
    border-right: 1px solid #e2e2e2;
  }
  .login-box label{
    margin: 0;
  }
  .login-form{
    margin-top: -150px;
    top: 50%;
    display: block;
    position: absolute;
    margin-bottom: 0;
  }
</style>
