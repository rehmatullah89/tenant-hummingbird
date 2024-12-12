<template>
  <div>
    <div class="pl-4 pt-2 pb-4 pr-8" v-if="(!readModePresent || activeEditing) && hasPermissionToEdit">
      <slot name="editingMode"></slot>
    </div>

    <div @click="setActiveField" class="hb-form-editable pl-4 pr-4" v-if="(readModePresent && !activeEditing)">
      <v-hover v-slot:default="{hover}">
      <v-row>
        <v-col md="11">
          <slot name="readMode"></slot>
        </v-col>
        <v-col md="1" v-if="hover && hasPermissionToEdit">
          <v-tooltip bottom open-delay="750">
            <template v-slot:activator="{ on }">
              <v-hover v-slot:default="{tooltipHover}">
                <span v-on="on">
                  <hb-icon small :color="tooltipHover ? '#101318' : ''">mdi-pencil</hb-icon>
                </span>
              </v-hover>
            </template>
            <span>Edit</span>
          </v-tooltip>
        </v-col>
      </v-row>
      </v-hover>
    </div>

    <div class="mt-0 pl-4 pb-4" v-if="readModePresent && activeEditing && displayActionButtons && hasPermissionToEdit">
      <hb-btn color="primary" @click="save" :small="true"> {{ saveButtonText }} </hb-btn>
      <hb-link class="ml-2" @click="cancel" :small="true"> Cancel </hb-link>
    </div>
  </div>
</template>

<script type="text/babel">
import { EventBus } from '../../EventBus.js';

export default {
  name: "HoverableEditField",

  data() {
    return {
      readModePresent: false
    }
  },

  created() {
    this.readModePresent = this.$slots.readMode ? true : false;
  },

  methods: {
    setActiveField() {
      if(true) {
        EventBus.$emit('activeEdit', this.name);
      }
    },

    cancel() {
      EventBus.$emit('activeEdit', '');
    },

    save() {
      EventBus.$emit('saveData');
    }
  },

  props: {
    name: {
      type: String 
    },
    
    activeEditing: {
      type: Boolean,
      default: false
    },
    
    displayActionButtons: {
      type: Boolean,
      default: true
    },

    hasPermissionToEdit: {
      type: Boolean,
      default: false
    },

    saveButtonText: {
      type: String,
      default: 'Save'
    },
  },
};
</script>

<style>
</style>