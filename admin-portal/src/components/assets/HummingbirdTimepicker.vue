<template>
  <v-row>
    <v-col cols="12" class="pa-0">
      <v-menu
        ref="menu"
        v-model="menu2"
        :close-on-content-click="false"
        :nudge-right="40"
        :return-value.sync="time"
        transition="scale-transition"
        offset-y
      >
        <template v-slot:activator="{ on }">
          <v-text-field class="mt-0 pa-0"
            v-model="time"
            :label="label"
            :solo="defaultValue"
            hide-details="auto"
            flat
            readonly
            :error-messages="message"
            v-on="on"
            :class="{'pt-4 pr-3': auction}"
          >
            <template v-slot:prepend v-if="prepend_icon">
                <v-icon :class="[defaultValue === false ? 'pt-1': '']" color="#757575">access_time</v-icon>
            </template>
            <template v-slot:prepend-inner v-else>
                <v-icon >access_time</v-icon>
            </template>
          </v-text-field>
        </template>
        <v-time-picker
          v-if="menu2"
          v-model="time"
          @change="setValue"
          full-width
          @click:minute="$refs.menu.save(time)"
        ></v-time-picker>
      </v-menu>
    </v-col>
  </v-row>
</template>
<script>
  export default {
    props: ['value', 'message', 'label', 'solo', 'prepend_icon', 'auction', 'default_time'],
    data () {
      return {
        time: null,
        menu2: false,
        modal2: false,
      }
    },
    created() {
      if(this.default_time) {
        this.time = this.default_time;
      }
    },
    computed:{
      defaultValue () {
        if(this.solo === false) return this.solo;
        return true;
      },
    },
    methods:{
      setValue(value){
          this.$emit('input',value);
      }
    }
  }
</script>