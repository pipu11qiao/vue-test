<template>
  <div>
    <m-title title="ring pic"></m-title>
    <div class="pic-box"></div>
  </div>
</template>

<script>

  import RingPic from 'pipu-ringpic'
  let getImgArr = (path) => {
    let arr = [];
    let arrBig = [];
    // 23 - 0 47 - 24 71 - 48
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 24; r++) {
        arr.push(path + 'c' + ((c * 24) + (23 - r)) + '_l2_0_0.jpg')
        arrBig.push(path + 'c' + ((c * 24) + (23 - r)) + '_l1_0_0.jpg')
      }
    }
    return {
      s: arr,
      b: arrBig
    }
  }
  export default {
    data() {
      return {
      }
    },
    methods: {
    },
    mounted(){
      let picArr = getImgArr('/static/img/')
      let ringPic1 = new RingPic({
        el: document.querySelectorAll('.pic-box')[0],
        picArr: picArr.s,
        picArrBig: picArr.b,
        maxSize: 1,
        intervalX: 30,
        intervalY: 40
      });
    }
  }
</script>

<style lang="scss" scoped>

  .pic-box{
    width: 600px;
    height: 600px;
    margin: 0 auto;
  }
</style>

