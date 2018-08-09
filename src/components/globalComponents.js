let Components = {
  mTitle: () => import('./global/mTitle.vue')
}
export default {
  install(Vue){
    for(let key in Components){
      Vue.component(key.replace(/[A-Z]/g,U => '-' + U.toLowerCase()),Components[key])
    }
  }
}