<template>
  <v-flex>
    <app-navigation />
    <navigation />
    <v-flex class="platform-page" :class="{'has-drawer': drawer}">
        <slot />
    </v-flex>
  </v-flex>
</template>

<script>

import Navigation from '../components/includes/Navigation.vue';
import { mapGetters } from 'vuex';

export default {
  name: 'master-layout',
  data() {
      return {
          drawer: true,
      }
  },
  components: {

      Navigation
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
