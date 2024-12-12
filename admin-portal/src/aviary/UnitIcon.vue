<template>
  <span>
    <span v-if="applyStroke == false">
      <svg
        v-if="unit_type == 'residential'"
        :width="width"
        :height="height"
        :style="{ marginBottom: marginBottom, verticalAlign: verticalAlign }"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        version="1.1"
      >
        <path
          d="M18,15H16V17H18M18,11H16V13H18M20,19H12V17H14V15H12V13H14V11H12V9H20M10,7H8V5H10M10,11H8V9H10M10,15H8V13H10M10,19H8V17H10M6,7H4V5H6M6,11H4V9H6M6,15H4V13H6M6,19H4V17H6M12,7V3H2V21H22V7H12Z"
          :fill="color"
        />
      </svg>
      <svg
        v-else-if="unit_type == 'storage'"
        :width="width"
        :height="height"
        :style="{ marginBottom: marginBottom, verticalAlign: verticalAlign }"
        viewBox="0 -4 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M1 0C0.447715 0 0 0.447716 0 1V17C0 17.5523 0.447716 18 1 18H3V8H15V18H17C17.5523 18 18 17.5523 18 17V1C18 0.447715 17.5523 0 17 0H1ZM6 2H12V4H6V2ZM5 10H13V12H5V10ZM13 14H5V16H13V14Z"
          :fill="color"
        />
      </svg>
      <svg
        v-else-if="unit_type == 'parking'"
        :style="{ marginBottom: marginBottom, verticalAlign: verticalAlign }"
        :width="width"
        :height="height"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        version="1.1"
      >
        <path
          d="M20 8H22V6L20 4H3A2 2 0 0 0 1 6V15A2 2 0 0 0 3 17H4A3 3 0 0 0 7 20A3 3 0 0 0 10 17H15A3 3 0 0 0 21 17H23V12M7 18.5A1.5 1.5 0 0 1 7 15.5A1.5 1.5 0 0 1 7 18.5M9 12H3V9H9M14 15H11V9H14M18 18.5A1.5 1.5 0 1 1 19.5 17A1.54 1.54 0 0 1 18 18.5M17 12V9.5H19.5L21.5 12Z"
          :fill="color"
        />
      </svg>
    </span>

    <span v-if="applyStroke == true">
      <svg
        v-if="unit_type == 'storage'"
        :width="width"
        :height="height"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="white"
          stroke="#DFE3E8"
          stroke-width="1.21053"
        />
        <path
          transform="translate(15, 15)"
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M1 0C0.447715 0 0 0.447716 0 1V17C0 17.5523 0.447716 18 1 18H3V8H15V18H17C17.5523 18 18 17.5523 18 17V1C18 0.447715 17.5523 0 17 0H1ZM6 2H12V4H6V2ZM5 10H13V12H5V10ZM13 14H5V16H13V14Z"
          :fill="color"
        />
      </svg>
      <svg
        v-else-if="unit_type == 'residential'"
        :width="width"
        :height="height"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="white"
          stroke="#DFE3E8"
          stroke-width="1.21053"
        />
        <path
          transform="translate(12, 12)"
          d="M18,15H16V17H18M18,11H16V13H18M20,19H12V17H14V15H12V13H14V11H12V9H20M10,7H8V5H10M10,11H8V9H10M10,15H8V13H10M10,19H8V17H10M6,7H4V5H6M6,11H4V9H6M6,15H4V13H6M6,19H4V17H6M12,7V3H2V21H22V7H12Z"
          :fill="color"
        />
      </svg>
      <svg
        v-else-if="unit_type == 'parking'"
        :width="width"
        :height="height"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="white"
          stroke="#DFE3E8"
          stroke-width="1.21053"
        />
        <path
          transform="translate(12, 12)"
          d="M20 8H22V6L20 4H3A2 2 0 0 0 1 6V15A2 2 0 0 0 3 17H4A3 3 0 0 0 7 20A3 3 0 0 0 10 17H15A3 3 0 0 0 21 17H23V12M7 18.5A1.5 1.5 0 0 1 7 15.5A1.5 1.5 0 0 1 7 18.5M9 12H3V9H9M14 15H11V9H14M18 18.5A1.5 1.5 0 1 1 19.5 17A1.54 1.54 0 0 1 18 18.5M17 12V9.5H19.5L21.5 12Z"
          :fill="color"
        />
      </svg>
    </span>
  </span>
</template>

<script type="text/babel">
export default {

  // todo register UnitIcon globally like we do for other aviary components, and rename to HbUnitIcon to match aviary naming structure
  name: "UnitIcon",
  data() {
    return {
      unit_type: "",
    };
  },
  created() {
    this.unit_type = this.unit && (this.unit.type || this.unit.unit_type);
  },
  props: {
    unit: {
      type: Object,
    },
    width: {
      type: String,
      default: 48,
    },
    height: {
      type: String,
      default: 48,
    },
    applyStroke: {
      type: Boolean,
      default: true,
    },
    color: {
        type: String,
        default: '#637381'
    },
    marginTop: {
        type: String,
        default: '0px'
    },
    marginBottom: {
        type: String,
        default: '0px'
    },
    verticalAlign: {
      type: String,
      default: 'baseline'
    }
  },
};
</script>

<style>
.center-vertical {
  vertical-align: middle;
}
</style>