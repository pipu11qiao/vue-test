import Vue from 'vue'
import Router from 'vue-router'
import HelloWorld from '@/components/HelloWorld'
import test from './test'

Vue.use(Router)

export default new Router({
  mode: 'history',
  routes: [
    ...test
  ]
})
