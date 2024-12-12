<template>
  <v-flex class="unauthenticated">
    <v-main>
        <slot />
    </v-main>
  </v-flex>
</template>

<script>

export default {
  name: 'unauthenticated-layout',
  data() {
      return {

      }
  },
  components: {

  },
  computed:{

  }
}
</script>
<style lang="scss" scoped>
  .page-wrap{
    background: #F9FAFB;
  }
</style>
