<template>

  <v-progress-circular
    class="async-loader"
    :rotate="-90"
    size="100"
    :width="2"
    indeterminate
    color="primary"
  >
    Loading...
  </v-progress-circular>
</template>

<script>
    export default {
      name: 'master-layout',
      data() {
        return {
        }
      }
    }
</script>
<style scoped>

  .async-loader{
    position: absolute;
    top: 50%;
    left: 50%;
    -ms-transform: translateX(-50%) translateY(-50%);
    -webkit-transform: translate(-50%,-50%);
    transform: translate(-50%,-50%);
  }
</style>
