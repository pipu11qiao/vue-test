

;(function(factory){
  if(typeof define==="function" && define.amd){
    define(["jquery"],factory);
  }else if(typeof module!=="undefined" && module.exports){
    module.exports=factory;
  }else{
    factory(jQuery,window,document);
  }
}(function(jQuery){


// 封装的集体性操作
  ;(function ($, window, document, undefined) {
    var mk = {};
    window.mk = mk;

    // 参数类
    mk.Param = function (_cmd, _subcmd, _val) {
      this.cmd = _cmd;
      this.subcmd = _subcmd;
      this.val = _val;
    };

    // 网络请求回调函数
    mk.callback = function (_success, _data, _callback) {
      if (_success) {
        if (_data.err == 200 || _data.err == 0) {
          _callback(1, _data.val);

        } else {
          _callback(0, _data.errmsg);
        }

      } else {
        _callback(0, '网络请求失败');
      }
    };

    /*
       * 专门处理网络请求的对象(工具类)
       */
    mk.httpTool = {
      // 发送同步请求
      send_sync: function (_url, _param, _callback) { // 参数为: 请求地址url, 请求参数, 回调函数
        var paramStr = JSON.stringify(_param);
        $.ajax({
          type: 'post',
          async: false,
          url: _url,
          dataType: 'json',
          // contentType:'application/json;charset=utf-8',
          data: {'input': paramStr},

          success: function (data) {
            mk.callback(1, data, _callback);
          },
          error: function (data) {
            mk.callback(0, data, _callback);
          }
        });
      },

      // 发送异步请求
      send_async: function (_url, _param, _callback) {    // 参数为: 请求地址url, 请求参数, 回调函数
        var paramStr = JSON.stringify(_param);
        $.ajax({
          type: 'post',
          async: true,
          // xhrFields: {withCredentials: true},
          crossDomain: true,  // 处理跨域
          url: _url,
          dataType: 'json',
          data: {'input': paramStr},

          success: function (data) {
            mk.callback(1, data, _callback);
          },
          error: function (data) {
            mk.callback(0, data, _callback);
          }
        });
      }
    };
  })(jQuery, window, document);
  /**
   * 打印调试方法
   */
  ;(function (window, document, undefined) {
    window.mklog = function () {    // 打印
      console.log.apply(window.console, arguments);
    };
    window.mkwarning = function () {    // 警告
      console.warn.apply(window.console, arguments);
    };
    window.mkerror = function () {  // 报错
      console.error.apply(window.console, arguments);
    };
  })(window, document);


  /**
   * 定制页面管理者(数据相关)
   */
  ;(function ($, window, document, undefined) {

    /**
     * 构造函数
     * @constructor
     */
    function DesignManager(url, project, id, callbackFn) {
      this.url = url;
      this.init(project); // 初始化变量
      if (id) {
        this.requestMainData(id, callbackFn);   // 请求主数据
      }
    }

    /**
     * 请求主数据
     */
    DesignManager.prototype.requestMainData = function (id, callbackFn) {
      var cmd = 'hickorycommon',
        subcmd,
        val;
      if (this.Project == 'CA' || this.Project == 'ZEST') {
        subcmd = 'getWebSpuInfo';
        val = {
          "spu_id": id
        };

      } else {
        subcmd = 'getWebSkuInfo';
        val = {
          "sku_id": id
        };
      }
      var param = new mk.Param(cmd, subcmd, val);
      var url = this.url;
      var _this = this;
      mk.httpTool.send_async(url, param, function (success, data) {
        console.log(success, data);
        if (success) {
          _this.initData(data);
          callbackFn(success);

        } else {
          callbackFn(success);
        }
      });
    };

    /**
     * 初始化
     */
    DesignManager.prototype.init = function (project) {
      this.Project = project; // 项目: CA / ZEST

      this.Spu = {};
      this.Sbom = {};
      this.SectionMap = {};
      this.TemplateMap = {};
      this.MaterialNodeMap = {};

      this.Hash_Bom = {}; // bom_node.tree 拍平
      this.Hash_Options = {}; // spu.options 拍平
      this.Hash_WebView = {}; // spu.web_view 拍平

      this.Order_Default = {};    // 默认订单
      this.Order = {};

      this.OptionSort = [];   // 主选项排序

      // 函数链拓展
      this.init_logic();
      if (this.Project == 'CA') {
        this.init_ca();
      } else if (this.Project == 'ZEST') {
        this.init_zest();
      }else if (this.Project == 'SKU') {
        this.init_sku();
      }
    };

    /**
     * 初始化数据
     */
    DesignManager.prototype.initData = function (data) {
      mklog(data);

      this.init(this.Project);

      if (this.Project == 'SKU') {
        this.initData_sku(data);
        return;
      }

      // 建立 section 字典
      this.setupSectionMap(data.section);
      // 建立 template 字典
      this.setupTemplateMap(data.template);
      // 建立素材列表
      this.setupMaterialNodeMap(data.materialNode);

      // 处理Spu数据
      this.Spu = data.spu;
      this.spu_coverOptions();    // 生成 Hash_Options
      this.spu_coverWebView();    // 生成 Hash_WebView

      // 处理Sbom数据
      this.Sbom = data.bomNode;
      this.coverSbom();   // 生成Hash_Bom

      // 函数链拓展
      if (this.Project == 'CA') {
        this.initData_ca();
      } else if (this.Project == 'ZEST') {
        this.initData_zest(data);
      }

      // 初始化默认订单
      this.initDefaultOrder();
    };

    /**
     * 建立section字典
     * @param sections
     */
    DesignManager.prototype.setupSectionMap = function (sections) {
      for (var k in sections) {
        var section = sections[k];
        this.SectionMap[section._id.$id] = section.identify;
      }
      // mklog(JSON.stringify(this.SectionMap));
    };

    /**
     * 获得section的标识符
     * @param id
     * @returns string
     */
    DesignManager.prototype.getSectionIdentifyById = function (id) {
      var identify = this.SectionMap[id];
      if (identify) {
        return identify;
      } else {
        mkwarning('没有找到该 section : ' + id);
        return '';
      }
    };

    /**
     * 建立template字典
     * @param templates
     */
    DesignManager.prototype.setupTemplateMap = function (templates) {
      for (var k in templates) {
        var template = templates[k];
        this.TemplateMap[template._id.$id] = template.identify;
      }
      // mklog(JSON.stringify(this.TemplateMap));
    };

    /**
     * 获得template的标识符
     * @param id
     * @returns string
     */
    DesignManager.prototype.getTemplateIdentifyById = function (id) {
      var identify = this.TemplateMap[id];
      if (identify) {
        return identify;
      } else {
        mkwarning('没有找到该 template : ' + id);
        return '';
      }
    };

    /**
     * 建立素材列表
     * @param materialNodes
     */
    DesignManager.prototype.setupMaterialNodeMap = function (materialNodes) {
      for (var k in materialNodes) {
        var materialNode = materialNodes[k];
        this.MaterialNodeMap[materialNode._id.$id] = materialNode;
      }
    };

    /**
     * 通过 material_node_id 获得 material_node 节点
     * @param materialNodeId
     */
    DesignManager.prototype.getMaterialNodeById = function (id) {
      var material_node = this.MaterialNodeMap[id];
      if (material_node) {
        return  material_node;
      } else {
        mkwarning('找不到该 material_node : ' + id);
        return null;
      }
    };

    /**
     * 遍历spu中的options, 生成 Hash_Options
     */
    DesignManager.prototype.spu_coverOptions = function () {
      for (var k in this.Spu.options) {
        this.spu_coverOptionNode(this.Spu.options[k]);
      }
    };
    DesignManager.prototype.spu_coverOptionNode = function (node) {
      this.Hash_Options[node.nodeid] = node;
      if (node.items) {
        for(var k in node.items) {
          this.spu_coverOptionNode(node.items[k]);
        }
      }
    };

    /**
     * 遍历spu中的web_view, 生成 Hash_WebView
     */
    DesignManager.prototype.spu_coverWebView = function () {
      for (var k in this.Spu.web_view) {
        this.spu_coverWebViewNode(this.Spu.web_view[k]);
      }
    };
    DesignManager.prototype.spu_coverWebViewNode = function (node) {
      if (node.option_id) {
        this.Hash_WebView[node.option_id] = node;
      }
      if(node.items) {
        for(var k in node.items) {
          this.spu_coverWebViewNode(node.items[k]);
        }
      }
    };

    /**
     * 遍历Sbom(目的:生成Hash_Bom)
     */
    DesignManager.prototype.coverSbom = function () {
      for (var k in this.Sbom) {
        var bomNode = this.Sbom[k];
        for (var key in bomNode.tree) {
          this.coverBomNode(bomNode.tree[key]);
        }
      }
    };

    /**
     * 遍历bom_node(目的:生成Hash_Bom)
     * @param node
     * @param pid 父节点id
     */
    DesignManager.prototype.coverBomNode = function (node, pid) {
      this.Hash_Bom[node.id] = node;
      if (pid)    node.pid = pid;

      switch (node.type){
        case 'group' :
        case 'select' :
          for (var key in node.items) {
            var item = node.items[key];
            this.coverBomNode(item, node.id);
          }
          break;

        case 'pack' :
          // 取出该节点的choose_item_flag值, 若为Y,则可传递自己的id为pid
          if (node.choose_item_flag && node.choose_item_flag == 'Y') {
            pid = node.id;
          }
          for (var key in node.items) {
            var item = node.items[key];
            this.coverBomNode(item, pid);
          }
          break;

        case 'bool' :
          break;

        case 'node' :
          break;

        default:
          break;
      }
    };

    /**
     * 获取选项(前端用)
     * @returns {Array}
     */
    DesignManager.prototype.getOptions = function () {
      var options = [];
      this.spu_getOptions(this.Spu.web_view, options);

      // 记录选项排序
      this.OptionSort = [];
      for (var k in options) {
        var option = options[k];
        this.OptionSort.push(option.option_id);
      }
      mklog('-------- getOptions --------');
      mklog(options);
      return options;
    };
    DesignManager.prototype.spu_getOptions = function (items, options) {
      for (var k in items) {
        var option = items[k];

        if (option.enable == false) continue;   // 如果选项被禁用, 直接跳过

        // 把每一个select节点都对应上,获取option_id
        if (option.mapid) {
          var spu_option = this.Spu.options[option.mapid];
          if (spu_option) {
            option.option_id = spu_option.nodeid;
          }
        }

        // 给spu.options中的子选项赋值option_id
        if (option.nodeid) {
          option.option_id = option.nodeid;
          var node = this.getNodeById(option.nodeid);
          var picture = this.getSectionVal(node, 'PREVIEW_PICTURE');
          if (picture) {
            option.icon = picture.src_file;
          }
        }

        // 如果有items, 就继续递归遍历
        if (option.items && !this.isEmptyObject(option.items)) {
          var sub_options = [];
          this.spu_getOptions(option.items, sub_options);
          option.items = sub_options;

        } else {    // 如果没有items, 说明来到最后一层
          // 如果mapid有值
          if (option.mapid && option.node_type != 'node') {
            var spu_option = this.Spu.options[option.mapid];
            var sub_options = [];
            this.spu_getOptions(spu_option.items, sub_options);
            option.items = sub_options;
          }
        }
        options.push(option);
      }
      options.sort(function (option1, option2) {
        if (!option1.option_index)  option1.option_index = 1000;    // 如果选项排序值为空, 则默认为1000(满足指定个别几个选项为1,2,3的需求)
        if (!option2.option_index)  option2.option_index = 1000;
        return (option1.option_index - option2.option_index);
      });
    };

    /**
     * 初始化默认订单
     */
    DesignManager.prototype.initDefaultOrder = function () {
      for (var k in this.Spu.options) {
        var option = this.Spu.options[k];
        if (!option.default_selected)    continue;   // 如果该选项没有默认子选项, 则订单不处理它

        for (var key in option.items) {
          var item = option.items[key];
          if (item.nodeid == option.default_selected) {
            this.Order_Default[option.nodeid] = item.nodeid;
            break;
          }
        }
      }
      this.setOrder(this.Order_Default);  // 设置Order为默认Order
    };

    /**
     * 设置订单
     * @param order
     */
    DesignManager.prototype.setOrder = function (order) {
      this.Order = this.deepCopy(order);

      if (this.Project == 'CA') {

      } else if (this.Project == 'ZEST') {
        this.setOrder_zest();
      }
    };

    /**
     * 检查选项是否在订单中
     * @param optionId
     * @returns {boolean}
     */
    DesignManager.prototype.isInOrder = function (optionId) {
      for (var key in this.Order) {
        if (key == optionId || this.Order[key] == optionId) {
          return true;
        }
      }
      return false;
    };

    // ========================================================= 获取数据

    /**
     * 获得节点对象
     * @param nodeId
     * @returns {*}
     */
    DesignManager.prototype.getNodeById = function (nodeId) {
      var node = this.Hash_Bom[nodeId];
      if (node)   return node;    // 如果Hash_Bom键中存在这个id,则直接返回该node

      mkwarning('获得节点对象node失败 : ' + nodeId);
      return null;
    };

    /**
     * 获取父节点id
     * @param nodeId
     * @returns {*}
     */
    DesignManager.prototype.getParentNodeId = function (nodeId) {
      var node = this.getNodeById(nodeId);

      if (node)   return node.pid;
      return '';
    };

    /**
     * 获得父节点(非pack节点)
     * @param nodeId
     * @returns {*}
     */
    DesignManager.prototype.getParentNode = function (nodeId) {
      var parentNodeId = this.getParentNodeId(nodeId);
      var parentNode = this.getNodeById(parentNodeId);

      if (parentNode) return parentNode;
      return null;
    };

    /**
     * 从节点中获取数据
     * @param node
     * @param identify
     * @returns {*}
     */
    DesignManager.prototype.getSectionVal = function (node, identify) {
      // 优先在material_node中找
      var val = this.getSectionValFromMaterialNode(node.material_node_id.$id, identify);
      if (val)    return val;

      for (var i in node.sections) {  // 遍历该node节点下的sections
        var bom_section = node.sections[i];   // 取出当前实际 section
        var sectionIdentify = this.getSectionIdentifyById(bom_section.sectionid.$id);

        if(sectionIdentify == identify) {
          val = bom_section.val;
          if (identify == 'APPLY_PICTURE') {
            if (bom_section.val.tag == 'small') {
              val = bom_section.val;
              break;
            }
          } else {
            break;
          }
        }
      }

      if (!val) {
        mkwarning('getSectionValByNode - 没找到', node, identify);
      }
      return val;
    };

    /**
     * 从material_node中获取数据
     * @param materialNodeId
     * @param identify
     * @returns {*}
     */
    DesignManager.prototype.getSectionValFromMaterialNode = function (materialNodeId, identify) {
      var material_node = this.getMaterialNodeById(materialNodeId);   // 获得该 material_node
      if (!material_node) {   // 容错处理
        mkwarning('没找到该material_node : ' + materialNodeId);
        return null;
      }

      var val = null;
      for (var i in material_node.sections) { // 遍历该node节点下的sections
        var material_section = material_node.sections[i];   // 取出当前实际 section
        var sectionIdentify = this.getSectionIdentifyById(material_section.sectionid.$id);

        if(sectionIdentify == identify) {
          val = material_section.val;
          if (identify == 'APPLY_PICTURE') {
            if (material_section.val.tag == 'small') {
              val = material_section.val;
              break;
            }
          } else {
            break;
          }
        }
      }

      if (!val) {
        mkwarning('getSectionValFromMaterialNode 找不到该section数据 : ', materialNodeId, identify);
      }
      return val;
    };


    window.DesignManager = DesignManager;
  })(jQuery, window, document);

  /**
   * 定制页面管理者(逻辑相关)
   */
  ;(function ($, window, document, DesignManager_data, undefined) {
    function DesignManager() {}
    DesignManager.prototype = DesignManager_data.prototype;

    /**
     * 初始化(logic相关)
     */
    DesignManager.prototype.init_logic = function () {
      this.OptionRepelCount = {}; // 选项排斥字典
      this.ClothCoverDict = {};   // 面料影响字典
      this.Order_bak = {};    // 订单备份(向上递归用)

      this.Price = 0;
    };

    // ####################### GET 方法 #######################

    /**
     * 获取3D素材列表
     */
    DesignManager.prototype.get3dMaterialList = function () {
      var materialList = {};
      if (this.Project == 'CA') {
        materialList = this.get3dMaterialList_ca();

      } else if (this.Project == 'ZEST') {
        materialList = this.get3dMaterialList_zest();

      } else if (this.Project == 'SKU') {
        materialList = this.get3dMaterialList_sku();
      }
      return materialList;
    };
    /**
     * 获取价格
     */
    DesignManager.prototype.getPrice = function () {
      var price = 0;
      if (this.Project == 'CA') {
        price = this.getPrice_ca();

      } else if (this.Project == 'ZEST') {
        price = this.getPrice_zest();
      }
      return price;
    };

    /**
     * 获取优惠价
     */
    DesignManager.prototype.getDiscountPrice = function () {
      var discountPrice = -1;
      if (this.Project == 'CA') {

      } else if (this.Project == 'ZEST') {
        discountPrice = this.getDiscountPrice_zest();
      }
      return discountPrice;
    };

    /**
     * 获取尺寸
     */
    DesignManager.prototype.getSize = function () {
      var size = '';
      if (this.Project == 'CA') {

      } else if (this.Project == 'ZEST') {
        size = this.getSize_zest();
      }
      return size;
    };

    /**
     * 获取换取渲染图的Order
     */
    DesignManager.prototype.getOrderForRender = function () {
      var order_render = {};
      if (this.Project == 'CA') {
        order_render = this.Order;
      } else if (this.Project == 'ZEST') {
        order_render = this.getOrderForRender_zest();
      }
      return order_render;
    };

    /**
     * 获取 disabled 的选项
     */
    DesignManager.prototype.getDisabledOptions = function () {
      var disabledOptions = {};
      if (this.Project == 'CA') {

      } else if (this.Project == 'ZEST') {
        disabledOptions = this.getDisabledOptions_zest();
      }
      return disabledOptions;
    };


    // ########################## 选中选项 ##########################

    /**
     * 选中选项
     * @param option_id
     */
    DesignManager.prototype.selectedOptionByOptionId = function (option_id) {
      if (this.isInOrder(option_id))   return;    // 如果该选项已经在订单中, 直接返回

      if (this.Project == 'CA') {
        this.selectedOption(option_id); // 选中选项

      } else if (this.Project == 'ZEST') {
        this.selectedOptionByOptionId_zest(option_id);
      }
    };

    // ########################## 选中选项逻辑 ##########################
    /**
     * 选中选项
     * @param option_id
     */
    DesignManager.prototype.selectedOption = function (option_id) {
      var node = this.getNodeById(option_id);
      if (node.type != 'node')    return; // 如果不是实际选项节点(node节点), 不做处理, 直接返回

      // 来到这, 说明选中了node节点(实际选项)
      this.Order_bak = {};    // 清空订单备份(向上递归用)
      this.findParentNodeInOrder(node);
    };

    /**
     * 递归查找父节点, 直到找到存在于订单中的最近父节点
     */
    DesignManager.prototype.findParentNodeInOrder = function (node) {
      var parentNode = this.getParentNode(node.id);
      if (!parentNode)    return;

      this.Order_bak[parentNode.id] = node.id;    // 先把这个配置关系保存起来(不管是group还是select, select用到就取)

      // 如果这个父节点在订单中找到了
      if(this.isInOrder(parentNode.id)) {
        var preSelectedNodeId = this.Order[parentNode.id];  // 取出这个父节点之前选中的子节点
        if (preSelectedNodeId != node.id) { // 一般是不等于, 此处只是为了处理严谨
          // 在订单中移除之前选项及其子选项(如果有的话)
          var preSelectedNode = this.getNodeById(preSelectedNodeId);
          this.removeOptionFromTheOrder(preSelectedNode, parentNode);

          // 把新的选项及其子选项(如果有的话)添加到订单中
          this.addOptionToTheOrder(node, parentNode);
        }

      } else {    // 没找到, 继续递归
        this.findParentNodeInOrder(parentNode);
      }
    };

    /**
     * 从订单中移除选项及其子选项(如果有的话)
     */
    DesignManager.prototype.removeOptionFromTheOrder = function (node, parentNode) {
      // 如果没传入父节点, 查找父节点
      if (!parentNode)    parentNode = this.getParentNode(node.id);

      // 如果有父节点且父节点是select
      if (parentNode && parentNode.type == 'select') {

        var selectedChildId = this.Order[parentNode.id];
        if (selectedChildId && selectedChildId == node.id) {
          // 从订单中删除该选项映射关系
          delete this.Order[parentNode.id];
          // 移除相关
          delete this.ClothCoverDict[parentNode.id];
          delete this.ClothCoverDict[node.id];
        }

        // 移除选项OD关系(如果有的话)
        for (var key in parentNode.sections) {
          var bomSection = parentNode.sections[key];
          if (!bomSection.val.child)  continue;   // 如果此section没有child值, 则不属于ODsection,直接跳过
          if (bomSection.val.child != node.id)    continue;   // 如果此ODsection的关联child不等于先前选中项, 直接跳过

          // 能来到这,说明是关联 先前选中项 的OD关系
          var identify = this.getSectionIdentifyById(bomSection.sectionid.$id);
          if (identify == 'OPTION_OD') {  // 如果是选项OD(可选/不可选)
            var affect_option = bomSection.val.dest_option; // 取得影响的节点(select或bool)
            var affect_items = bomSection.val.dest_items;   // 影响节点下的选项值
            var affect_type = bomSection.val.type;

            this.removeAffectOfOptionOD(affect_option, affect_items, affect_type);

          } else if (identify == 'NODE_OD') { // 如果是节点OD(依赖/排除)
            var affect_nodes = bomSection.val.dest_nodes;    // 取得影响的节点
            var affect_type = bomSection.val.type;

            this.removeAffectOfNodeOD(affect_nodes, affect_type);
          }
        }
      }

      // 递归处理
      switch (node.type) {
        case 'group':
          for (var k in node.items) {
            var item = node.items[k];
            this.removeOptionFromTheOrder(item, node);
          }
          break;

        case 'select':
          var selectedNodeId = this.Order[node.id];
          for (var k in node.items) {
            var item = node.items[k];
            if (item.id == selectedNodeId) {
              this.removeOptionFromTheOrder(item, node);
              break;
            }
          }
          break;

        default:
          break;
      }
    };

    /**
     * 把选项及其子选项(如果有的话)添加到订单中
     */
    DesignManager.prototype.addOptionToTheOrder = function (node, parentNode) {
      // 如果没传入父节点, 查找父节点
      if (!parentNode)    parentNode = this.getParentNode(node.id);

      // 如果有父节点且父节点是select节点
      if (parentNode && parentNode.type == 'select') {
        this.Order[parentNode.id] = node.id;    // 添加该选项映射关系到订单

        // 添加选项OD关系(如果有的话)
        for (var key in parentNode.sections) {   // 查看父节点下是否包含OD关系的section
          var bomSection = parentNode.sections[key];

          // 如果此section没有child且没有dest_nodes, 则不属于影响的section, 直接跳过
          if (!bomSection.val.child && !bomSection.val.dest_nodes)    continue;
          // 如果此section的关联child不等于当前, 直接跳过
          if (bomSection.val.child && bomSection.val.child != node.id)    continue;

          // 能来到这,说明是关联当前node的影响关系section
          var identify = this.getSectionIdentifyById(bomSection.sectionid.$id);

          if (identify == 'NODE_OD') {    // 节点OD(排除/依赖)
            var affect_nodes = bomSection.val.dest_nodes;   // 影响的节点
            var affect_type = bomSection.val.type;  // 影响类型

            this.addAffectOfNodeOD(affect_nodes, affect_type);

          } else if (identify == 'OPTION_OD') {   // 选项OD(可选/不可选)
            var affect_option = bomSection.val.dest_option; // 影响的节点
            var affect_items = bomSection.val.dest_items;   // 影响节点下的选项值
            var affect_type = bomSection.val.type;  // 影响类型

            this.addAffectOfOptionOD(affect_option, affect_items, affect_type);

          } else if (identify == 'CA_CLOTH_COVER_AFFECT') {   // 面料影响
            var affect_nodes = bomSection.val.dest_nodes;   // 影响的节点
            var material_node_id = node.material_node_id.$id;   // 获取当前选项值的物料编码
            this.ClothCoverDict[parentNode.id] = material_node_id;  // 添加进 同面料不加价 的字典里

            this.addAffectOfClothCover(affect_nodes, material_node_id);
          }
        }
      }

      // 递归处理
      switch (node.type) {
        case 'group':
          for (var k in node.items) {
            var item = node.items[k];
            this.addOptionToTheOrder(item, node);
          }
          break;

        case 'select':
          // 优先取Order中的子选项(比如由OD带出的)
          var selectedNodeId = this.Order[node.id];
          // 如果为空, 取Order_bak里的子选项
          if (!selectedNodeId)    selectedNodeId = this.Order_bak[node.id];
          // 如果为空, 再取bom节点中指定的子选项
          if (!selectedNodeId) {
            //
          }
          // 如果还为空, 默认取第一个选项
          if (!selectedNodeId) {
            for (var k in node.items) {
              var item = node.items[k];
              selectedNodeId = item.id;
              break;
            }
          }

          for (var k in node.items) {
            var item = node.items[k];
            if (item.id == selectedNodeId) {
              this.addOptionToTheOrder(item, node);
              break;
            }
          }
          break;

        default:
          break;
      }
    };

    // ############################ 处理OD关系 ############################
    // ======================= 添加本次OD影响 =======================
    /**
     * OPTION_OD - 选项OD(可选/不可选)
     */
    DesignManager.prototype.addAffectOfOptionOD = function (affectOption, affectItems, affectType) {
      var affectNode = this.getNodeById(affectOption);
      var affectItemArray = affectItems.split(',');

      var oppositeType = (affectType == '0') ? '1' : '0'; // 相反类型
      for (var k in affectNode.items) {
        var item = affectNode.items[k];
        var inOption = false;   // 在影响选项里
        for (var i in affectItemArray) {    // arr.indexOf()这种写法在有些浏览器(有些IE版本)不支持
          var affectItemId = affectItemArray[i];
          if (item.id == affectItemId) {
            inOption = true;
            this.addAffectOfOptionODByNodeId(item.id, affectType);
            break;  // 跳出里层循环
          }
        }
        if (!inOption) { // 如果不在, 按反集处理
          this.addAffectOfOptionODByNodeId(item.id, oppositeType);
        }
      }
    };
    // 传入影响的节点ID, type
    DesignManager.prototype.addAffectOfOptionODByNodeId = function (affectNodeId, affectType) {
      if (affectType == '0') {    // 不可选
        // 排斥这个节点, 使不可选
        if (this.OptionRepelCount[affectNodeId]) {
          this.OptionRepelCount[affectNodeId]++;
        } else {
          this.OptionRepelCount[affectNodeId] = 1;
        }
      } else {  // 可选

      }
    };

    /**
     * 节点 排除/依赖(相当于选择和取消选择)
     * @param affectNodes
     * @param affectType
     */
    DesignManager.prototype.addAffectOfNodeOD = function (affectNodes, affectType) {
      var affectNodeArray = affectNodes.split(',');
      for (var i in affectNodeArray) {
        var affectNodeId = affectNodeArray[i];
        this.addAffectOfNodeODByNodeId(affectNodeId, affectType);
      }
    };
    DesignManager.prototype.addAffectOfNodeODByNodeId = function (affectNodeId, affectType) {
      var affectNode = this.getNodeById(affectNodeId);
      var parentNode = this.getParentNode(affectNodeId);

      if (affectType == '1') {    // 依赖
        this.addOptionToTheOrder(affectNode, parentNode);   // 添加选项进订单

      } else {    // 排除
        // 1. 排斥这个节点, 使不可选
        if (this.OptionRepelCount[affectNodeId]) {
          this.OptionRepelCount[affectNodeId]++;
        } else {
          this.OptionRepelCount[affectNodeId] = 1;
        }

        // 2. 从订单中移除该选项
        this.removeOptionFromTheOrder(affectNode, parentNode);
      }
    };

    // ======================== 移除(上一次选项的)OD影响 ========================
    /**
     * 移除 OPTION_OD 影响 (可选/不可选)
     * @param affectOption
     * @param affectItems
     * @param affectType
     */
    DesignManager.prototype.removeAffectOfOptionOD = function (affectOption, affectItems, affectType) {
      var affectItemArray = affectItems.split(',');
      if (affectType == '0') {   // 如果上一次影响 不可选, 就取消这次排斥关系
        for (var k in affectItemArray) {
          var affectNodeId = affectItemArray[k];
          if (this.OptionRepelCount[affectNodeId]) {
            this.OptionRepelCount[affectNodeId]--;
          }
        }
      } else {    // // 如果上一次影响 可选(其他子节点不可选)
        var parentNode = this.getNodeById(affectOption);  // 找到父节点, 反选
        for (var k in parentNode.items) {
          var item = parentNode.items[k];
          var effective = false;  // 默认无效
          for (var i in affectItemArray) {    // array.indexOf(obj)在某些浏览器(早期的IE)中不支持
            if (item.id == affectItemArray[i]) { // 如果在有效节点里
              effective = true;
              break;
            }
          }
          if (effective)   continue; // 如果是可选节点, 跳过, 执行下一个

          // 如果不可选节点
          if (this.OptionRepelCount[item.id]) {
            this.OptionRepelCount[item.id]--;
          }
        }
      }
    };

    /**
     * 移除影响 - NODEOD (选项 依赖/排除)
     * @param affectNodes
     * @param affectType
     */
    DesignManager.prototype.removeAffectOfNodeOD = function (affectNodes, affectType) {
      var affectNodeArray = affectNodes.split(',');
      for (var key in affectNodeArray) {
        var affectNodeId = affectNodeArray[key];
        this.removeAffectOfNodeODByNodeId(affectNodeId, affectType);
      }
    };
    DesignManager.prototype.removeAffectOfNodeODByNodeId = function (affectNodeId, affectType) {
      if (affectType == '1') {    // 如果上一次依赖加载, 就移除这个节点
        var affectNode = this.getNodeById(affectNodeId);
        var parentNode = this.getParentNode(affectNodeId);
        this.removeOptionFromTheOrder(affectNode, parentNode);

      } else {    // 如果上一次排斥这个节点, 就取消排斥
        if (this.OptionRepelCount[affectNodeId]) {
          this.OptionRepelCount[affectNodeId]--;
        }
      }
    };

    // =========================== 面料影响 ===========================
    /**
     * 面料影响
     * @param affectNodes
     * @param materialNodeId
     */
    DesignManager.prototype.addAffectOfClothCover = function (affectNodes, materialNodeId) {
      var affectNodeArray = affectNodes.split(',');
      for (var i in affectNodeArray) {
        var affectNodeId = affectNodeArray[i];
        this.addAffectClothNodeOfNodeId(affectNodeId, materialNodeId);
      }
    };
    DesignManager.prototype.addAffectClothNodeOfNodeId = function (affectNodeId, materialNodeId) {
      if (this.isInOrder(affectNodeId) == false)  return; // 如果影响的节点不在订单中, 直接返回

      var affectNode = this.getNodeById(affectNodeId);
      if (affectNode.type != 'select')    return; // 如果不是select节点, 就返回

      for (var k in affectNode.items) {
        var item = affectNode.items[k];
        if (item.material_node_id.$id == materialNodeId) {  // 如果是同一款面料, 添加进Order
          this.addOptionToTheOrder(item, affectNode);
        }
      }
    };

    // ############################ 选项筛选 ############################

    /**
     * 选项筛选
     * @param selectNodeId 筛选节点id
     * @param type 筛选类型(CA_CLOTH/CA_LEATHER..)
     * @param condition 筛选条件
     */
    DesignManager.prototype.filterOptions = function (selectNodeId, type, condition) {
      var options = {};
      if (this.Project == 'CA') {
        options = this.filterOptions_ca(selectNodeId, type, condition);

      } else if (this.Project == 'ZEST') {
        options = this.filterOptions_zest(selectNodeId, type, condition);
      }
      return options;
    };


  })(jQuery, window, document, window.DesignManager);


  /**
   * 定制页面的管理者(工具方法相关)
   */
  ;(function ($, window, document, DesignManager_data, undefined) {
    function DesignManager() {}
    DesignManager.prototype = DesignManager_data.prototype;

    /**
     * 深拷贝
     * @param obj
     */
    DesignManager.prototype.deepCopy = function (obj) {
      var jsonStr = JSON.stringify(obj);
      var newObj = JSON.parse(jsonStr);
      return newObj;
    };

    /**
     * 是否为空对象
     * @param obj
     * @returns {boolean}
     */
    DesignManager.prototype.isEmptyObject = function (obj) {
      for (var key in obj) {
        return false;
      }
      return true;
    };

  })(jQuery, window, document, window.DesignManager);

  /**
   * 定制页面的管理者(CA相关)
   */
  ;(function ($, window, document, DesignManager_data, undefined) {
    function DesignManager() {}
    DesignManager.prototype = DesignManager_data.prototype;

    /**
     * 初始化(CA)
     */
    DesignManager.prototype.init_ca = function () {
      this.filterMap = {};
      this.Order_Hybris = {}; // 给Hybris传的订单(同面料不加价的节点可省略掉)
      this.DF_Flag = false;   // 双面料标志位
    };

    /**
     * 初始化数据(CA相关)
     */
    DesignManager.prototype.initData_ca = function () {
      this.initFilterMap_ca();    // 初始化过滤字典
    };

    // ==================================== 计算Order价格 - start =======================================
    /**
     * 计算价格(CA)
     */
    DesignManager.prototype.getPrice_ca = function () {
      this.Order_Hybris = this.deepCopy(this.Order);
      this.DF_Flag = false;   // 重置状态位
      // 打印订单
      mklog('------------Order----------------------------------------------start------------');
      for (var k in this.Order) {
        var node1 = this.getNodeById(k);
        var node2 = this.getNodeById(this.Order[k]);
        // if(node2.type != 'node') continue;

        mklog(node1.name + '(' + node1.id + ')' + ' : ' + node2.name + '(' + node2.id + ')');

        if (node1.name.match('DF') || node2.name.match('DF')) {
          this.DF_Flag = true;    // 说明此时订单中存在双面料
        }
      }
      mklog('------------Order------------------------------------------------end------------');

      // 计算价格
      this.Price = 0;
      for (var k in this.Sbom) {
        var bomNode = this.Sbom[k];
        for (var key in bomNode.tree) {
          var node = bomNode.tree[key];
          this.Price += this.priceOfNode_ca(node);
        }
      }

      // totalPrice = 0;
      // for (var k in this.Sbom) {
      //     var bomNode = this.Sbom[k];
      //     for (var key in bomNode.tree) {
      //         var node = bomNode.tree[key];
      //         totalPrice += this.priceOfNode_ca(node);
      //     }
      // }
      mklog('总价为-----------', this.Price);
      return this.Price;
    };
    // 计算一个node的价格贡献
    DesignManager.prototype.priceOfNode_ca = function (node) {
      // 1. 处理一些价格依赖关系(同面料不加价)
      if (node.type == 'select') {
        var selectChildId = this.Order[node.id];
        if (!selectChildId)    return 0; // 如果本select节点没有选中子项, 直接返回0

        for (var k in node.sections) {
          var bomSection = node.sections[k];

          var identify = this.getSectionIdentifyById(bomSection.sectionid.$id);

          // 同面料不加价 关系
          if (identify == 'CA_FREE_OF_THE_SAME_CLOTH') {
            // 能来到这里, 说明具有 同面料不加价 的关系
            var depend_nodes = bomSection.val.depend_node;   // 获取depend_node(多个用逗号隔开,比如抱枕面料可能会依赖单面料中的主面料节点,皮布搭配中的布节点)
            var dependNodeArray = depend_nodes.split(',');     // 拆分BOMID字符串
            var depend_node = '';
            var dependMaterialNodeId = '';
            for (var i in dependNodeArray) {
              depend_node = dependNodeArray[i];

              if (this.isInOrder(depend_node) == false)   continue;   // 如果依赖的节点不在订单中, 则跳过不管

              // 如果在订单中
              dependMaterialNodeId = this.ClothCoverDict[depend_node];
              if (dependMaterialNodeId) { // 如果面料字典中记录了依赖节点的对应面料
                mklog('-------dependMaterialNodeId-------', dependMaterialNodeId);

              } else {    // 如果面料字典中没有记录相应面料
                var dependNodeSelectedChild = this.getNodeById(this.Order[depend_node]);  // 获取依赖节点选中的子项
                dependMaterialNodeId = dependNodeSelectedChild.material_node_id.$id;
              }
              break;
            }

            if (!dependMaterialNodeId) break;

            // 如果本节点面料跟依赖节点选择的子项面料一致, 则不加价
            var selectChildNode = this.getNodeById(selectChildId);
            if (selectChildNode.material_node_id.$id == dependMaterialNodeId) {
              mklog('本节点面料跟依赖节点选择的子项面料一致, 不加价 : ' + node.name);
              if (this.DF_Flag && (node.name.match('DF') || node.name.match('CC') || node.name.match('PB'))) {
                // 如果订单中有双面料选项, 则在给hybris的订单中保留 双面料(DF), 配布坐垫(CC), 配布靠垫(PB)
              } else {
                delete this.Order_Hybris[node.id];  // 将相应节点从hybris订单中删除
              }
              return 0;
            }

            break;  // 对于同一个依赖节点只有一个 同面料不加价 的section, 处理完直接跳出
          }
        }
      }

      // 2. 当前节点本身的'价格贡献'
      var currentNodeMoney = 0;
      for (var key in node.sections) {
        var bomSection = node.sections[key];

        // 价格贡献
        var identify = this.getSectionIdentifyById(bomSection.sectionid.$id);
        if (identify == 'PRICE_VALUE') {
          currentNodeMoney = parseFloat(bomSection.val.price) ? parseFloat(bomSection.val.price) : 0; // 当前
          break;
        }
      }

      // 3. 价格策略影响的价值贡献
      var typePrice = 0;
      switch (node.type) {
        case 'group':
          var priceTactic = ''; // 价格策略
          for (var k in node.sections) {
            var bomSection = node.sections[k];
            var identify = this.getSectionIdentifyById(bomSection.sectionid.$id);
            if (identify == 'PRICE_TACTIC') {   // 价格策略
              priceTactic = bomSection.val.price_tactic;
              break;
            }
          }
          if (priceTactic == '' || priceTactic == 'default') {   // 如果没有价格策略或者为默认, 则默认处理(累加子节点求和)
            for (var i in node.items) {
              var item = node.items[i];
              typePrice += this.priceOfNode_ca(item);
            }
          }
          // else if (priceTactic == 'max') {   // MAX(group中的max, 存在于双面料关系上)
          //     mklog('------------------MAX-------------------');
          //     for (var i in node.items) {
          //         var item = node.items[i];
          //         item.doubleCloth = 1;    // 双面料 标志位!
          //         var nodePrice = this.priceOfNode_ca(item);
          //         mklog(item.id, item.name, nodePrice);
          //
          //         if (nodePrice > typePrice) { // 如果后者大于前者
          //             typePrice = nodePrice;
          //             this.ClothCoverDict[node.id] = this.ClothCoverDict[item.id];    // !!!!!
          //         }
          //         // else if(typePrice == nodePrice) {
          //         //     this.ClothCoverDict[node.id] = this.ClothCoverDict[node.id] + ',' + this.ClothCoverDict[item.id];
          //         // }
          //     }
          //     mklog('------------------MAX-------------------');
          // }
          break;

        case 'select':

          if (this.isInOrder(node.id) == false)   return 0;   // 如果订单中没有该select, 该节点不贡献价值(为0)

          var orderAppointId = this.Order[node.id];   // 订单指定子选项

          var priceTactic = ''; // 价格策略
          for (var k in node.sections) {
            var bomSection = node.sections[k];
            var identify = this.getSectionIdentifyById(bomSection.sectionid.$id);
            if (identify == 'PRICE_TACTIC') {   // 价格策略
              priceTactic = bomSection.val.price_tactic;
              break;
            }
          }
          if (priceTactic == '' || priceTactic == 'default') {   // 如果没有价格策略或者为默认, 则默认处理(子选项的价格)
            for (var i in node.items) {
              var item = node.items[i];
              if (item.id == orderAppointId) {    // 如果是选中项才进去
                typePrice = this.priceOfNode_ca(item);   // 传入父节点
                // if (node.doubleCloth == 1) {
                //     this.ClothCoverDict[node.id] = item.material_node_id.$id;
                // }
                break;
              }
            }
          }
          break;

        default:
          break;
      }

      // 4. 双面料相同不加价
      for (var key in node.sections) {
        var bomSection = node.sections[key];

        var identify = this.getSectionIdentifyById(bomSection.sectionid.$id);
        if (identify == 'CA_DOUBLE_CLOTH_FREE_OF_THE_SAME_CLOTH') { // 双面料相同不加价
          var material1 = this.ClothCoverDict[bomSection.val.main_node];
          var material2 = this.ClothCoverDict[bomSection.val.minor_node];
          if (material1 != material2) {
            mklog('增加双面料工艺费----------' + bomSection.val.price);
            currentNodeMoney += (parseFloat(bomSection.val.price) ? parseFloat(bomSection.val.price) : 0); // 当前节点价格 + 双面料工艺费
          }
        }
      }

      return (currentNodeMoney + typePrice);    // 返回 当前节点价格
    };
    // ==================================== 计算Order价格 - end =======================================

    /**
     * (CA)获取产品预览图
     */
    DesignManager.prototype.ca_getProductPreview = function () {
      var preview = this.getSectionVal(this.Sbom[0], 'PREVIEW_PICTURE');
      if (preview.src_file) {
        return preview.src_file;
      } else {
        return '';
      }
    };

    /**
     * (CA)获取平台编码
     * @param material_node_id
     * @returns {*}
     */
    DesignManager.prototype.ca_getPlatformId = function (material_node_id) {
      var material_node = this.MaterialNodeMap[material_node_id];
      if (material_node.number) {
        return material_node.number;
      } else {
        return this.Spu.identify;
      }
    };


    /**
     * (CA)过滤"我的收藏"
     * @param selectNodeId
     * @param materialNodeIdList
     * @constructor
     */
    DesignManager.prototype.ca_filterCollections = function (selectNodeId, materialNodeIdList) {
      var selectNode = this.getNodeById(selectNodeId); // 取得选择节点
      var resultList = {};    // 结果集

      if (materialNodeIdList == 'ALL') {
        for (var k in selectNode.items) {
          var item = selectNode.items[k];
          resultList[item.id] = 1;
        }

      } else {
        // 格式化收藏列表
        var collectionMap = {};
        for (var k in materialNodeIdList) {
          var materialNodeId = materialNodeIdList[k];
          collectionMap[materialNodeId] = 1;
        }

        for (var k in selectNode.items) {
          var item = selectNode.items[k];
          if (collectionMap[item.material_node_id.$id]) {
            resultList[item.id] = 1;
          }
        }
      }
      return resultList;
    };


    /**
     * 选项筛选(CA)
     * @param selectNodeId 筛选节点id
     * @param type 筛选类型(CA_CLOTH/CA_LEATHER..)
     * @param condition 筛选条件 : {
                    "color" : "",
                    "pattern" : "",
                    "rank" : "",
                    "search_str : ""
                }
     */
    DesignManager.prototype.filterOptions_ca = function (selectNodeId, type, condition) {
      var selectNode = this.getNodeById(selectNodeId);

      var filter = {};
      if (type == 'CA_CLOTH') {  // CA面料
        filter.color = condition.color ? this.filterMap.CA_cloth.color[condition.color] : '';
        filter.pattern = condition.pattern ? this.filterMap.CA_cloth.pattern[condition.pattern] : '';
        filter.rank = condition.rank ? this.filterMap.CA_cloth.rank[condition.rank] : '';

      } else if (type == 'CA_LEATHER') { // CA皮革
        filter.color = condition.color ? this.filterMap.CA_leather.color[condition.color] : '';
        filter.rank = condition.rank ? this.filterMap.CA_leather.rank[condition.rank] : '';
      }

      var options = {};
      for (var k in selectNode.items) {
        var item = selectNode.items[k];

        if (type == 'CA_CLOTH') {  // 面料
          var cloth_property = this.getSectionVal(item, 'CA_CLOTH_PROPERTY');
          if (!cloth_property)    continue;   // 如果本节点没有这个属性, 直接跳过

          if (
            cloth_property.color.match(filter.color) &&
            cloth_property.pattern.match(filter.pattern) &&
            cloth_property.rank.match(filter.rank)
          ) {
            options[item.id] = 1;
          }


        } else if (type == 'CA_LEATHER') { // 皮革
          var leather_property = this.getSectionVal(item, 'CA_LEATHER_PROPERTY');
          if (!leather_property)  continue;   // 如果本节点没有这个属性, 直接跳过

          if (
            leather_property.color.match(filter.color) &&
            leather_property.rank.match(filter.rank)
          ) {
            options[item.id] = 1;
          }
        }
      }
      return options;
    };

    /**
     * 初始化过滤字典
     */
    DesignManager.prototype.initFilterMap_ca = function () {
      // 过滤字典
      var filterMap = {
        CA_cloth: {
          color: {
            "白色系" : "white",
            "中性色" : "neutral",
            "粉色系" : "pink",
            "紫色系" : "purple",
            "红色系" : "red",
            "黄色系" : "yellow",
            "绿色系" : "green",
            "蓝色系" : "blue",
            "灰色系" : "gray",
            "棕色系" : "brown",
            "黑色系" : "black"
          },
          pattern: {
            "经典图案" : "jingdian",
            "花卉图案" : "huahui",
            "几何图案" : "jihe",
            "抽象图案" : "chouxiang",
            "动物图案" : "dongwu",
            "素色面料" : "suse"
          },
          rank: {
            "B": "B",
            "C": "C",
            "D": "D",
            "F": "F",
            "G": "G",
            "H": "H",
            "I": "I",
            "L": "L",
            "M": "M",
            "N": "N",
            "O": "O",
            "P": "P",
            "Q": "Q",
            "R": "R",
            "S": "S",
            "T": "T",
            "U": "U"
          }
        },
        CA_leather: {
          color: {
            "白色系" : "white",
            "中性色" : "neutral",
            "灰色系" : "gray",
            "蓝色系" : "blue",
            "紫色系" : "purple",
            "棕色系" : "brown"
          },
          rank: {
            "1": "1",
            "2": "2",
            "3": "3",
            "4": "4",
            "5": "5",
            "6": "6",
            "7": "7",
            "8": "8"
          }
        }
      };
      this.filterMap = filterMap;
    };

  })(jQuery, window, document, window.DesignManager);

  /**
   * 定制页面的管理者(ZEST需求相关)
   */
  ;(function ($, window, document, DesignManager_data, undefined) {
    function DesignManager() {}
    DesignManager.prototype = DesignManager_data.prototype;

    /**
     * 初始化(zest相关)
     */
    DesignManager.prototype.init_zest = function () {
      // this.OD_Type = '';  // OD类型
      // this.Channel_Tag = '';  // 频道标识

      this.ODSectionMap = {};
      this.Nvs1_ODSectionMap = {};

      this.AttributeNodeMap = {}; // 属性字典

      this.idnrkMap = {}; // idnrk : node.id  属性OD关系找选项包要用

      this.BomNodeIdMap = {}; // get3DList用

      this.PlatformDiscount = {}; // 平台折扣
      this.SpecificProduct = {};  // 特定商品

      this.OptionRepelMap = {};   // 选项排斥字典
      this.OptionRepelCount = {}; // 选项排斥计数

      this.Net_Length = 0;    // 净尺寸 - 长
      this.Net_Width = 0;     // 净尺寸 - 宽
      this.Net_Height = 0;    // 净尺寸 - 高
      this.Net_Size = '';     // 净尺寸

      this.Pack_Length = 0;   // 包装尺寸 - 长
      this.Pack_Width = 0;    // 包装尺寸 - 宽
      this.Pack_Height = 0;   // 包装尺寸 - 高
      this.Pack_Size = '';    // 包装尺寸

      this.Price_Discount = -1;   // 优惠价

      this.configOrder = {};  // config订单
      this.ConfigMap_3DList = {}; // 获取3d素材的节点列表

      this.MateRelation = {}; // 伙伴关系
      this.filterMap = {};    // 过滤字典

      this.ConfigHadChanged = false;    // config->Order时,选项找不到时选项配置被修改 状态初始值:否
    };


    /**
     * 初始化数据(ZEST)
     * @param data
     */
    DesignManager.prototype.initData_zest = function (data) {
      this.setDesignType();   // 设置OD类型
      this.spu_getAttributeOdSections();  // 获取spu中的属性OD
      this.coverSbom_zest();

      this.setupAttributeNodeMap(data.materialNode);  // 建立
      this.initFavourablePrice(data.discount);    // 初始化优惠价格数据

      this.initMateRelationData();    // 初始化伙伴关系数据
      this.initFilterMap_zest();  // 初始化过滤字典
    };

    /**
     * 遍历spu中的属性OD数据(ZEST需要)
     */
    DesignManager.prototype.spu_getAttributeOdSections = function () {
      for (var k in this.Spu.options) {
        var option = this.Spu.options[k];
        for (var key in option.attri_od) {
          var odSection = option.attri_od[key];

          // 如果OD类型不符合, 则 跳过
          if (odSection.tag != this.OD_Type)   continue;

          // 能来到这, 说明是符合tag的属性OD
          // 存储 src_option 的OD信息
          var od_src_option = this.ODSectionMap[odSection.src_option];
          if (!od_src_option)  od_src_option = {};
          od_src_option[odSection.relate_line_id] = odSection;
          this.ODSectionMap[odSection.src_option] = od_src_option;

          if (odSection.relation_type == 'O' && odSection.affect_type == 'CAN') { // 一对一, 可选
            // ====== 保存 反向约束 的OD关系
            // 存储 dest_option 的OD信息
            var od_dest_option = this.ODSectionMap[odSection.dest_option];
            if (!od_dest_option)  od_dest_option = {};

            // 反转约束关系
            var val = {};
            for (var attri in odSection) {
              switch (attri) {
                case 'src_option':
                  val[attri] = odSection['dest_option'];
                  break;
                case 'src_attr':
                  val[attri] = odSection['dest_attr'];
                  break;
                case 'src_value':
                  val[attri] = odSection['dest_value'];
                  break;
                case 'dest_option':
                  val[attri] = odSection['src_option'];
                  break;
                case 'dest_attr':
                  val[attri] = odSection['src_attr'];
                  break;
                case 'dest_value':
                  val[attri] = odSection['src_value'];
                  break;
                default:
                  val[attri] = odSection[attri];
              }
            }
            od_dest_option[odSection.relate_line_id] = val;
            this.ODSectionMap[odSection.dest_option] = od_dest_option;

          } else if (odSection.relation_type == 'N') {    // 多对一
            // 保存 多对一 的OD关系 { relation_id : 所有该多对一的ODsection }
            var odSectionArray = this.Nvs1_ODSectionMap[odSection.relation_id];
            if (!odSectionArray)   odSectionArray = [];
            odSectionArray.push(odSection);
            this.Nvs1_ODSectionMap[odSection.relation_id] = odSectionArray;
          }
        }
      }
    };

    /**
     * 遍历Sbom(ZEST项目需要获取其他一些数据)
     */
    DesignManager.prototype.coverSbom_zest = function () {
      for (var k in this.Sbom) {
        var bomNode = this.Sbom[k];
        this.BomNodeIdMap[bomNode.bom_id.$id] = bomNode._id.$id;
        bomNode.menge = bomNode.menge || 1;
        for (var key in bomNode.tree) {
          this.coverBomNode_zest(bomNode.tree[key], bomNode.number, bomNode.menge);
        }
      }
    };
    DesignManager.prototype.coverBomNode_zest = function (node, platform_id, priceNum) {
      node.platform_id = platform_id;
      node.menge = priceNum * (node.menge || 1);

      if (node.type == 'select' || node.type == 'pack') {
        this.idnrkMap[node.idnrk] = node.id;

        // 查看节点下是否包含OD关系的section
        for (var key in node.sections) {
          var bomSection = node.sections[key];
          var identify = this.getSectionIdentifyById(bomSection.sectionid.$id);

          // 1.不是属性OD, 则 跳过
          if (identify != 'ZEST_ATTRIBUTE_OD') continue;

          // 2.如果OD类型不符合, 则 跳过
          if (bomSection.val.tag != this.OD_Type) continue;

          // 能来到这, 说明是符合tag的属性OD
          // 存储 src_option 的OD信息
          var od_src_option = this.ODSectionMap[bomSection.val.src_option];
          if (!od_src_option)  od_src_option = {};
          od_src_option[bomSection.val.relate_line_id] = bomSection.val;
          this.ODSectionMap[bomSection.val.src_option] = od_src_option;

          if (bomSection.val.relation_type == 'O' && bomSection.val.affect_type == 'CAN') {   // 一对一, 可选
            // ====== 保存 反向约束 的OD关系
            // 存储 dest_option 的OD信息
            var od_dest_option = this.ODSectionMap[bomSection.val.dest_option];
            if (!od_dest_option)  od_dest_option = {};

            // 反转约束关系
            var val = {};
            for (var attri in bomSection.val) {
              switch (attri) {
                case 'src_option':
                  val[attri] = bomSection.val['dest_option'];
                  break;
                case 'src_attr':
                  val[attri] = bomSection.val['dest_attr'];
                  break;
                case 'src_value':
                  val[attri] = bomSection.val['dest_value'];
                  break;
                case 'dest_option':
                  val[attri] = bomSection.val['src_option'];
                  break;
                case 'dest_attr':
                  val[attri] = bomSection.val['src_attr'];
                  break;
                case 'dest_value':
                  val[attri] = bomSection.val['src_value'];
                  break;
                default:
                  val[attri] = bomSection.val[attri];
              }
            }
            od_dest_option[bomSection.val.relate_line_id] = val;
            this.ODSectionMap[bomSection.val.dest_option] = od_dest_option;

          } else if (bomSection.val.relation_type == 'N') {   // 多对一
            // 保存 多对一 的OD关系 { relation_id : 所有该多对一的ODsection }
            var odSectionArray = this.Nvs1_ODSectionMap[bomSection.val.relation_id];
            if (!odSectionArray)   odSectionArray = [];
            odSectionArray.push(bomSection.val);
            this.Nvs1_ODSectionMap[bomSection.val.relation_id] = odSectionArray;
          }
        }
        // 继续递归
        for (var key in node.items) {
          var item = node.items[key];
          this.coverBomNode_zest(item, platform_id, node.menge);
        }
      }
    };

    /**
     * 建立物料属性字典(ZEST需要)
     */
    DesignManager.prototype.setupAttributeNodeMap = function (materialNodes) {
      for (var k in materialNodes) {
        var materialNode = materialNodes[k];

        var attri_node = {};
        for (var key in materialNode.sections) {
          var material_section = materialNode.sections[key];
          var identify = this.getSectionIdentifyById(material_section.sectionid.$id);

          if (identify == 'ZEST_MATERIAL_BASE_PROPERTY') { // ZEST物料基本属性
            attri_node['ZDEPARQUET'] = material_section.val['ZDEPARQUET'];  // 长
            attri_node['ZDEJJUSE'] = material_section.val['ZDEJJUSE'];      // 宽
            attri_node['ZDEPBUSE'] = material_section.val['ZDEPBUSE'];      // 高
            attri_node['MAKTX'] = material_section.val['MAKTX'];            // 描述
            attri_node['RANK'] = material_section.val['RANK'];              // 等级
            if (material_section.val['RANK']) {
              // console.error(material_section.val['RANK'],materialNode.number)
            }

          } else if (identify == 'ZEST_MATERIAL_OD_PROPERTY') {    // ZEST物料OD属性
            for (var attri in material_section.val) {
              attri_node[attri] = material_section.val[attri];
            }

          } else if (identify == 'MATERIAL_PRICE') { // ZEST物料价格行
            if (attri_node['MATERIAL_PRICE'] == undefined) {
              attri_node['MATERIAL_PRICE'] = {};
            }
            var channel = material_section.val.ODTYPE; // 频道
            if (attri_node['MATERIAL_PRICE'][channel] === undefined) {
              attri_node['MATERIAL_PRICE'][channel] = {};
            }
            var productGrade = material_section.val['PRODUCT_GRADE']; //面料等级
            attri_node['MATERIAL_PRICE'][channel][productGrade ? productGrade : '0'] = material_section.val['BASE_PRICE'];
          }
        }
        attri_node['name'] = materialNode.name; // 物料名称
        attri_node['number'] = materialNode.number; // 物料编码
        this.AttributeNodeMap[materialNode.number] = attri_node;    // 物料编码, 具有唯一性
      }
      // mklog(JSON.stringify(this.AttributeNodeMap));
    };

    // ============================================================ set方法
    /**
     * 设置定制类型(A/B/C/D)
     * @param type
     */
    DesignManager.prototype.setDesignType = function (type) {
      switch (this.Spu.tag) {
        // switch (type) {
        case 'A':   // 主推款入口 & 普通定制
          this.OD_Type = 'A';
          this.Channel_Tag = '1';
          break;
        case 'B':   // 自定制入口 & 普通定制
          this.OD_Type = 'B';
          this.Channel_Tag = '1';
          break;
        case 'C':   // 主推款入口 & 超级定制
          this.OD_Type = 'C';
          this.Channel_Tag = '2';
          break;
        case 'D':   // 自定制入口 & 超级定制
          this.OD_Type = 'C';
          this.Channel_Tag = '2';
          break;
        default:
          break;
      }
    };

    /**
     * 设置Order(zest需要做的操作)
     */
    DesignManager.prototype.setOrder_zest = function () {
      this.zest_coverSbom();  // 遍历处理
    };

    /**
     * 置换 config -> Order
     */
    DesignManager.prototype.configToOrder = function (config, initFavourablePrice) {
      var configMap = {};
      if (!initFavourablePrice) { // 如果不是initFavourablePrice调用的, 才去修改这个值
        this.ConfigHadChanged = false;  // 选项配置被修改 状态初始值:否
      }
      for (var k in config) {
        var configId = config[k];
        var configArray = configId.split('@');
        for (var key in configArray) {
          var configStr = configArray[key];
          var idArray = configStr.split('|');
          var bomId = idArray[0];
          var idnrk = idArray[1];
          if (idnrk) {
            configMap[idnrk] = bomId;
          }
        }
      }
      var order = {};
      for (var k in this.Spu.options) {
        var option = this.Spu.options[k];
        var bomId = configMap[option.idnrk];
        if (!bomId) continue;   // 如果某个选项不在订单中, 直接跳过

        for (var key in option.items) {
          var item = option.items[key];
          if (item.bomId == bomId) {
            order[option.nodeid] = item.nodeid;
            break;
          }
        }
        if (!order[option.nodeid]) {   // 如果V码配置在选项中找不到, 取spu中的默认选项值
          order[option.nodeid] = this.Order_Default[option.nodeid];
          if (!initFavourablePrice) { // 如果不是initFavourablePrice调用的, 才去修改这个值
            this.ConfigHadChanged = true;   // 选项配置被修改 状态值:是
          }
        }
      }
      return order;
    };

    /**
     * 初始化 商品优惠价
     * @param data
     */
    DesignManager.prototype.initFavourablePrice = function (data) {
      for (var k in data) {
        var discount = data[k].text;
        if (discount.discountType == 1 || discount.discountType == 2) {    // 平台直降/平台折扣
          this.PlatformDiscount = discount;

        } else if (discount.discountType == 3) {    // 特定商品特定价格
          if (!discount.sele) {   // sele即order, 如果sele没有值, 则自己换算order
            var order = this.configToOrder(discount.configid, true);    // 此时Order_Default还未初始化, 所以configId中有找不到的选项值时, 并不会设为默认选项, 这正是我们需要的
            discount.sele = order;
          }
          this.SpecificProduct[discount.vProductCode] = discount;
        }
      }
    };

    /**
     * 特定商品特定价格
     * @param order
     * @param price
     * @returns price
     */
    DesignManager.prototype.specificPriceForSpecificProduct = function (order, price) {

      // 首先校验是否为特定商品, 如果是, 则返回特定价格
      for (var k in this.SpecificProduct) {
        var product = this.SpecificProduct[k];
        var match = true;   // 定义一个匹配标志位
        for (var key in product.sele) {
          if (order[key] != product.sele[key]) {
            match = false;
            break;
          }
        }
        if (match) {
          return product.discount;    // 返回特定价格
        }
      }
      // 其次检测是否有全平台优惠策略
      if (this.PlatformDiscount) {
        if (this.PlatformDiscount.discountType == 1) {  // 平台直降
          return (price - this.PlatformDiscount.discount);
        } else if (this.PlatformDiscount.discountType == 2) {   // 平台折扣
          return (price * this.PlatformDiscount.discount);   // 乘以打折系数, 可能产生小数
        }
      }

      // 最后, 返回传进来的价格
      return price;
    };

    // 选中选项(供外界调用)
    DesignManager.prototype.selectedOptionByOptionId_zest = function (optionId) {
      var node = this.getNodeById(optionId);
      if (node.type == 'node') {  // 选项值
        // 特殊处理!
        if (node.matnr == '20641574' && this.Spu.identify.match('ZBD')) {    // 1.8M床头可配置包(ZBD001,ZBD003)
          var attri_node = this.AttributeNodeMap[node.idnrk];
          if (attri_node['A0008'] == '软包') {
            var chooseItemNodeId = this.idnrkMap['20619861'];
            if (!this.Order[chooseItemNodeId]) {   // 如果没有面料选项, 添加面料默认选项
              this.Order[chooseItemNodeId] = this.Order_Default[chooseItemNodeId];
            }
          }

        } else if (node.matnr == '20641900' && this.Spu.identify.match('ZBD')) {    // 1.5M床头可配置包(ZBD002,ZBD004)
          var attri_node = this.AttributeNodeMap[node.idnrk];
          if (attri_node['A0008'] == '软包') {
            var chooseItemNodeId = this.idnrkMap['20619861'];
            if (!this.Order[chooseItemNodeId]) {   // 如果没有面料选项, 添加面料默认选项
              this.Order[chooseItemNodeId] = this.Order_Default[chooseItemNodeId];
            }
          }
        }

        // 获取父节点
        var parentNodeId = this.getParentNodeId(optionId);
        this.Order[parentNodeId] = node.id;
      }

      this.zest_coverSbom();  // 遍历处理
    };

    // 选中一个disabled的选项
    DesignManager.prototype.selectedDisabledOptionByOptionId = function (optionId) {
      // 1.获取排斥源列表(一定要先取出来, 因为后面会把 OptionRepelMap 置空)
      var repelSrcList = this.OptionRepelMap[optionId];

      // 2.修改当前选项Order
      var parentNodeId = this.getParentNodeId(optionId);
      this.Order[parentNodeId] = optionId;

      // 3.重置 选项排斥字典, load当前选中
      this.OptionRepelMap = {};
      this.OptionRepelCount = {};
      var selectNode = this.getNodeById(parentNodeId);
      var selectedChildNode = this.getNodeById(optionId);
      this.zest_loadSelectNode(selectNode, selectedChildNode);

      // 特殊处理!
      if (selectNode.idnrk == '20641574' && this.Spu.identify.match('ZBD')) {    // 1.8M床头可配置包(ZBD001,ZBD003)
        var attri_node = this.AttributeNodeMap[selectedChildNode.idnrk];
        if (attri_node['A0008'] == '木质') {
          var chooseItemNodeId = this.idnrkMap['20619861'];
          delete this.Order[chooseItemNodeId]; // 删除面料
        }

      } else if (selectNode.idnrk == '20641900' && this.Spu.identify.match('ZBD')) {   // 1.5M床头可配置包(ZBD002,ZBD004)
        var attri_node = this.AttributeNodeMap[selectedChildNode.idnrk];
        if (attri_node['A0008'] == '木质') {
          var chooseItemNodeId = this.idnrkMap['20619861'];
          delete this.Order[chooseItemNodeId]; // 删除面料
        }
      }

      // 4.修改与之排斥的选项, 更新Order
      for (var repelOptionId in repelSrcList) {
        // 取得一个排斥源选项
        var repelOptionNode = this.Hash_Options[repelOptionId];

        // 特殊处理!
        if (repelOptionNode.idnrk == '20619861') {    // 面料可配置包
          // 如果是 1.8米床 和 1.5米床
          if (this.Spu.identify.match('ZBD')) {    // (ZBD001,ZBD002,ZBD003,ZBD004)
            continue;
          }
        }

        for (var key in repelOptionNode.items) {
          var item = repelOptionNode.items[key];
          if (this.OptionRepelMap[item.nodeid])    continue;   // 如果当前节点在排斥列表中，继续循环

          // 修改order
          this.Order[repelOptionId] = item.nodeid;
          break;
        }
      }

      this.zest_coverSbom();  // 遍历处理
    };

    // 取消某个选项(供外界调用)
    DesignManager.prototype.deselectedOptionByOptionId = function (optionId) {
      var parentNodeId = this.getParentNodeId(optionId);
      var parentNode = this.Hash_Options[parentNodeId];

      var defaultId = this.Order_Default[parentNodeId];
      var selectedId = '';
      if (this.OptionRepelMap[defaultId]) {   // 如果默认选项被排斥, 则遍历选择第一个可用的节点
        for (var k in parentNode.items) {
          var item = parentNode.items[k];

          if (this.OptionRepelMap[item.nodeid])    continue;

          selectedId = item.nodeid;
          break;
        }

      } else {
        // 如果默认节点可用，使用默认节点
        selectedId = defaultId;
      }

      //  容错处理：如果一个都没选到，说明这个选项不能被取消
      if (selectedId === '') {
        callback(-1);
        return;
      }

      this.selectedOptionByOptionId(selectedId);
    };


    // ============================================================ get方法

    /**
     * 获取被排斥的选项
     * @returns {{}|*}
     */
    DesignManager.prototype.getDisabledOptions_zest = function () {
      return this.OptionRepelMap;
    };

    /**
     * 获取配置清单
     * @returns {Array}
     */
    DesignManager.prototype.getConfigList = function () {
      var list = [];
      for (var k in this.OptionSort) {
        var chooseItemId = this.OptionSort[k];
        var chooseValueId = this.Order[chooseItemId];

        if (!chooseValueId) continue;   // 如果该选项不在订单中, 跳过(床的面料选项会有这个情况)

        var node1 = this.Hash_WebView[chooseItemId];
        var node2 = this.Hash_WebView[chooseValueId];
        var obj = {};
        obj.pName = node1.name;
        obj.childName = node2.name;
        list.push(obj);
      }
      return list;
    };

    /**
     * (重要!!!)遍历处理BOM(依照Order 应用OD, 生成排斥字典, 生成configID, 生成渲染组件列表...)
     */
    DesignManager.prototype.zest_coverSbom = function () {
      // 重置为空
      this.configOrder = {};
      this.OrderArray = [];

      this.OptionRepelMap = {};
      this.OptionRepelCount = {};

      this.ConfigMap_3DList = {};

      // 遍历Sbom
      for (var k in this.Sbom) {
        var bomNode = this.Sbom[k];
        for (var key in bomNode.tree) {
          this.zest_loadNode(bomNode.tree[key]);
        }
      }

      // 特殊处理!!!
      if (this.Spu.identify.match('ZDT011') ||
        this.Spu.identify.match('ZDT012')) {  // 此平台同样的物件带出多个, 保证OD数据不会重复, 而不做去重
        for (var key in this.configOrder) {
          var configObj = this.configOrder[key];
          // 排序
          configObj.configArray.sort();
          configObj.configID = configObj.configArray.join('@');
        }
        return;
      }

      // 给 configOrder 去重(因为OD数据有重复)
      for (var key in this.configOrder) {
        var configObj = this.configOrder[key];

        var configMap = {};
        for (var k in configObj.configArray) {
          var config = configObj.configArray[k];
          configMap[config] = 1;
        }
        var configArray = [];
        for (var config in configMap) {
          configArray.push(config);
        }
        // 排序
        configArray.sort();
        configObj.configArray = configArray;
        configObj.configID = configArray.join('@');
      }
      mklog('------------ 配置Order ------------', this.configOrder);

      // 给orderArray去重
      var orderMap = {};
      for (var k in this.OrderArray) {
        var orderStr = this.OrderArray[k];
        orderMap[orderStr] = 1;
      }
      var orderArray = [];
      for (var orderStr in orderMap) {
        orderArray.push(orderStr);
      }
      this.OrderArray = orderArray;
    };

    /**
     * (重要!!!)遍历处理node
     * @param node
     */
    DesignManager.prototype.zest_loadNode = function (node) {
      if (node.type == 'select') {    // 如果是 可选包
        if (this.isInOrder(node.id) == false)  return;  // 如果不在订单中, 跳过

        // 如果在订单中, 获取子项
        var selectedChildId = this.Order[node.id];
        var selectedChildNode = this.getNodeById(selectedChildId);

        // 添加进orderArray
        var orderStr = selectedChildNode.id + ':' + node.id;
        this.OrderArray.push(orderStr);

        // 添加进configOrder.configArray
        var configStr = selectedChildNode.bomId + '|' + node.idnrk;
        var configObj = this.configOrder[node.platform_id];
        if (!configObj) {
          configObj = {};
          configObj.configArray = [];
        }
        configObj.configArray.push(configStr);
        this.configOrder[node.platform_id] = configObj;

        // 添加进3DList渲染组件列表
        this.ConfigMap_3DList[node.id] = 1;
        this.ConfigMap_3DList[selectedChildId] = 2;

        // =========== 处理OD关系
        var odSections = this.ODSectionMap[node.idnrk];
        if (!odSections) return;

        var attri_node = this.AttributeNodeMap[selectedChildNode.idnrk]; // 所选子选项的 属性
        for (var key in odSections) {
          var odSection = odSections[key];

          var src_attr = odSection.src_attr;
          if (src_attr == '-1')    src_attr = 'number';

          if (this.meetAttribute(attri_node[src_attr], odSection.src_value) == false)   continue;   // 如果不等于相关属性值,直接跳过

          // 能来到这里,说明等于相关属性值
          if (odSection.affect_type == 'CAN') {   // 可选
            if (odSection.relation_type == 'O') {   // 一对一 可选
              this.addAttributeOD_1vs1_CAN(odSection);

            } else if (odSection.relation_type == 'N') {    // 多对一 可选
              // this.addAttributeOD_Nvs1_CAN(odSection);
            }

          } else if (odSection.affect_type == 'AUTO') {   // 带出
            if (odSection.relation_type == 'O') {   // 一对一 带出
              this.addAttributeOD_1vs1_AUTO(odSection);

            } else if (odSection.relation_type == 'N') {    // 多对一 带出
              this.addAttributeOD_Nvs1_AUTO(odSection);
            }
          }
        }

      } else if (node.type == 'pack') {   // 虚拟包节点
        for (var key in node.items) {
          var item = node.items[key];
          this.zest_loadNode(item);
        }

      } else if (node.type == 'node') {   // 如果是 必选项 || 选项值, 拼接configID
        if (node.choose_md_flag == 'Y') {    // 如果是 必选项
          // 添加进orderArray
          this.OrderArray.push(node.id + '');

          // 添加进configOrder.configArray
          var configObj = this.configOrder[node.platform_id];
          if (!configObj) {
            configObj = {};
            configObj.configArray = [];
          }
          configObj.configArray.push(node.bomId);
          this.configOrder[node.platform_id] = configObj;

          // 添加进3DList渲染组件列表
          this.ConfigMap_3DList[node.id] = 3;
        }
      }
    };

    // 加载一个可选项节点
    DesignManager.prototype.zest_loadSelectNode = function (selectNode, selectedChildNode) {
      // 处理OD关系
      var odSections = this.ODSectionMap[selectNode.idnrk];
      if (!odSections) return;

      var attri_node = this.AttributeNodeMap[selectedChildNode.idnrk]; // 所选子选项的 属性
      for (var key in odSections) {
        var odSection = odSections[key];

        var src_attr = odSection.src_attr;
        if (src_attr == '-1')    src_attr = 'number';
        if (this.meetAttribute(attri_node[src_attr], odSection.src_value) == false)   continue;   // 如果不等于相关属性值,直接跳过

        // 能来到这里,说明等于相关属性值
        if (odSection.affect_type == 'CAN') {   // 可选
          if (odSection.relation_type == 'O') {   // 一对一 可选
            this.addAttributeOD_1vs1_CAN(odSection);

          } else if (odSection.relation_type == 'N') {    // 多对一 可选
            // this.addAttributeOD_Nvs1_CAN(odSection);
          }
        }
      }
    };

    // ======================================= 处理属性OD关系 =========================================
    /**
     * 判断是否满足属性条件
     * @param attri_value
     * @param dest_value
     * @returns {boolean}
     */
    DesignManager.prototype.meetAttribute = function (attri_value, dest_value) {
      if (attri_value == null)   return false;   // 如果该属性值为空, 返回 no
      if (attri_value == dest_value)   return true;    // 如果相等, 直接返回 yes

      var value_array = attri_value.split('\\');
      for (var k in value_array) {
        var value = value_array[k];
        if (value == dest_value) {
          return true;    // 如果有一个相等, 则返回 yes
        }
      }
      return false;   // 如果都不相等, 则返回 no
    };

    /**
     * 一对一, 可选
     * @param odSection
     */
    DesignManager.prototype.addAttributeOD_1vs1_CAN = function (odSection) {
      // this.logAttributeOdSection(odSection);

      // 取出目标选项
      var dest_option = odSection.dest_option,
        dest_attr = odSection.dest_attr,
        dest_value = odSection.dest_value;
      if (dest_attr == '-1')   dest_attr = 'number';

      var destOptionId = this.idnrkMap[dest_option];
      var destSelectNode = this.getNodeById(destOptionId);

      // 取出排斥源
      var srcChooseItemNodeId = this.idnrkMap[odSection.src_option];
      var srcChooseItemNode = this.Hash_WebView[srcChooseItemNodeId]; // 从 Hash_WebView 获取文案名字
      var srcChooseValueNodeId = this.Order[srcChooseItemNodeId];
      var srcChooseValueNode = this.Hash_WebView[srcChooseValueNodeId];   // 从 Hash_WebView 获取文案名字

      this.addAttributeOD_1vs1_CAN_digui(destSelectNode, dest_attr, dest_value, srcChooseItemNode, srcChooseValueNode);
    };

    /**
     * 递归处理 一对一可选 (兼容虚拟节点)
     * @param selectNode
     * @param dest_attr
     * @param dest_value
     * @param srcChooseItemNode
     * @param srcChooseValueNode
     */
    DesignManager.prototype.addAttributeOD_1vs1_CAN_digui = function (selectNode, dest_attr, dest_value, srcChooseItemNode, srcChooseValueNode) {
      // 遍历目标可选项下的选项值
      for (var key in selectNode.items) {
        var item = selectNode.items[key];
        if (item.type == 'node') {  // 选项值
          var attri_item = this.AttributeNodeMap[item.idnrk];

          if (this.meetAttribute(attri_item[dest_attr], dest_value)) {   // 如果目标选项的该属性值符合, 则可选
            this.OptionRepelCount[item.id] = 1;
            delete this.OptionRepelMap[item.id];

          } else {    // 不可选
            if (this.OptionRepelCount[item.id] == 1)  continue;   // 如果该选项标记为 can, 则不把它添加进排斥项里

            var repelObj = this.OptionRepelMap[item.id];
            if (!repelObj) {
              var repelObj = {};
            }
            repelObj[srcChooseItemNode.option_id] = {
              id: srcChooseItemNode.option_id,
              name: srcChooseItemNode.name,
              childId: srcChooseValueNode.option_id,
              childName: srcChooseValueNode.name
            };
            this.OptionRepelMap[item.id] = repelObj;
          }

        } else {    // node.type == 'pack', 虚拟包节点
          this.addAttributeOD_1vs1_CAN_digui(item, dest_attr, dest_value, srcChooseItemNode, srcChooseValueNode);
        }
      }
    };

    /**
     * 多对一, 可选(目前还没用到这种情况)
     * @param relation_id
     * @param dest_option
     * @param dest_attr
     * @param dest_value
     */
    DesignManager.prototype.addAttributeOD_Nvs1_CAN = function (relation_id, dest_option, dest_attr, dest_value) {
      var attriOdArray = this.Nvs1_ODSectionMap[relation_id];
      var flag = true;
      for (var key in attriOdArray) {
        var attriOd = attriOdArray[key];
        var meet = this.meetNvs1(attriOd.src_option, attriOd.src_attr, attriOd.src_value);
        if (meet == false) {
          flag = false;
          break;
        }
      }

      if (flag == false)   return;

      var destOptionId = this.idnrkMap[dest_option];
      var node = this.getNodeById(destOptionId);
      for (var key in node.items) {
        var item = node.items[key];
        var attri_item = this.AttributeNodeMap[item.idnrk];
        if (attri_item[dest_attr] == dest_value) {   // 如果目标选项的该属性值符合, 则可选

        } else {    // 属性值不符合说明不可选
          this.OptionRepelMap[item.bomId] = -1;
        }
      }
    };

    /**
     * 一对一, 带出
     * @param odSection
     */
    DesignManager.prototype.addAttributeOD_1vs1_AUTO = function (odSection) {
      // this.logAttributeOdSection(odSection);

      var dest_option = odSection.dest_option,
        dest_attr = odSection.dest_attr,
        dest_value = odSection.dest_value;
      if (dest_attr == '-1')   dest_attr = 'number';

      var destOptionId = this.idnrkMap[dest_option];
      var destSelectNode = this.getNodeById(destOptionId);

      this.addAttributeOD_AUTO_digui(destSelectNode, dest_attr, dest_value);
    };

    /**
     * 带出 递归处理(兼容虚拟节点)
     * @param selectNode
     * @param dest_attr
     * @param dest_value
     */
    DesignManager.prototype.addAttributeOD_AUTO_digui = function (selectNode, dest_attr, dest_value) {
      // 遍历目标可选项下的选项值
      for (var key in selectNode.items) {
        var item = selectNode.items[key];
        if (item.type == 'node') { // 选项值
          var attri_item = this.AttributeNodeMap[item.idnrk];
          if (!attri_item) {
            mkwarning('-----------找不到该物料' + item.idnrk);
            return;
          }

          if (this.meetAttribute(attri_item[dest_attr], dest_value)) {   // 如果目标选项的该属性值符合, 则带出(自动选中)
            mklog('带出-------' + attri_item.name, item.bomId);

            // 添加进orderArray
            var orderStr = item.id + ':' + item.pid;
            this.OrderArray.push(orderStr);

            // 添加进configObj.configArray
            var chooseItemNode = this.getNodeById(item.pid);
            var configStr = item.bomId + '|' + chooseItemNode.idnrk;
            var configObj = this.configOrder[chooseItemNode.platform_id];
            if (!configObj) {
              configObj = {};
              configObj.configArray = [];
            }
            configObj.configArray.push(configStr);    // 添加进configArray (这里因为数据的原因, 会有重复)
            this.configOrder[chooseItemNode.platform_id] = configObj;

            // 添加进3DList渲染组件列表
            this.ConfigMap_3DList[item.pid] = 1;
            this.ConfigMap_3DList[item.id] = 2;

            break;  // 仅带出一个
          }

        } else {    // node.type == 'pack', 虚拟包节点
          this.addAttributeOD_AUTO_digui(item, dest_attr, dest_value);
        }
      }
    };

    /**
     * 多对一, 带出
     * @param odSection
     */
    DesignManager.prototype.addAttributeOD_Nvs1_AUTO = function (odSection) {
      // this.logAttributeOdSection(odSection);

      var relation_id = odSection.relation_id,
        dest_option = odSection.dest_option,
        dest_attr = odSection.dest_attr,
        dest_value = odSection.dest_value;
      if (dest_attr == '-1')   dest_attr = 'number';

      var odSectionArray = this.Nvs1_ODSectionMap[relation_id];
      for (var key in odSectionArray) {
        var odSection = odSectionArray[key];
        if (this.meetNvs1(odSection) == false)    return;
      }
      mklog('------------ 多对一 带出 成功 -------');

      var destOptionId = this.idnrkMap[dest_option];
      var destSelectNode = this.getNodeById(destOptionId);

      this.addAttributeOD_AUTO_digui(destSelectNode, dest_attr, dest_value);
    };

    /**
     * 检测多对一的多个OD是否都满足
     * @param odSection
     * @returns {boolean}
     */
    DesignManager.prototype.meetNvs1 = function (odSection) {
      var src_option = odSection.src_option,
        src_attr = odSection.src_attr,
        src_value = odSection.src_value;
      if (src_attr == '-1')   src_attr = 'number';

      var srcOptionId = this.idnrkMap[src_option];
      var selectedNodeId = this.Order[srcOptionId];
      var selectedNode = this.getNodeById(selectedNodeId);

      var attri_node = this.AttributeNodeMap[selectedNode.idnrk];
      return this.meetAttribute(attri_node[src_attr], src_value);
    };

    // ================================================================ 其他方法
    /**
     * 获取换取渲染图的Order
     */
    DesignManager.prototype.getOrderForRender_zest = function () {
      var order_render = {};
      for (var selectNodeId in this.Order) {
        var node1 = this.getNodeById(selectNodeId);
        var node2 = this.getNodeById(this.Order[selectNodeId]);
        order_render[node1.idnrk] = node2.bomId;
      }
      // 特殊处理! (床平台不管是否选中实木床头, 换渲染图的订单都要四个选项齐备)
      if (this.Spu.identify.match('ZBD')) {   // 床
        var chooseItemNodeId = this.idnrkMap['20619861'];   // 面料可配置包
        if (!this.Order[chooseItemNodeId]) {    // 如果没有面料选项, 请求预渲染图片的订单添加面料默认选项
          var node1 = this.getNodeById(chooseItemNodeId);
          var node2 = this.getNodeById(this.Order_Default[chooseItemNodeId]);
          order_render[node1.idnrk] = node2.bomId;
        }
      }
      return order_render;
    };


    /**
     * 获取configId
     */
    DesignManager.prototype.getConfigId = function () {
      // 重置为空
      this.configOrder = {};
      this.configString = '';
      this.OrderArray = [];

      this.OptionRepelMap = {};
      this.OptionRepelCount = {};

      // 遍历Sbom
      for (var k in this.Sbom) {
        var bomNode = this.Sbom[k];
        for (var key in bomNode.tree) {
          this.loadNode(bomNode.tree[key]);
        }
      }

      // 特殊处理!!!
      if (this.Spu.identify.match('ZDT011') ||
        this.Spu.identify.match('ZDT012')) {  // 此平台同样的物件带出多个, 保证OD数据不会重复, 而不做去重
        for (var key in this.configOrder) {
          var configObj = this.configOrder[key];
          // 排序
          configObj.configArray.sort();
          configObj.configID = configObj.configArray.join('@');
        }
        og(JSON.stringify(this.configOrder));

        this.zest_logOrder();    // 打印订单
        return;
      }

      // 给 configOrder 去重(因为OD数据有重复)
      for (var key in this.configOrder) {
        var configObj = this.configOrder[key];

        var configMap = {};
        for (var k in configObj.configArray) {
          var config = configObj.configArray[k];
          configMap[config] = 1;
        }
        var configArray = [];
        for (var config in configMap) {
          configArray.push(config);
        }
        // 排序
        configArray.sort();
        configObj.configArray = configArray;
        configObj.configID = configArray.join('@');
      }
      og('------------ 配置Order ------------', this.configOrder);

      // 给orderArray去重
      var orderMap = {};
      for (var k in this.OrderArray) {
        var orderStr = this.OrderArray[k];
        orderMap[orderStr] = 1;
      }
      var orderArray = [];
      for (var orderStr in orderMap) {
        orderArray.push(orderStr);
      }
      this.OrderArray = orderArray;

      this.zest_logOrder();    // 打印订单
    };

    /**
     * 打印订单调试
     */
    DesignManager.prototype.logOrder_zest = function () {
      mklog('------------Order-------------可选项-------------start------------');
      for (var k in this.Order) {
        var node1 = this.getNodeById(k);
        var node2 = this.getNodeById(this.Order[k]);
        mklog(node1.name + ' : ' + node2.name);
      }

      mklog('------------Order-------------可选项--------------end------------');

      mklog('------------Order-------------配置清单-------------start------------');
      for (var k in this.OrderArray) {
        var orderStr = this.OrderArray[k];
        var bomIdArray = orderStr.split(':');
        var node1 = this.getNodeById(bomIdArray[0]);

        if (bomIdArray[1]) {
          node2 = this.getNodeById(bomIdArray[1]);
          mklog(node1.name + '-' + node1.idnrk + ' | ' + node2.name + '-' + node2.idnrk);
        } else {
          mklog(node1.name + '-' + node1.idnrk);
        }
      }
      mklog('------------Order-------------配置清单-------------end------------');
    };

    /**
     * 获取配置字符串(接口用)
     */
    DesignManager.prototype.getConfigString = function () {
      var configString = '';
      for (var k in this.Order) {
        var spu_node1 = this.Hash_WebView[k];
        var spu_node2 = this.Hash_WebView[this.Order[k]];
        configString += (spu_node1.name + '@' + spu_node2.name + ',');
      }
      configString = configString.substring(0, configString.length - 1);
      return configString;
    };


    /**
     * 获取价格(zest)
     */
    DesignManager.prototype.getPrice_zest = function () {
      this.Price = 0; // 将价格置为0

      this.addPlatformPrice(); // 计算平台价格

      // 记录是否有价格数据
      var hasPriceData = false;

      for (var k in this.OrderArray) {
        var orderStr = this.OrderArray[k];
        var bomIdArray = orderStr.split(':');
        var node1 = this.getNodeById(bomIdArray[0]);

        // 判断当前节点有没有伙伴关系
        var hasMate = false;
        // 累加零部件价格
        var curPrice;
        if (bomIdArray[1]) {
          var node2 = this.getNodeById(bomIdArray[1]);
          if (this.MateRelation[node2.idnrk] !== undefined) {
            hasMate = this.MateRelation[node2.idnrk];
            mklog('该零部件有伙伴关系', hasMate);
          }
          curPrice = this.calculateMaterialNodePrice(this.AttributeNodeMap[node1.idnrk], hasMate, 'section');
          mklog(node1.name + '-' + node1.idnrk + '价格' + curPrice + ' | ' + node2.name + '-' + node2.idnrk);
        } else {
          curPrice = this.calculateMaterialNodePrice(this.AttributeNodeMap[node1.idnrk], hasMate, 'section');
          mklog(node1.name + '-' + node1.idnrk + '价格' + curPrice);
        }
        if (curPrice != 0) {
          this.Price += curPrice * node1.menge
        }
        if (curPrice > 0 && !hasPriceData) {
          hasPriceData = true;
        }
      }

      // 特殊处理!!!
      if (this.Spu.identify.match('ZBD001')) {    // 1.8米床
        var attri_node = this.AttributeNodeMap['ZBP001'];   // 床板(默认累加一次, 再特殊处理累加一次)
        this.Price += this.calculateMaterialNodePrice(attri_node, false, 'section');

      } else if (this.Spu.identify.match('ZBD002')) { // 1.5米床
        var attri_node = this.AttributeNodeMap['ZBP002'];   // 床板(默认累加一次, 再特殊处理累加一次)
        this.Price += this.calculateMaterialNodePrice(attri_node, false, 'section');

      } else if (this.Spu.identify.match('ZBD003')) { // 1.8米储物床
        var attri_node1 = this.AttributeNodeMap['20671386']; // 床刀(默认累加一次, 再特殊处理累加一次)
        this.Price += this.calculateMaterialNodePrice(attri_node1, false, 'section');
        var attri_node2 = this.AttributeNodeMap['ZBP003'];   // 铁床架(默认累加一次, 再特殊处理累加一次)
        this.Price += this.calculateMaterialNodePrice(attri_node2, false, 'section');
        var attri_node3 = this.AttributeNodeMap['ZBP005'];   // 支撑(默认累加一次, 再特殊处理累加一次)
        this.Price += this.calculateMaterialNodePrice(attri_node3, false, 'section');

      } else if (this.Spu.identify.match('ZBD004')) { // 1.5米储物床
        var attri_node1 = this.AttributeNodeMap['20671386']; // 床刀(默认累加一次, 再特殊处理累加一次)
        this.Price += this.calculateMaterialNodePrice(attri_node1, false, 'section');
        var attri_node2 = this.AttributeNodeMap['ZBP004'];   // 铁床架(默认累加一次, 再特殊处理累加一次)
        this.Price += this.calculateMaterialNodePrice(attri_node2, false, 'section');
        var attri_node3 = this.AttributeNodeMap['ZBP005'];   // 支撑(默认累加一次, 再特殊处理累加一次)
        this.Price += this.calculateMaterialNodePrice(attri_node3, false, 'section');
      }

      // 优惠价
      this.Price_Discount = this.specificPriceForSpecificProduct(this.Order, this.Price);
      if (this.Price_Discount == this.Price) {
        this.Price_Discount = -1;
      }

      return this.Price;
    };

    // 添加平台基础价格 @number 物料号  @type 伙伴类型
    DesignManager.prototype.calculateMaterialNodePrice = function (materialNode, hasMate, type) {
      var price = 0;
      var channel = this.Channel_Tag;
      if (type === 'section') {
        channel = 1;
      }
      var priceObj = materialNode['MATERIAL_PRICE'];

      if (priceObj) {
        // 如果含有伙伴关系
        var targetMaterialNum;
        var hasFindMate; // 是否找到伙伴关系
        try {
          var arr = [];

          arr = arr.concat();

          for (var i = 0; i < hasMate.length; i++) {
            var curMate = hasMate[i]; // 当前伙伴的关系

            for (var key in this.OrderArray) {
              var idArr = this.OrderArray[key].split(':');

              if (idArr.length > 1) {
                var childNode;
                var parentNode = this.getNodeById(idArr[1]);
                // og(curMate)
                if (parentNode.idnrk == curMate) {
                  // console.error('找到了');
                  if (!hasFindMate) {
                    hasFindMate = true;
                  }
                  childNode = this.getNodeById(idArr[0]);
                  targetMaterialNum = childNode.idnrk;
                  // break;
                }
              }

            }

          }
          if (targetMaterialNum) {
            // 找到面料等级
            var level = this.AttributeNodeMap[targetMaterialNum].RANK;

            price = priceObj[channel][level]; // 当前节点找到面料等级对应的价格

          } else {
            // og('没有找到选择的伙伴关系的选项');
          }
        } catch (e) {
          // og(e.message);
        }

        // 如果没有伙伴关系
        if (priceObj[channel]) {
          if (!hasFindMate) {
            price = priceObj[channel]['0'] || 0; // 如果基本价格存在加上，不存在加0
          }

        } else {
          // og('该平台没有该频道价格数据');
        }


      } else {
        // og('该平台活零件没有价格数据')
      }

      return price;
    };
    DesignManager.prototype.addPlatformPrice = function () {
      var hasPlatformPrice = false; // 记录平台是否有价格数据
      for (var k in this.Sbom) {
        var bomNode = this.Sbom[k];
        // 判断当前是否含有伙伴关系
        var hasMate = false;
        var materialNum = bomNode.number;
        if (this.MateRelation[materialNum] !== undefined) {
          hasMate = this.MateRelation[materialNum];
        }
        // debugger
        var materialNode = this.AttributeNodeMap[materialNum];

        var curPlatFormPrice = this.calculateMaterialNodePrice(materialNode, hasMate, 'platform');

        if (curPlatFormPrice != 0) {
          this.Price += bomNode.menge * curPlatFormPrice;
        }

        if (curPlatFormPrice > 0 && !hasPlatformPrice) {
          hasPlatformPrice = true;
        }
      }
      if (!hasPlatformPrice) {
        mkwarning('没有平台价格数据');
      }
    };

    /**
     * 获取优惠价(zest)
     */
    DesignManager.prototype.getDiscountPrice_zest = function () {
      return this.Price_Discount;
    };

    /**
     * 获取包装尺寸
     */
    DesignManager.prototype.getPackageSize = function () {
      return this.Pack_Size;
    };

    /**
     * 获取尺寸
     */
    DesignManager.prototype.getSize_zest = function () {
      this.Net_Length = 0;
      this.Net_Width = 0;
      this.Net_Height = 0;
      this.Pack_Length = 0;
      this.Pack_Width = 0;
      this.Pack_Height = 0;
      this.Pack_Size = [];

      // 记录是否有尺寸数据
      var hasSizeData = false;
      for (var k in this.OrderArray) {
        var orderStr = this.OrderArray[k];
        var bomIdArray = orderStr.split(':');
        var node1 = this.getNodeById(bomIdArray[0]);

        // 计算尺寸
        if (this.calculateSize(node1.idnrk) && !hasSizeData) {
          hasSizeData = true;
        }
      }

      // 特殊处理!!!
      if (this.Spu.identify.match('ZBD001')) {    // 1.8米床
        // 计算尺寸
        if (this.calculateSize('20653578') && !hasSizeData) {    // ZEST平台包装用量包
          hasSizeData = true;
        }

      } else if (this.Spu.identify.match('ZBD002')) { // 1.5米床
        if (this.calculateSize('20653579') && !hasSizeData) {    // ZEST平台包装用量包
          hasSizeData = true;
        }
      }

      this.Net_Size = this.Net_Length + 'X' + this.Net_Width + 'X' + this.Net_Height;
      this.Pack_Size = this.Pack_Size.length === 0 ? '0X0X0' : this.Pack_Size.join('/');

      if (!hasSizeData) { // 打印没有尺寸数据
        mkwarning('没有尺寸数据');
      }
      mklog('净尺寸为 : ' + this.Net_Size);
      mklog('包装尺寸为 : ' + this.Pack_Size);
      return this.Net_Size;
    };

    // 计算尺寸
    DesignManager.prototype.calculateSize = function (idnrk) {
      // og(idnrk);
      // 取出该节点物料属性
      var attri_node = this.AttributeNodeMap[idnrk];
      if (!attri_node) return; // 30016563F 这个物料在 ZBD001 中没找到

      // 计算包装尺寸
      if (attri_node.MAKTX.match('ZEST平台包装用量包')) {
        // og('ZEST平台包装用量包');
        this.Pack_Length = parseFloat(attri_node.ZDEPARQUET) ? parseFloat(attri_node.ZDEPARQUET) : 0;   // 长
        this.Pack_Width = parseFloat(attri_node.ZDEJJUSE) ? parseFloat(attri_node.ZDEJJUSE) : 0;        // 宽
        this.Pack_Height = parseFloat(attri_node.ZDEPBUSE) ? parseFloat(attri_node.ZDEPBUSE) : 0;       // 高

        this.Pack_Size.push(this.Pack_Length + 'X' + this.Pack_Width + 'X' + this.Pack_Height);
      }

      // 计算净尺寸
      var net_sizeStr = null;
      if (attri_node['A0010']) {
        net_sizeStr = attri_node['A0010'];
      } else if (attri_node['A0014']) {
        net_sizeStr = attri_node['A0014'];
      }

      if (net_sizeStr) {
        // og('fuckfuckfuck');
        // og(net_sizeStr);

        net_sizeStr = net_sizeStr.toUpperCase();

        var net_sizeArray = [];
        net_sizeArray = net_sizeStr.split('X');
        var net_length = parseFloat(net_sizeArray[0]);
        var net_width = parseFloat(net_sizeArray[1]);
        var net_height = parseFloat(net_sizeArray[2]);
        if (net_length) {
          this.Net_Length += net_length;
        }
        if (net_width) {
          this.Net_Width += net_width;
        }
        if (net_height) {
          this.Net_Height += net_height;
        }
        return true;
      } else {
        // og('没有尺寸数据');
        return false;
      }


    };

    /**
     * 打印属性OD的section
     * @param odSection
     */
    DesignManager.prototype.logAttributeOdSection = function (odSection) {
      mklog(odSection.src_option, odSection.src_attr, odSection.src_value, odSection.dest_option, odSection.dest_attr, odSection.dest_value, odSection.affect_type, odSection.relation_type, odSection.tag, odSection.relate_line_id);
    };


    /**
     * 选项筛选(ZEST)
     * @param selectNodeId 筛选节点id
     * @param type 筛选类型(ZEST_CLOTH/ZEST_LEATHER..)
     * @param condition 筛选条件 : {
                    "color" : "",
                    "pattern" : ""
                }
     */
    DesignManager.prototype.filterOptions_zest = function (selectNodeId, type, condition) {
      var selectNode = this.Hash_Options[selectNodeId];
      var options = {};
      if (type == 'ZEST_CLOTH') {
        if (condition.color) {  // 筛选颜色
          if (condition.color == '全部') {
            for (var k in selectNode.items) {
              var item = selectNode.items[k];
              var node = this.getNodeById(item.nodeid);
              var idnrk = node.idnrk;

              if (this.filterMap.pattern[idnrk] != '素色皮子') {
                options[item.nodeid] = 1;
              }
            }
          } else {
            for (var k in selectNode.items) {
              var item = selectNode.items[k];
              var node = this.getNodeById(item.nodeid);
              var idnrk = node.idnrk;

              var node_color = this.filterMap.color[idnrk];
              if (node_color == condition.color) {
                options[item.nodeid] = 1;
              }
            }
          }

        } else if (condition.pattern) {
          if (condition.pattern == '全部') {
            for (var k in selectNode.items) {
              var item = selectNode.items[k];
              var node = this.getNodeById(item.nodeid);
              var idnrk = node.idnrk;

              if (this.filterMap.pattern[idnrk] != '素色皮子') {
                options[item.nodeid] = 1;
              }
            }
          } else {
            for (var k in selectNode.items) {
              var item = selectNode.items[k];
              var node = this.getNodeById(item.nodeid);
              var idnrk = node.idnrk;

              var node_pattern = this.filterMap.pattern[idnrk];
              if (node_pattern == condition.pattern) {
                options[item.nodeid] = 1;
              }
            }
          }
        }

      } else if (type == 'ZEST_LEATHER') {
        for (var k in selectNode.items) {
          var item = selectNode.items[k];
          var node = this.getNodeById(item.nodeid);
          var idnrk = node.idnrk;

          var node_pattern = this.filterMap.pattern[idnrk];
          if (node_pattern == '素色皮子') {
            options[item.nodeid] = 1;
          }
        }
      }
      return options;
    };


    /**
     * 初始化过滤字典(ZEST相关)
     */
    DesignManager.prototype.initFilterMap_zest = function () {
      this.filterMap = {
        color: {
          "82U449": "蓝色系",
          "82U615": "棕色系",
          "82U820": "灰色系",
          "82V006": "绿色系",
          "82U827": "蓝色系",
          "82U444": "绿色系",
          "82U832": "蓝色系",
          "82U667": "黄色系",
          "82U666": "红色系",
          "82T604": "米色系",
          "82V024": "蓝色系",
          "82U992": "黄色系",
          "82U032": "白色系",
          "82U617": "灰色系",
          "82U616": "米色系",
          "82U425": "绿色系",
          "82U995": "灰色系",
          "82S395": "棕色系",
          "82U994": "蓝色系",
          "82U642": "灰色系",
          "82U872": "蓝色系",
          "82U643": "米色系",
          "82U767": "绿色系",
          "82U993": "灰色系",
          "82U964": "白色系",
          "82U768": "黄色系",
          "82V023": "红色系",
          "82U776": "米色系",
          "82T982": "灰色系",
          "82T793": "蓝色系",
          "82U998": "棕色系",
          "82U999": "灰色系",
          "82U797": "棕色系",
          "82U644": "黄色系",
          "82V002": "粉色系",
          "82U796": "蓝色系",
          "82V001": "绿色系",
          "82U803": "黄色系",
          "82U804": "粉色系",
          "82U805": "蓝色系",
          "82U806": "绿色系",
          "82U807": "棕色系",
          "82U798": "黄色系",
          "82U799": "粉色系",
          "82U800": "蓝色系",
          "82U801": "绿色系",
          "82U802": "棕色系",
          "82U795": "棕色系",
          "82U480": "黄色系",
          "82U997": "粉色系",
          "82U794": "蓝色系",
          "82U996": "绿色系",
          "82U446": "蓝色系",
          "82V004": "绿色系",
          "82V005": "红色系",
          "82V003": "灰色系",
          "82U439": "绿色系",
          "82U990": "灰色系",
          "82U991": "蓝色系",
          "82U416": "灰色系",
          "82U765": "蓝色系",
          "82U766": "绿色系",
          "82U415": "红色系",
          "82U423": "黄色系",
          "82V025": "红色系",
          "82V026": "蓝色系",
          "82V027": "绿色系",
          "82V028": "灰色系",
          "82U924": "黑色系",
          "82U171": "棕色系",
          // "87B086": "绿色系",
          // "87B085": "棕色系",
          // "87B084": "红色系",
          // "87B083": "棕色系",
          // "87B082": "蓝色系",
          // "87B081": "蓝色系",
          // "87B080": "棕色系",
          // "87B098": "灰色系",
          // "87B124": "蓝色系",
          "82V090": "粉色系",
          "82V178": "米色系",
          "82U449F": "蓝色系",
          "82U615F": "棕色系",
          "82U820F": "灰色系",
          "82V006F": "绿色系",
          "82U827F": "蓝色系",
          "82U444F": "绿色系",
          "82U832F": "蓝色系",
          "82U667F": "黄色系",
          "82U666F": "红色系",
          "82T604F": "米色系",
          "82V024F": "蓝色系",
          "82U992F": "黄色系",
          "82U032F": "白色系",
          "82U617F": "灰色系",
          "82U616F": "米色系",
          "82U425F": "绿色系",
          "82U995F": "灰色系",
          "82S395F": "棕色系",
          "82U994F": "蓝色系",
          "82U642F": "灰色系",
          "82U872F": "蓝色系",
          "82U643F": "米色系",
          "82U767F": "绿色系",
          "82U993F": "灰色系",
          "82U964F": "白色系",
          "82U768F": "黄色系",
          "82V023F": "红色系",
          "82U776F": "米色系",
          "82T982F": "灰色系",
          "82T793F": "蓝色系",
          "82U998F": "棕色系",
          "82U999F": "灰色系",
          "82U797F": "棕色系",
          "82U644F": "黄色系",
          "82V002F": "粉色系",
          "82U796F": "蓝色系",
          "82V001F": "绿色系",
          "82U803F": "黄色系",
          "82U804F": "粉色系",
          "82U805F": "蓝色系",
          "82U806F": "绿色系",
          "82U807F": "棕色系",
          "82U798F": "黄色系",
          "82U799F": "粉色系",
          "82U800F": "蓝色系",
          "82U801F": "绿色系",
          "82U802F": "棕色系",
          "82U795F": "棕色系",
          "82U480F": "黄色系",
          "82U997F": "粉色系",
          "82U794F": "蓝色系",
          "82U996F": "绿色系",
          "82U446F": "蓝色系",
          "82V004F": "绿色系",
          "82V005F": "红色系",
          "82V003F": "灰色系",
          "82U439F": "绿色系",
          "82U990F": "灰色系",
          "82U991F": "蓝色系",
          "82U416F": "灰色系",
          "82U765F": "蓝色系",
          "82U766F": "绿色系",
          "82U415F": "红色系",
          "82U423F": "黄色系",
          "82V025F": "红色系",
          "82V026F": "蓝色系",
          "82V027F": "绿色系",
          "82V028F": "灰色系",
          "82U924F": "黑色系",
          "82U171F": "棕色系",
          // "87B086F": "绿色系",
          // "87B085F": "棕色系",
          // "87B084F": "红色系",
          // "87B083F": "棕色系",
          // "87B082F": "蓝色系",
          // "87B081F": "蓝色系",
          // "87B080F": "棕色系",
          // "87B098F": "灰色系",
          // "87B124F": "蓝色系",
          "82V090F": "粉色系",
          "82V178F": "米色系"
        },
        pattern: {
          "82U449": "素色面料",
          "82U615": "素色面料",
          "82U820": "素色面料",
          "82V006": "素色面料",
          "82U827": "素色面料",
          "82U444": "素色面料",
          "82U832": "素色面料",
          "82U667": "素色面料",
          "82U666": "素色面料",
          "82T604": "素色面料",
          "82V024": "素色面料",
          "82U992": "素色面料",
          "82U032": "素色面料",
          "82U617": "素色面料",
          "82U616": "素色面料",
          "82U425": "素色面料",
          "82U995": "素色面料",
          "82S395": "素色面料",
          "82U994": "素色面料",
          "82U642": "素色面料",
          "82U872": "素色面料",
          "82U643": "素色面料",
          "82U767": "素色面料",
          "82U993": "素色面料",
          "82U964": "素色面料",
          "82U768": "素色面料",
          "82V023": "素色面料",
          "82U776": "素色面料",
          "82T982": "素色面料",
          "82T793": "素色面料",
          "82U998": "素色面料",
          "82U999": "素色面料",
          "82U797": "素色面料",
          "82U644": "素色面料",
          "82V002": "素色面料",
          "82U796": "素色面料",
          "82V001": "素色面料",
          "82U803": "自然图案",
          "82U804": "自然图案",
          "82U805": "自然图案",
          "82U806": "自然图案",
          "82U807": "自然图案",
          "82U798": "动物图案",
          "82U799": "动物图案",
          "82U800": "动物图案",
          "82U801": "动物图案",
          "82U802": "动物图案",
          "82U795": "经典图案",
          "82U480": "经典图案",
          "82U997": "经典图案",
          "82U794": "经典图案",
          "82U996": "经典图案",
          "82U446": "几何图案",
          "82V004": "几何图案",
          "82V005": "几何图案",
          "82V003": "几何图案",
          "82U439": "自然图案",
          "82U990": "自然图案",
          "82U991": "自然图案",
          "82U416": "动物图案",
          "82U765": "动物图案",
          "82U766": "动物图案",
          "82U415": "动物图案",
          "82U423": "几何图案",
          "82V025": "几何图案",
          "82V026": "几何图案",
          "82V027": "几何图案",
          "82V028": "几何图案",
          "82U924": "几何图案",
          "82U171": "几何图案",
          "87B086": "素色皮子",
          "87B085": "素色皮子",
          "87B084": "素色皮子",
          "87B083": "素色皮子",
          "87B082": "素色皮子",
          "87B081": "素色皮子",
          "87B080": "素色皮子",
          "87B098": "素色皮子",
          "87B124": "素色皮子",
          "82V090": "素色面料",
          "82V178": "素色面料",
          "82U449F": "素色面料",
          "82U615F": "素色面料",
          "82U820F": "素色面料",
          "82V006F": "素色面料",
          "82U827F": "素色面料",
          "82U444F": "素色面料",
          "82U832F": "素色面料",
          "82U667F": "素色面料",
          "82U666F": "素色面料",
          "82T604F": "素色面料",
          "82V024F": "素色面料",
          "82U992F": "素色面料",
          "82U032F": "素色面料",
          "82U617F": "素色面料",
          "82U616F": "素色面料",
          "82U425F": "素色面料",
          "82U995F": "素色面料",
          "82S395F": "素色面料",
          "82U994F": "素色面料",
          "82U642F": "素色面料",
          "82U872F": "素色面料",
          "82U643F": "素色面料",
          "82U767F": "素色面料",
          "82U993F": "素色面料",
          "82U964F": "素色面料",
          "82U768F": "素色面料",
          "82V023F": "素色面料",
          "82U776F": "素色面料",
          "82T982F": "素色面料",
          "82T793F": "素色面料",
          "82U998F": "素色面料",
          "82U999F": "素色面料",
          "82U797F": "素色面料",
          "82U644F": "素色面料",
          "82V002F": "素色面料",
          "82U796F": "素色面料",
          "82V001F": "素色面料",
          "82U803F": "自然图案",
          "82U804F": "自然图案",
          "82U805F": "自然图案",
          "82U806F": "自然图案",
          "82U807F": "自然图案",
          "82U798F": "动物图案",
          "82U799F": "动物图案",
          "82U800F": "动物图案",
          "82U801F": "动物图案",
          "82U802F": "动物图案",
          "82U795F": "经典图案",
          "82U480F": "经典图案",
          "82U997F": "经典图案",
          "82U794F": "经典图案",
          "82U996F": "经典图案",
          "82U446F": "几何图案",
          "82V004F": "几何图案",
          "82V005F": "几何图案",
          "82V003F": "几何图案",
          "82U439F": "自然图案",
          "82U990F": "自然图案",
          "82U991F": "自然图案",
          "82U416F": "动物图案",
          "82U765F": "动物图案",
          "82U766F": "动物图案",
          "82U415F": "动物图案",
          "82U423F": "几何图案",
          "82V025F": "几何图案",
          "82V026F": "几何图案",
          "82V027F": "几何图案",
          "82V028F": "几何图案",
          "82U924F": "几何图案",
          "82U171F": "几何图案",
          "87B086F": "素色皮子",
          "87B085F": "素色皮子",
          "87B084F": "素色皮子",
          "87B083F": "素色皮子",
          "87B082F": "素色皮子",
          "87B081F": "素色皮子",
          "87B080F": "素色皮子",
          "87B098F": "素色皮子",
          "87B124F": "素色皮子",
          "82V090F": "素色面料",
          "82V178F": "素色面料"
        }
      }
    };

    /**
     * 初始化伙伴关系数据
     */
    DesignManager.prototype.initMateRelationData = function () {
      this.MateRelation = {
        "20579339":[20631047,20631046],
        "20615778":[20615754],
        "20641574":[20619861],
        "20641900":[20619861],
        "ZVC011":[20615743],
        "ZSL021":[20627900],
        "ZRC021":[20642815],
        "ZSR021":[20627900],
        "ZLC021":[20642815],
        "ZSL011":[20642817],
        "ZCA011":[20642865],
        "ZRC011":[20642872],
        "ZLC011":[20642872],
        "ZSR011":[20642825],
        "ZSF011":[20627900],
        "ZSF021":[20627900],
        "ZSF031":[20627900],
        "ZSF041":[20627900],
        "ZSF051":[20627900],
        "ZSF061":[20627900],
        "ZSF071":[20627900],
        "ZSF081":[20627900],
        "ZCH011":[20627900],
        "ZCH021":[20627900],
        "ZCH031":[20627900],
        "ZCH041":[20627900],
        "ZCH051":[20627900],
        "ZCH061":[20627900],
        "ZCH071":[20627900],
        "ZCH081":[20627900],
        "ZAC021":[20627900],
        "ZAC011":[20627900],
        "ZSF022":[20627900],
        "ZSF032":[20627900],
        "ZSF042":[20627900],
        "ZSF052":[20627900],
        "ZSF062":[20627900],
        "ZCH022":[20627900],
        "ZCH032":[20627900],
        "ZCH042":[20627900],
        "ZCH052":[20627900],
        "ZCH062":[20627900],
        "ZDB011":[20675646]
      };
    };

  })(jQuery, window, document, window.DesignManager);

  /**
   * 定制页面的管理者(ZEST需求相关)
   */
  ;(function ($, window, document, DesignManager_data, undefined) {
    function DesignManager() {}
    DesignManager.prototype = DesignManager_data.prototype;

    /**
     * 初始化(zest相关)
     */
    DesignManager.prototype.init_sku = function () {

    };

    /**
     * 初始化数据(ZEST)
     * @param data
     */
    DesignManager.prototype.initData_sku = function (data) {
      this.RenderNodeList = data;
    };

  })(jQuery, window, document, window.DesignManager);


  /**
   * 定制页面的管理者(输出3DList-CA)
   */
  ;(function ($, window, document, DesignManager_data, undefined) {
    function DesignManager() {
      this.MaterialList = {}; // 3D素材列表
      //this.Material3DList = {};
    }
    DesignManager.prototype = DesignManager_data.prototype;

    // ############################ CA ############################

    /**
     * 获取3D素材列表-CA
     */
    DesignManager.prototype.get3dMaterialList_ca = function () {
      this.Material3DList = {};
      for (var k in this.Sbom) {
        var bomNode = this.Sbom[k];
        for (var key in bomNode.tree) {
          this.getMaterialByNode(bomNode.tree[key]);
        }
      }
      return this.Material3DList;
    };

    /**
     * 从节点上获取3D素材
     * @param node
     */
    DesignManager.prototype.getMaterialByNode = function (node) {
      console.log('getMaterialByNode ' + node.name);
      switch (node.type){
        case 'group':
          for (var k in node.items) {
            var item = node.items[k];
            this.getMaterialByNode(item);
          }
          break;

        case 'select':
          if (this.Order[node.id]) {
            var selectedChild = this.Order[node.id];
            for (var k in node.items) {
              var item = node.items[k];
              if (item.id == selectedChild) {
                this.getMaterialByNode(item);
                break;
              }
            }
          }
          break;

        case 'node':
          var identify = this.getTemplateIdentifyById(node.template_id.$id);
          if(identify == 'CA_REAL_OBJECT') {     // 真实组件
            this.loadModelNode(node);

          } else if(identify == 'CA_CLOTH'        // 面料
            || identify == 'CA_LEATHER'         // 皮革
            || identify == 'CA_ORNAMENT'        // 装饰
            || identify == 'CA_ORNAMENT_RY'     // 装饰
            || identify == 'CA_BUBBLENAIL'      // 泡钉
            || identify == 'CA_TINTPLATE' ) {   // 涂装

            this.loadTextureNode(node);
          }
          break;

        default:
          break;
      }
    };

    /**
     * 加载模型节点
     * @param node
     */
    DesignManager.prototype.loadModelNode = function (node) {
      var transform = {};
      for (var k in node.sections) {
        var bom_section = node.sections[k];
        var identify = this.getSectionIdentifyById(bom_section.sectionid.$id);
        if (identify == 'TRANSFORM') {
          transform = bom_section.val;
          break;
        }
      }

      var materialNode = this.Material3DList[node.id];
      if(!materialNode)materialNode=new MaterialNode();
      this.Material3DList[node.id]=materialNode;
      materialNode.model.part_id = node.id;

      var model = this.getSectionVal(node, 'OBJ_FILE');
      materialNode.model.status = 1;
      materialNode.model.model_type = 'obj';
      if (!model) {
        model = this.getSectionVal(node, 'FBX_FILE');
        materialNode.model.model_type = 'fbx';
        materialNode.model.status = 2;
      }

      if(model){
        materialNode.model.model_file = model.src_file;
        materialNode.model.transform.position = transform.position;
        materialNode.model.transform.rotation = transform.rotation;
        materialNode.model.transform.zooming = {};
        if(model.default_pic != ''){
          materialNode.material.status = 1;
          materialNode.material.materialName = model.default_shader;
          materialNode.material.pic.pic_file = model.default_pic;
        }
      }
      else {
        materialNode.model.status = 0;
      }
      // var model = this.createModel(node, transform);
      // this.MaterialList.models.push(model);
    };

    /**
     * 加载贴图节点
     * @param node
     */
    DesignManager.prototype.loadTextureNode = function (node) {

      var applyObj = {};
      for(var k in node.sections) {          // 遍历节点对象的sections
        var bomSection = node.sections[k];
        var identify = this.getSectionIdentifyById(bomSection.sectionid.$id);

        if(identify == 'APPLY_OBJECT') { // 如果是应用对象section
          applyObj = bomSection.val;
          break;
        }
      }

      // 获取section的应用对象
      var objects = applyObj.apply_objs;
      if(objects && objects.match(/([0-9|.])+/)) {  // 校验objects格式，只允许数字和圆点
        var picture = this.getSectionVal(node, 'APPLY_PICTURE'); // 获取贴图文件
        if (!picture.src_file) {
          console.error('缺少贴图文件，已跳过，节点为----', node);
          return;
        }
        var nodeIdArray = objects.split(',');     // 拆分BOMID字符串
        for(var i in nodeIdArray) {
          var nodeId = nodeIdArray[i];
          //var texture = this.createTexture(nodeId, picture);
          //this.MaterialList.materials.push(texture);

          var materialNode = this.Material3DList[nodeId];
          if(!materialNode)materialNode=new MaterialNode();
          this.Material3DList[nodeId]=materialNode;
          materialNode.material.materialName = picture.texture;
          materialNode.material.pic.pic_file = picture.src_file;
          materialNode.material.pic.normalTex = '';
          materialNode.material.pic.widthReal = picture.size.x;
          materialNode.material.pic.heightReal = picture.size.y;
          materialNode.material.texture = {};
          materialNode.material.status = 2;
        }
      }
    };

    /**
     * 创建模型对象
     * @param node
     * @param transform
     * @returns {U3dModel}
     */
    DesignManager.prototype.createModel = function (node, transform) {

      // 获取模型数据
      var model = this.getSectionVal(node, 'OBJ_FILE');
      var modelType = 'obj';
      if (!model) {
        model = this.getSectionVal(node, 'FBX_FILE');
        modelType = 'fbx';
      }
      if (model) {
        console.log('创建模型------' + node.id + '------' + this.config.filePath + model.src_file);
      } else {
        console.error('找不到模型-------------', node);
        return null;
      }

      // 新建模型对象
      var u3dModel = new U3dModel();
      u3dModel.partId = node.id;
      u3dModel.modelPath = this.config.filePath;
      u3dModel.modelName = model.src_file;
      u3dModel.modelType = modelType;

      u3dModel.position = transform.position;
      u3dModel.rotation = transform.rotation;

      if (!u3dModel.modelName) {
        console.error('缺少文件，已跳过，节点为----', node);
      }

      // 如果有默认材质和贴图
      if (model.default_shader || model.default_pic) {
        // 创建材质对象
        var u3dTexture = new U3dTexture();
        u3dTexture.partId = node.id;

        if (model.default_shader) {    // 默认材质
          u3dTexture.material.materialName = model.default_shader;
        }
        if (model.default_pic) {   // 默认贴图
          u3dTexture.material.shader.texture.mainTex = this.config.filePath + model.default_pic;
          u3dTexture.material.shader.texture.widthReal = '50';    // 默认贴图尺寸(纬度方向)
          u3dTexture.material.shader.texture.heightReal = '50';   // 默认贴图尺寸(经度方向)
        }
      }
      u3dModel.modelMaterial = u3dTexture;
      return u3dModel;
    };

    /**
     * 创建材质对象
     * @param partId
     * @param picture
     * @returns {U3dTexture}
     */
    DesignManager.prototype.createTexture = function (partId, picture) {
      // 创建材质对象
      var u3dTexture = new U3dTexture();
      u3dTexture.partId = partId;

      console.log('创建贴图------' + partId + '------' + this.config.filePath + picture.src_file);

      if (picture.texture) {  // 材质
        u3dTexture.material.materialName = picture.texture;
      }
      u3dTexture.material.shader.texture.mainTex = this.config.filePath + picture.src_file;
      u3dTexture.material.shader.texture.widthReal = picture.size.x ? picture.size.x : '50';    // 贴图真实尺寸(纬度方向)
      u3dTexture.material.shader.texture.heightReal = picture.size.y ? picture.size.y : '50';    // 贴图真实尺寸(经度方向)

      return u3dTexture;
    };

  })(jQuery, window, document, window.DesignManager);

  function MaterialNode() {
    this.model = {
      'status': 0,// 0 不存在  1 obj文件   2 fbx文件
      'part_id': '',
      'model_file': '',
      'model_type': '',
      'transform': {
        'position': {
          'x': '',
          'y': '',
          'z': ''
        },
        'rotation': {
          'x': '',
          'y': '',
          'z': ''
        },
        'zooming': {
          'x': '',
          'y': '',
          'z': ''
        }
      }
    };
    this.material = {
      'status': 0,//0 未指定材质  1 使用默认材质  2 使用指定材质
      'materialName': 'markor_diffuse', // markor_diffuse; buliao; pizhi; muzhi; yakeli jinshu_common; jinshu_rust;
      'pic': {
        'pic_file': '',
        'normalTex': '',
        'widthReal': '',
        'heightReal': ''
      },
      'texture': {}
    }
  }

  /**
   * 定制页面的管理者(输入3DList-ZEST)
   */
  ;
  (function($, window, document, DesignManager_data, undefined) {
    function DesignManager() {

    }
    DesignManager.prototype = DesignManager_data.prototype;

    // ############################ ZEST ############################
    /**
     * 判断一个节点是否在渲染素材节点列表中
     */
    DesignManager.prototype.isInConfigMap = function(nodeId) {
      if (this.ConfigMap_3DList[nodeId]) {
        return true;
      } else {
        return false;
      }
    };

    /**
     * 获取3D素材_zest
     */
    DesignManager.prototype.get3dMaterialList_zest = function() {
      this.RenderNodeList = {}; // 渲染节点列表 {node.bomId : node}
      this.TempMaterial3DList = {}; // 3D素材列表
      this.TempModel3DList = {}; // 3D素材列表
      this.Material3DList = {}; // 3D素材列表
      this.ERRORTIP = {};

      for (var k in this.Sbom) {
        var bomNode = this.Sbom[k];
        for (var key in bomNode.tree) {
          this.get3dList_loadNode(bomNode.tree[key]);
        }
      }

      // 获取套件下每个平台的槽位位置
      for (var k in this.Spu.slots) {
        var slot = this.Spu.slots[k];
        var bomNodeId = null;
        for (var key in slot.items) {
          var item = slot.items[key];
          bomNodeId = this.BomNodeIdMap[item.sbom_id.$id];
          break;
        }
        var renderBomNode = this.RenderNodeList[bomNodeId];
        if (renderBomNode) {
          renderBomNode['anchor'] = slot.property;
        }
      }

      this.TEMP_RenderNodeList = this.deepCopy(this.RenderNodeList);

      this.convertPos();

      /*
            筛检数据
        */
      for (var k in this.TEMP_RenderNodeList) {
        var renderNodes = this.TEMP_RenderNodeList[k];
        for (var k_r in renderNodes) {
          var sections = renderNodes[k_r].sections;
          var render_type = renderNodes[k_r].renderType;
          {
            for (var k_s in sections) {
              var section = sections[k_s];
              var identify = this.getSectionIdentifyById(section.sectionid.$id);
              if(identify!='APPLY_PICTURE' && identify!='OBJ_FILE' && identify!='TRANSFORM') continue;
              switch (identify) {
                case 'APPLY_PICTURE':
                  if(section.val.tag == 'small'){
                    var materialNode = this.TempMaterial3DList[section.val.apply_obj];
                    if (!materialNode) materialNode = new MaterialNode();
                    this.TempMaterial3DList[section.val.apply_obj] = materialNode;
                    materialNode.material.materialName = section.val.texture;
                    materialNode.material.pic.pic_file = section.val.src_file;
                    materialNode.material.pic.normalTex = '';
                    materialNode.material.pic.widthReal = section.val.size.x;
                    materialNode.material.pic.heightReal = section.val.size.x;
                    materialNode.material.texture = {};
                    materialNode.material.status = 2;
                  }
                  break;
                case 'OBJ_FILE':
                  var materialNode = this.TempMaterial3DList[section.val.object_id];
                  if (!materialNode) materialNode = new MaterialNode();
                  this.TempMaterial3DList[section.val.object_id] = materialNode;
                  materialNode.model.model_file = section.val.src_file;
                  materialNode.model.part_id = section.val.object_id;
                  materialNode.model.status = 1;
                  if(materialNode.material.status != 2&&(section.val.default_pic!=''||section.val.default_shader!='')){
                    materialNode.material.materialName = section.val.default_shader;
                    materialNode.material.pic.pic_file = section.val.default_pic;
                    materialNode.material.status = 1;
                  }
                  break;
                case 'TRANSFORM':
                  var materialNode = this.TempMaterial3DList[section.val.object_id];
                  if (!materialNode) materialNode = new MaterialNode();
                  this.TempMaterial3DList[section.val.object_id] = materialNode;
                  materialNode.model.transform.position = section.val.position;
                  materialNode.model.transform.rotation = section.val.rotation;
                  materialNode.model.transform.zooming = {};
                  break;
                default:
              }
            }
          }
        }
      }

      //星号 补全 TempMaterial3DList
      completTempMaterial3DList(this.TempMaterial3DList);

      //剔除
      for (var k in this.TempMaterial3DList) {
        var model = this.TempMaterial3DList[k].model;
        if(model.status!=0){
          this.Material3DList[k] = this.TempMaterial3DList[k];
        }
      }
      return this.Material3DList;
    };

    /**
     * 获取3D素材-node
     */
    DesignManager.prototype.get3dList_loadNode = function(node, chooseItemIdnrk) {
      if (node.choose_item_flag == 'Y') { // 可选项
        if (!this.isInConfigMap(node.id)) return;

        for (var k in node.items) {
          var item = node.items[k];
          this.get3dList_loadNode(item, node.idnrk);
        }

      } else if (node.choose_value_flag == 'Y') { // 选项值
        if (!this.isInConfigMap(node.id)) return;

        for (var k in node.sections) {
          var bomSection = node.sections[k];

          // 如果没有此字段或者此字段为默认, 跟3D无关, 不处理
          if (!bomSection.val.material_type || bomSection.val.material_type == 'default') continue;

          // 来到这里, 说明跟3D渲染有关
          var renderNode = {};
          renderNode.name = node.name;
          renderNode.sections = node.sections;

          if (bomSection.val.material_type == 'obj') { // 如果此节点是 模型节点
            console.log('~~~~~~~~~~obj~~~~~~~~~~' + node.name);
            renderNode.renderType = 'obj';

          } else if (bomSection.val.material_type == 'pic') { // 如果此节点是 材质节点
            console.log('~~~~~~~~~~pic~~~~~~~~~~' + node.name);
            renderNode.renderType = 'pic';
          }

          var renderBomNode = this.RenderNodeList[node.bom_node_id];
          if (!renderBomNode) renderBomNode = {};
          var key = '';
          if (chooseItemIdnrk) {
            key = chooseItemIdnrk + '|' + node.bomId;
          } else {
            key = node.bomId + '|' + node.bomId;
          }
          renderBomNode[key] = renderNode;
          this.RenderNodeList[node.bom_node_id] = renderBomNode;

          break;
        }

      } else {
        for (var k in node.sections) {
          var bomSection = node.sections[k];

          // 如果没有此字段或者此字段为默认, 跟3D无关, 不处理
          if (!bomSection.val.material_type || bomSection.val.material_type == 'default') continue;

          // 来到这里, 说明跟3D渲染有关
          var renderNode = {};
          renderNode.name = node.name;
          renderNode.sections = node.sections;

          if (bomSection.val.material_type == 'obj') { // 如果此节点是 模型节点
            console.log('~~~~~~~~~~obj~~~~~~~~~~' + node.name);
            renderNode.renderType = 'obj';

          } else if (bomSection.val.material_type == 'pic') { // 如果此节点是 材质节点
            console.log('~~~~~~~~~~pic~~~~~~~~~~' + node.name);
            renderNode.renderType = 'pic';
          }

          var renderBomNode = this.RenderNodeList[node.bom_node_id];
          if (!renderBomNode) renderBomNode = {};
          var key = '';
          if (chooseItemIdnrk) {
            key = chooseItemIdnrk + '|' + node.bomId;
          } else {
            key = node.bomId + '|' + node.bomId;
          }
          renderBomNode[key] = renderNode;
          this.RenderNodeList[node.bom_node_id] = renderBomNode;

          break;
        }

        // 继续递归遍历
        for (var key in node.items) {
          var item = node.items[key];
          this.get3dList_loadNode(item, chooseItemIdnrk);
        }
      }
    };

    DesignManager.prototype.convertPos = function() {
      //遍历存储
      this.TEMP_ANCHOR = {};//锚点信息
      this.TEMP_TRANSFORM = {};//位置信息 赋值完毕只读
      this.RESULT_TRANSFORM = {};//位置信息 赋值完毕更改至最终结果
      this.OPTIONS = new Array();



      for (var k in this.TEMP_RenderNodeList) {
        var renderNodes = this.TEMP_RenderNodeList[k];
        for (var k_r in renderNodes) {
          var sections = renderNodes[k_r].sections;
          var render_type = renderNodes[k_r].renderType;
          if (render_type == 'obj') {
            for (var k_s in sections) {
              var identify = this.getSectionIdentifyById(sections[k_s].sectionid.$id);
              var section_value_object_id = sections[k_s].val.object_id;
              if (section_value_object_id == "") continue;
              var json_onesection_value = sections[k_s].val;
              if (identify=='ANCHOR') {
                var stranchor_id = json_onesection_value.anchor_id;
                if (!this.TEMP_ANCHOR[section_value_object_id]) {
                  this.TEMP_ANCHOR[section_value_object_id] = {};
                }
                this.TEMP_ANCHOR[section_value_object_id][stranchor_id] = json_onesection_value;
              }
              if (identify=='TRANSFORM') {
                this.RESULT_TRANSFORM[section_value_object_id] = json_onesection_value;
                this.TEMP_TRANSFORM[section_value_object_id] = this.deepCopy(json_onesection_value);
              }
            }
          }
        }
      }

      //逆向排序
      for (var k in this.TEMP_TRANSFORM){
        this.OrderOption(k,k);
      }

      //更改位置信息
      for (var o in this.OPTIONS){
        var px = 0;
        var py = 0;
        var pz = 0;
        var rx = 0;
        var ry = 0;
        var rz = 0;

        for (var data in this.OPTIONS[o]){
          var datas = this.OPTIONS[o][data].split(":");
          if(datas.length==1){
            var TRANSFORM = this.TEMP_TRANSFORM[datas[0]]
            px += parseFloat(TRANSFORM.position.x==''?0:TRANSFORM.position.x);
            py += parseFloat(TRANSFORM.position.y==''?0:TRANSFORM.position.y);
            pz += parseFloat(TRANSFORM.position.z==''?0:TRANSFORM.position.z);
            rx += parseFloat(TRANSFORM.rotation.x==''?0:TRANSFORM.rotation.x);
            ry += parseFloat(TRANSFORM.rotation.y==''?0:TRANSFORM.rotation.y);
            rz += parseFloat(TRANSFORM.rotation.z==''?0:TRANSFORM.rotation.z);
          }
          else if(datas.length==3){
            var ANCHOR = this.TEMP_ANCHOR[datas[1]][datas[2]]
            if(datas[0]=='s'){
              px -= parseFloat(ANCHOR.position.x==''?0:ANCHOR.position.x);
              py -= parseFloat(ANCHOR.position.y==''?0:ANCHOR.position.y);
              pz -= parseFloat(ANCHOR.position.z==''?0:ANCHOR.position.z);
              rx -= parseFloat(ANCHOR.rotation.x==''?0:ANCHOR.rotation.x);
              ry -= parseFloat(ANCHOR.rotation.y==''?0:ANCHOR.rotation.y);
              rz -= parseFloat(ANCHOR.rotation.z==''?0:ANCHOR.rotation.z);
            }else if(datas[0]=='d'){
              px += parseFloat(ANCHOR.position.x==''?0:ANCHOR.position.x);
              py += parseFloat(ANCHOR.position.y==''?0:ANCHOR.position.y);
              pz += parseFloat(ANCHOR.position.z==''?0:ANCHOR.position.z);
              rx += parseFloat(ANCHOR.rotation.x==''?0:ANCHOR.rotation.x);
              ry += parseFloat(ANCHOR.rotation.y==''?0:ANCHOR.rotation.y);
              rz += parseFloat(ANCHOR.rotation.z==''?0:ANCHOR.rotation.z);
            }
          }
        }

        this.RESULT_TRANSFORM[o].position.x = px;
        this.RESULT_TRANSFORM[o].position.y = py;
        this.RESULT_TRANSFORM[o].position.z = pz;
        this.RESULT_TRANSFORM[o].rotation.x = rx;
        this.RESULT_TRANSFORM[o].rotation.y = ry;
        this.RESULT_TRANSFORM[o].rotation.z = rz;
      }
    };

    DesignManager.prototype.OrderOption = function(obj_id,temp_k) {
      var transform_child = this.TEMP_TRANSFORM[obj_id];
      var anchor_obj_id = transform_child.anchor_obj_id;
      var anchor_anchor_id = transform_child.anchor_anchor_id;
      var self_anchor_id = transform_child.self_anchor_id;
      if(!this.OPTIONS[temp_k]) this.OPTIONS[temp_k] = new Array();
      this.OPTIONS[temp_k] = prepend(this.OPTIONS[temp_k],obj_id);

      if(anchor_obj_id!=''){
        var temp_anchor_obj_id = anchor_obj_id ;

        var end = new RegExp(/\*$/);
        var result=end.exec(anchor_obj_id);
        //判断是否以*结尾
        if(result!=undefined){
          temp_anchor_obj_id = temp_anchor_obj_id.substr(0,temp_anchor_obj_id.length - 1);
          for (var k in this.TEMP_TRANSFORM){
            result = k.indexOf(temp_anchor_obj_id);
            //判断以 anchor_obj_id 开头
            if(result == 0){
              //获取全称
              temp_anchor_obj_id = k;
              break;
            }
          }
        }

        //自身锚点位置信息处理
        if(this.TEMP_ANCHOR[obj_id]){

          if(this.TEMP_ANCHOR[obj_id][self_anchor_id]){
            //todo
            this.OPTIONS[temp_k] = prepend(this.OPTIONS[temp_k],'s:'+obj_id+':'+self_anchor_id);
          }
          else {
            //err 没找到以 obj_id 下面 名为 self_anchor_id 锚点信息
            if(!this.ERRORTIP['ANCHOR']){
              this.ERRORTIP['ANCHOR'] = new Array();
            }
            var err ='the self_anchor_id : ' + self_anchor_id +' of '+ obj_id +' is null'
            this.ERRORTIP['ANCHOR'].push(err) ;
          }
        }else {
          //err 没找到以 anchor_obj_id 锚点信息
          if(!this.ERRORTIP['ANCHOR']){
            this.ERRORTIP['ANCHOR'] = new Array();
          }
          var err ='the ANCHOR key (obj_id) : ' + obj_id +' is null'
          this.ERRORTIP['ANCHOR'].push(err) ;
        }

        if(this.TEMP_TRANSFORM[temp_anchor_obj_id]){
          //父层级锚点信息处理
          if(this.TEMP_ANCHOR[temp_anchor_obj_id]){
            if(this.TEMP_ANCHOR[temp_anchor_obj_id][anchor_anchor_id]){
              this.OPTIONS[temp_k] = prepend(this.OPTIONS[temp_k],'d:'+temp_anchor_obj_id+':'+anchor_anchor_id);
              this.OrderOption(temp_anchor_obj_id,temp_k);
            }
            else {
              //err 没找到以 temp_anchor_obj_id 下面 名为 anchor_anchor_id 锚点信息
              if(!this.ERRORTIP['ANCHOR']){
                this.ERRORTIP['ANCHOR'] = new Array();
              }
              var err ='the anchor_anchor_id : ' + anchor_anchor_id +' of '+ temp_anchor_obj_id +' is null'
              this.ERRORTIP['ANCHOR'].push(err) ;
            }
          }
          else {
            //err 没找到以 anchor_obj_id 锚点信息
            if(!this.ERRORTIP['ANCHOR']){
              this.ERRORTIP['ANCHOR'] = new Array();
            }
            var err ='the ANCHOR key (obj_id) : ' + anchor_obj_id +' is null'
            this.ERRORTIP['ANCHOR'].push(err) ;
          }
        }
        else {
          //err 没找到以 temp_anchor_obj_id 开头的位置信息
          if(!this.ERRORTIP['ANCHOR']){
            this.ERRORTIP['ANCHOR'] = new Array();
          }
          var err ='the TRANSFORM key (obj_id) : ' + temp_anchor_obj_id +' is null'
          this.ERRORTIP['ANCHOR'].push(err) ;
        }
      }
    };

    var completTempMaterial3DList = function(TempMaterial3DList){
      for (var k in TempMaterial3DList) {
        var fdStart = k.indexOf("*");
        if(fdStart == 0){
          var temp_k = k.substr(1,k.length);
          for (var kr in TempMaterial3DList) {
            fdStart = kr.indexOf("*");
            if(fdStart != 0){
              var result = kr.indexOf(temp_k);
              //判断以 anchor_obj_id 开头
              if(result >= 0){
                TempMaterial3DList[kr].material = TempMaterial3DList[k].material;
              }
            }
          }
        }
      }
    };

    var prepend = function (arr, item) {
      //将arr数组复制给a
      var a = arr.slice(0);
      //使用unshift方法向a开头添加item
      a.unshift(item);
      return a;
    };

  })(jQuery, window, document, window.DesignManager);


  /**
   * 定制页面的管理者(输入3DList-SKU)
   */
  ;(function ($, window, document, DesignManager_data, undefined) {
    function DesignManager() {
      //this.MaterialList = {}; // 3D素材列表
    }
    DesignManager.prototype = DesignManager_data.prototype;

    /**
     * 获取3D素材_sku
     */
    DesignManager.prototype.get3dMaterialList_sku = function () {
      this.Material3DList = {}; // 3D素材列表

      for (var k in this.RenderNodeList) {
        var renderNodes = this.RenderNodeList[k];

        for (var k_r in renderNodes) {
          var renderNode= renderNodes[k_r];
          if(renderNode['obj_file']){
            var materialNode=this.Material3DList[k_r];
            if(!materialNode)materialNode = new MaterialNode();
            this.Material3DList[k_r]=materialNode;
            materialNode.model.status = 1;
            materialNode.model.part_id=k_r;
            materialNode.model.model_file = renderNode.obj_file.src_file;
            materialNode.model.transform.position = renderNode.transform.position;
            materialNode.model.transform.rotation = renderNode.transform.rotation;
            materialNode.model.transform.zooming = {};
            if(renderNode.apply_picture.src_file!=''){
              materialNode.material.status = 1;
              materialNode.material.materialName = renderNode.apply_picture.texture;
              materialNode.material.pic.pic_file = renderNode.apply_picture.src_file;
              materialNode.material.pic.normalTex = '';
              materialNode.material.pic.widthReal = renderNode.apply_picture.size.x;
              materialNode.material.pic.heightReal = renderNode.apply_picture.size.y;
              materialNode.material.texture = {};
            }
          }
        }
      }

      return this.Material3DList;

    };

  })(jQuery, window, document, window.DesignManager);

}));
