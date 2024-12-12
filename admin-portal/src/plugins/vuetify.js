import Vue from 'vue';
import Vuetify from 'vuetify/lib';
import 'material-design-icons-iconfont/dist/material-design-icons.css'

import colors from 'vuetify/lib/util/colors'

Vue.use(Vuetify);
export default new Vuetify({
    theme: {
        themes: {
            light: {
                primary: "#00848E" ,
                secondary: "#123034",
                accent: colors.indigo.base,
                header: "#123034",
            },
        },
    },
    icons: {
        iconfont: 'md',
    }
});
