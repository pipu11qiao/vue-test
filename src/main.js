// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import Vuex from 'vuex'

import 'es6-promise/auto'
// 全局组件
import globalComponents from './components/globalComponents'
Vue.use(globalComponents)
Vue.use(Vuex);

Vue.config.productionTip = false
Vue.directive('focus',{
  inserted(el){
    el.focus()
  }
})

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  components: { App },
  template: '<App/>'
})
