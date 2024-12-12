<template>
  <v-flex>
    <app-header @toggleDrawer="drawer = !drawer" />
    <v-flex class="platform-page" :class="{'has-drawer': drawer}">
        <slot />
    </v-flex>
  </v-flex>
</template>

<script>
import AppHeader from '../components/includes/AppHeader/index.vue';
import { mapGetters } from 'vuex';

export default {
  name: 'master-layout',
  data() {
      return {
          drawer: true,
      }
  },
  components: {
      AppHeader
  },
  computed:{
    ...mapGetters({
        isLoaded: 'isLoaded'
    })
  }
}
</script>
<style lang="scss" scoped>
.platform-page {
    padding: 60px 0 0 60px;
  background: #F9FAFB;
}
.has-drawer{
    padding-left: 370px;
}
</style>
