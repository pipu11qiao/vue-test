<template>
  <div class="box-box">
    <h1>{{msg}}</h1>
    <div class="option-box zest-box">
      <div class="option-view"></div>
    </div>
    <div class="option-box ca-box">
      <div class="option-view"></div>
    </div>
  </div>
</template>

<script>

  require('jquery');
  require('@/assets/js/lychee.js');
  require('jquery-mousewheel');
  require('malihu-custom-scrollbar-plugin');
  require('custom_option');

  require('@/../node_modules/option_prepare/dist/custom_option.min.css');
  require('@/../node_modules/malihu-custom-scrollbar-plugin/jquery.mCustomScrollbar.css');

//  console.log($.C_modal);

  export default {
    name: '',
    data() {
      return {
        msg: 'jQuery 依赖解决'
      }
    },
    mounted: function () {
      ;(function (window, $, document) {
        $.support.cros = true;
        var util = {};
        //网络工具
        util.network = {
          createParam: function createParam(cmd, subcmd, val) {
            return {
              cmd: cmd,
              subcmd: subcmd,
              val: val
            };
          },
          send_async: function send_async(p) {

            var param = new this.createParam(p.cmd, p.subcmd, p.val);
            var paramStr = JSON.stringify(param);

            //返回ajax对象
            return $.ajax({
              type: 'post',
              async: true,
              url: p.url,
              dataType: 'json',
              xhrFields: {withCredentials: true},
              crossDomain: true,
              data: {'input': paramStr},
              success: function success(data, textStatus, jqXHR) {
                p.cb(1, data);
              },
              error: function error(XMLHttpRequest, textStatus, errorThrown) {
                p.cb(0, textStatus);
              }
            });
          },
          send_sync: function send_sync(p) {

            var param = new this.createParam(p.cmd, p.subcmd, p.val);
            var paramStr = JSON.stringify(param);

            //返回ajax对象
            return $.ajax({
              type: 'post',
              async: false,
              url: p.url,
              dataType: 'json',
              data: {'input': paramStr},
              success: function success(data, textStatus, jqXHR) {
                p.cb(1, data);
              },
              error: function error(XMLHttpRequest, textStatus, errorThrown) {
                p.cb(0, textStatus);
              }
            });
          },
        };
        util.base64_decode =  function(str) {
          // @str base64 加密的数据
          let c1, c2, c3, c4;
          let base64DecodeChars = [
            -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
            -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
            -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63, 52, 53, 54, 55, 56, 57,
            58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6,
            7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
            25, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
            37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1,
            -1, -1
          ];
          let i = 0, len = str.length, string = '';

          while (i < len) {
            do {
              c1 = base64DecodeChars[str.charCodeAt(i++) & 0xff]
            } while (
              i < len && c1 == -1
              );

            if (c1 == -1) break;

            do {
              c2 = base64DecodeChars[str.charCodeAt(i++) & 0xff]
            } while (
              i < len && c2 == -1
              );

            if (c2 == -1) break;

            string += String.fromCharCode((c1 << 2) | ((c2 & 0x30) >> 4));

            do {
              c3 = str.charCodeAt(i++) & 0xff;
              if (c3 == 61)
                return string;

              c3 = base64DecodeChars[c3]
            } while (
              i < len && c3 == -1
              );

            if (c3 == -1) break;

            string += String.fromCharCode(((c2 & 0XF) << 4) | ((c3 & 0x3C) >> 2));

            do {
              c4 = str.charCodeAt(i++) & 0xff;
              if (c4 == 61) return string;
              c4 = base64DecodeChars[c4]
            } while (
              i < len && c4 == -1
              );

            if (c4 == -1) break;

            string += String.fromCharCode(((c3 & 0x03) << 6) | c4)
          }
          return string;
        },
        window.util = util;
      })(window, jQuery);
      ;(function ($, window, document, undefined) {
        //  服务器引擎

        //CA 服务器 对应的服务器是banana
        var BananaServer = function (url) {
          this.url = url;
        };
        BananaServer.prototype = {
          constructor: BananaServer,
          /**
           * 请求主数据
           * @param material_node_id
           * @param callbackFn(返回spu, sbom_node, material_node, sections, templates)
           */
          requestMainData: function (val, callbackFn) {
            return util.network.send_async({
              url: this.url,
              cmd: 'Cdesign',
              subcmd: 'design',
              val: val,
              cb: callbackFn
            });
          },
        };

        // ZEST 服务器
        var StrawberryServer = function (url) {
          this.url = url;
        };

        StrawberryServer.prototype = {
          constructor: StrawberryServer,
          /**
           * 请求主数据
           * @param val {pid: 'ZSF011',type: 'A',vcode: 'ZSF011-0000002'} 平台id 类型 v码
           * @param callbackFn(返回spu, sbom_node, material_node, sections, templates)
           */
          requestMainData: function (val, callbackFn) {
            return util.network.send_async({
              url: this.url,
              cmd: 'Zdesign',
              subcmd: 'designForSimple',
              val: val,
              cb: callbackFn
            });
          },
        };
        window.BananaServer = BananaServer;
        window.StrawberryServer = StrawberryServer;
      })(jQuery, window, document);
      (function ($, window, document, undefined) {
        // window.mk_jsLib = new DesignManager('ZEST');
        var defaultOptions = {
          brand: 'ca',//zest ca
          cssTheme: 'ZEST', //是ca
          dataTheme: 'ZEST', // 处理特殊数据用
          dataUrl:'',
          imgPrefix: '',
          mk_jsLib: null,
          serverObj: null,
          hasThumb: true,
          mainOptionNormalWidth: 90,// zest 0(线上) 或者 90(云设计)  ca 150(线上和云设计)
          subOptionWidth: 330, // Zest 330  Ca330
          // 获取请求的数据 this -> 当前UseOption实例
          getRequestData: function () {
          },
          // 成功后回调 this -> 当前UseOption实例
          successFun: function () {

          },
          // 用户点击选项的回调
          callback: function () {
            console.log('aaa');
          },
          // zest配置
          pid: 'ZSF011',
          type: 'A',
          vcode: '',
          // ca配置
          material_node_id: '58bfc65dc98ceab8688b45cf',
        };

        var UseOption = function (options) {
          this._$el = $(options.el); //.zest-box .ca-box
          this.setOptions(options);
          this._hasInit = false;
          this.optionView = null;
          this._$optionEl = null;
          this.update();

        };
        UseOption.prototype = {
          constructor: UseOption,
          setOptions: function (options) {
            this._options = $.extend({},defaultOptions,options);
          },
          getOptions: function () {
            return this._options;
          },
          updateOptins: function (options) {
            this._options = $.extend(this._options,options);
          },
          update: function(options){
            if(options){
              this.updateOptins(options);
            }
            var opts = this.getOptions();
            if(!this._hasInit){
              this._$optionEl = this._$el.find('.option-view');
              this.optionView = new $.C_modal.option.OptionView({
                el: this._$optionEl,
                mk_jsLib: opts.mk_jsLib,
                imgPrefix: opts.imgPrefix,
                dataTheme: opts.dataTheme,
                cssTheme: opts.cssTheme,
                mainOptionNormalWidth: opts.mainOptionNormalWidth,// zest 0(线上) 或者 90(云设计)  ca 150(线上和云设计)
                subOptionWidth: opts.subOptionWidth, // Zest 330  Ca330
                firstOpen: true,
              });
              this.bindEvent();
              this._hasInit = true;
            }
            this.getMainData();
          },
          getMainData: function () {
            var opts = this.getOptions();
            var requestData = opts.getRequestData.call(this);
            var me = this;
            opts.serverObj.requestMainData(requestData, function (resultNum, data) {
              opts.successFun.call(me,resultNum, data);
            })
          },
          bindEvent: function () {
            var opts = this.getOptions();
            this._$optionEl.on('select',function () {
              opts.callback(opts);
            });
          },
          // zest 方法
          typeConvert: function (pid, type) {

            // 平台只有A类型spu的
            var BChangeToA = [
              'ZSF011', 'ZSF021', 'ZSF031', 'ZSF041', 'ZSF051', 'ZSF061', 'ZSF071', 'ZSF081',
              'ZSF022', 'ZSF032', 'ZSF042', 'ZSF052', 'ZSF062',
              'ZCH011', 'ZCH021', 'ZCH031', 'ZCH041', 'ZCH051', 'ZCH061', 'ZCH071', 'ZCH081',
              'ZCH022', 'ZCH032', 'ZCH042', 'ZCH052', 'ZCH062',
              'ZAC011', 'ZAC021', 'ZDT021'
            ];
            // 平台只有B类型spu的
            var AChangeToB = [
              'ZBD001', 'ZBD002', 'ZBD003', 'ZBD004', 'ZCK011', 'ZCK012', 'ZCK021', 'ZCK022', 'ZCK031', 'ZCK032', 'ZCK041', 'ZDC011', 'ZDR011', 'ZDR021', 'ZDR031', 'ZEC011', 'ZEC021', 'ZMR010',
              'ZMR011', 'ZMR021', 'ZMR031', 'ZMR041', 'ZMR051', 'ZMR061', 'ZMR071', 'ZMR081', 'ZMR091',
              'ZNS011', 'ZNS021', 'ZVC011', 'ZCS011', 'ZDT011', 'ZDT012',
              'ZSS011', 'ZSS021', 'ZSS031', 'ZSS041', 'ZSS051', 'ZSS061', 'ZSS071'
            ];

            if (type === 'B' && $.inArray(pid, BChangeToA) > -1) {
              type = 'A';
            } else if (type === 'A' && $.inArray(pid, AChangeToB) > -1) {
              type = 'B';
            }
            if (type === 'D') {
              type = 'C';
            }
            return type;
          },
          convertRequestConfig: function () {
            var opts = this.getOptions();
            // 将页面中的config转换成用来的请求的config 类型转换  字段的更换
            var obj = {};
            obj.type = this.typeConvert(opts.pid, opts.type);
            obj.matid = opts.pid;
            obj.vcode = opts.vcode;
            return obj;
          },
        };
        var zestUrl = {
          dataUrl: 'http://capi.zeststore.com:81/api.php', //请求数据 换v码
          imgPrefix: 'http://cmrmsapi.zeststore.com:82/page/lemon/readFile/read/filename/',// 图片地址前缀
        };
         window.zestOption = new UseOption({
           el: $('.zest-box'),
           cssTheme: 'ZEST', //是ca
           dataTheme: 'ZEST', // 处理特殊数据用
           imgPrefix: zestUrl.imgPrefix,
           mk_jsLib: new DesignManager('ZEST'),
           serverObj: new StrawberryServer(zestUrl.dataUrl),
           // 获取请求的数据  opts 当前的opts this -> 当前UseOption实例
           getRequestData: function () {
             return this.convertRequestConfig();
           },
           // this -> userOption
           update: function () {

           },
           successFun: function (resultNum, data) {
             // debugger;
             var opts = this.getOptions();

             var mk_jsLib = opts.mk_jsLib;
             if (resultNum === 1 && data && (data.err === 200 || data.err === 0)) {
               data = JSON.parse(util.base64_decode(data.val));
               // console.log(data);
               mk_jsLib.setDesignType(this.convertRequestConfig().type); // 给lychee库传入类型
               mk_jsLib.initData(data);
               //  V码进来
               if(data.config){
                 mk_jsLib.setOrder(mk_jsLib.configToOrder(data.config));
               }
               // 选项数据
               var optionsData = mk_jsLib.getOptions();
               if (!optionsData || optionsData.length === 0) {
                 console.log('没有主数据');
                 return;
               }
               this.optionView.update({
                 theme: opts.dataTheme,
                 data: optionsData,
                 firstClick: true
               });
             }
           },
           // zest配置
           pid: 'ZCK031',
           type: 'A',
           callback: function (opts) {
             var mk_jsLib = opts.mk_jsLib;
             console.log(mk_jsLib.getOrderForRender());
             console.log(mk_jsLib.getOrderForRender_zest());
             console.log(mk_jsLib.Order);

             console.log('zest');
           }
         });

        var caUrl = {
          dataUrl: 'http://api.markordesign.com:81/api.php', //请求数据 换v码
          imgPrefix: 'http://cmrmsapi.zeststore.com:84/page/lemon/readFile/read/filename/',// 图片地址前缀
        };
        console.log($('.ca-box'));
//        window.caOption = new UseOption({
//          el: $('.ca-box'),
//          cssTheme: 'CA', //是ca
//          dataTheme: 'CA', // 处理特殊数据用
//          imgPrefix: zestUrl.imgPrefix,
//          mk_jsLib: new DesignManager('CA'),
//          serverObj:  new BananaServer(caUrl.dataUrl),
//          mainOptionNormalWidth: 150,// zest 0(线上) 或者 90(云设计)  ca 150(线上和云设计)
//          subOptionWidth: 330, // Zest 330  Ca330
//          hasCollect: false, //
//          // 获取请求的数据  opts 当前的opts this -> 当前UseOption实例
//          getRequestData: function () {
//            var opts = this.getOptions();
//            return {
//              material_node_id: opts.material_node_id,// 框架id
//              order_bom_id: ''// orderBom的id
//            };
//          },
//          // this -> userOption
//          update: function () {
//
//          },
//          successFun: function (resultNum, data) {
//            // debugger;
//            var opts = this.getOptions();
//            var mk_jsLib = opts.mk_jsLib;
//            if (resultNum === 1 && data && (data.err === 200 || data.err === 0)) {
//
//              mk_jsLib.initData(data.val);
//
//              // 选项数据
//              var optionsData = mk_jsLib.getOptions();
//              if (!optionsData || optionsData.length === 0) {
//                console.log('没有主数据');
//                return;
//              }
//              this.optionView.update({
//                theme: opts.dataTheme,
//                data: optionsData,
//                firstClick: true
//              });
//            }
//          },
//          // ca配置
//          material_node_id: '5a910b78e5285882268b467b',
//          callback: function (opts) {
//            var mk_jsLib = opts.mk_jsLib;
//            console.log('ca')
//          }
//        });
//

        // window.testZest = function (pid,type) {
        //
        //   if(pid && type){
        //     zestOption.update({
        //       pid:pid,
        //       type: type
        //     });
        //   }
        // };
        window.testCa = function (id) {
          caOption.update({
            material_node_id: '58bfc0edc98cea1b718b4971'
          });
        };
      })(jQuery, window, document);
    },
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

  html,body{
    width: 100%;
    height: 100%;
  }
  .option-box{
    position: relative;
    float: left;
    width: 49.9%;
    height: 100%;
  }
  .zest-box{
    background: #eaf6eb;
  }
  .ca-box{
    background: #ddc8c8;
  }
  .box-box {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
  right: 0;
    z-index: 100;;
    background: #42b983;
  }
</style>
