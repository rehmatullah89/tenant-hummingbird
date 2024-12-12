<template>

  <v-list-item :class="getItemClass(exists, error, data)">

    <v-list-item-avatar>
      <v-icon v-if="!exists">mdi-close-circle</v-icon>
      <v-icon class="text-danger" v-else-if="error">mdi-alert-circle</v-icon>
      <v-icon v-else-if="data" class="text-success" >mdi-check-circle</v-icon>
    </v-list-item-avatar>
    <v-list-item-content>
      <v-list-item-title>{{label}}</v-list-item-title>
      <v-list-item-subtitle v-if="message" >{{message}}</v-list-item-subtitle>
      <v-list-item-subtitle v-else-if="error">{{ error }}</v-list-item-subtitle>
      <v-list-item-subtitle v-else>
        <slot v-bind:data="data" >{{ data }}</slot>
      </v-list-item-subtitle>
    </v-list-item-content>
  </v-list-item>

</template>


<script type="text/babel">
    export default {
        name: "TriggerListItem",
        data() {
            return {}
        },
        props: ['exists', 'error', 'data', 'message', 'label'],
        methods: {
            getItemClass(exists, errors) {
                if (!exists) return 'disabled';
                // if (errors) return 'error';

            }
        }
    }
</script>


<style scoped>
  .v-list-item.disabled .v-avatar.v-list-item__avatar i {
    color: #e2e2e2;
  }
  .text-success{
    color:#4caf50;
  }
  .text-danger{
    color:#ff5252;
  }
  </style>
