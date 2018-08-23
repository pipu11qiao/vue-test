import Mock from 'mockjs'
let Random = Mock.Random
export default Mock.mock({
  'list|1-10':[()=>{
    return{
      'name': '创意设计方案',
      'imgSrc': Random.pick([
        'http://cmrmsapi.zeststore.com:82/page/lemon/readFile/read/filename/magic_p_s_201808131105407032532',
        'http://cmrmsapi.zeststore.com:82/page/lemon/readFile/read/filename/magic_p_s_201807121023576704249',
        'http://cmrmsapi.zeststore.com:82/page/lemon/readFile/read/filename/magic_p_s_201808091752327498560'
      ]),
      'panorama': Random.boolean(),
      'designer':Random.pick(['张三','李四','王五']),
      'count': Random.integer(1,5),
      'filter': ['#客厅','#简美'],
    }
  }]
});
