import {
  CAMPUS_RECRUITMENT_AUDIT,
  type CampusRecruitmentAudit,
} from './campusRecruitmentAudit20260811';

export interface HotCompany {
  name: string;
  industry: string;
  city: string;
  url: string;
  recruitment?: CampusRecruitmentAudit;
}

export interface HotCompanyGroup {
  name: string;
  dot: string;
  companies: HotCompany[];
}

const BASE_HOT_COMPANY_GROUPS: HotCompanyGroup[] = [
  { name: "半导体 · 芯片 · 显示", dot: "#8ba3bd", companies: [
    { name: "中芯国际", industry: "晶圆代工", city: "上海", url: "https://careers.smics.com" },
    { name: "长江存储", industry: "存储芯片", city: "武汉", url: "https://ymtc.zhiye.com" },
    { name: "长鑫存储", industry: "存储芯片", city: "合肥", url: "https://cxmt.zhiye.com" },
    { name: "北方华创", industry: "半导体设备", city: "北京", url: "https://naura.zhiye.com" },
    { name: "韦尔股份", industry: "图像传感器", city: "上海", url: "https://www.willsemi.com/cn/recruitment" },
    { name: "紫光展锐", industry: "手机芯片", city: "上海", url: "https://unisoc.zhiye.com" },
    { name: "寒武纪", industry: "AI 芯片", city: "北京", url: "https://app.mokahr.com/campus-recruitment/cambricon" },
    { name: "台积电", industry: "晶圆代工", city: "南京", url: "https://www.tsmc.com/chinese/careers" },
    { name: "华虹 · 华力", industry: "晶圆代工", city: "上海", url: "https://www.huahonggrace.com/cn/careers" },
    { name: "华润微电子", industry: "功率半导体", city: "无锡", url: "https://www.crmicro.com/join" },
    { name: "晶合集成", industry: "晶圆代工", city: "合肥", url: "https://nexchip.zhiye.com" },
    { name: "芯碁微装", industry: "直写光刻设备", city: "合肥", url: "https://cfmee.zhiye.com" },
    { name: "鹏芯微", industry: "晶圆代工", city: "深圳", url: "https://www.pxwsemi.com/join" },
    { name: "鹏新旭", industry: "半导体制造", city: "深圳", url: "https://www.pengxinxu.com" },
    { name: "新凯来", industry: "半导体设备", city: "深圳", url: "https://www.sicarrier.com" },
    { name: "深南电路", industry: "PCB · 封装基板", city: "深圳", url: "https://scc.zhiye.com" },
    { name: "江丰电子", industry: "溅射靶材", city: "宁波", url: "https://www.kfmic.com/join" },
    { name: "睿创微纳", industry: "红外传感", city: "烟台", url: "https://raytron.zhiye.com" },
    { name: "京东方", industry: "显示面板", city: "北京", url: "https://campus.boe.com" },
    { name: "维信诺", industry: "OLED 面板", city: "昆山", url: "https://visionox.zhiye.com" },
    { name: "翰博高新", industry: "显示材料", city: "合肥", url: "https://www.hibr.com.cn/join" },
  ] },
  { name: "新能源车 · 整车", dot: "#93a98c", companies: [
    { name: "比亚迪", industry: "新能源整车", city: "深圳", url: "https://job.byd.com" },
    { name: "蔚来", industry: "智能电动车", city: "上海", url: "https://nio.jobs.feishu.cn/campus" },
    { name: "理想汽车", industry: "智能电动车", city: "北京", url: "https://www.lixiang.com/careers" },
    { name: "小鹏汽车", industry: "智能电动车", city: "广州", url: "https://app.mokahr.com/campus-recruitment/xiaopeng" },
    { name: "小米汽车", industry: "智能电动车", city: "北京", url: "https://hr.xiaomi.com/campus" },
    { name: "极氪", industry: "智能电动车", city: "杭州", url: "https://zeekr.zhiye.com" },
    { name: "零跑", industry: "智能电动车", city: "杭州", url: "https://leapmotor.zhiye.com" },
    { name: "赛力斯", industry: "新能源整车", city: "重庆", url: "https://seres.zhiye.com" },
    { name: "特斯拉", industry: "智能电动车", city: "上海", url: "https://www.tesla.cn/careers" },
    { name: "奇瑞", industry: "整车", city: "芜湖", url: "https://chery.zhiye.com" },
    { name: "吉利", industry: "整车", city: "杭州", url: "https://geely.zhiye.com" },
    { name: "长安汽车", industry: "整车", city: "重庆", url: "https://changan.zhiye.com" },
    { name: "上汽集团", industry: "整车", city: "上海", url: "https://saicmotor.zhiye.com" },
    { name: "中国一汽", industry: "整车", city: "长春", url: "https://faw.zhiye.com" },
    { name: "江淮汽车", industry: "整车", city: "合肥", url: "https://jac.zhiye.com" },
    { name: "宇通", industry: "客车", city: "郑州", url: "https://yutong.zhiye.com" },
    { name: "开沃", industry: "新能源客车", city: "南京", url: "https://www.skywellcorp.com/join" },
  ] },
  { name: "汽车电子 · 零部件", dot: "#a08cb5", companies: [
    { name: "博世", industry: "汽车零部件", city: "上海", url: "https://www.bosch.com.cn/careers/" },
    { name: "联合电子", industry: "汽车电子", city: "上海", url: "https://www.uaes.com/career" },
    { name: "经纬恒润", industry: "汽车电子", city: "北京", url: "https://hirain.zhiye.com" },
    { name: "禾赛", industry: "激光雷达", city: "上海", url: "https://hesai.jobs.feishu.cn" },
    { name: "福耀科技", industry: "汽车玻璃", city: "福州", url: "https://fuyao.zhiye.com" },
    { name: "万向", industry: "汽车零部件", city: "杭州", url: "https://www.wanxiang.com.cn/join" },
    { name: "巨一科技", industry: "电驱 · 智能装备", city: "合肥", url: "https://jee.zhiye.com" },
    { name: "联创电子", industry: "光学电子", city: "南昌", url: "https://www.lcetron.com/join" },
  ] },
  { name: "电池 · 能源", dot: "#c9906b", companies: [
    { name: "宁德时代", industry: "动力电池", city: "宁德", url: "https://talent.catl.com" },
    { name: "中创新航", industry: "动力电池", city: "常州", url: "https://calb.zhiye.com" },
    { name: "亿纬锂能", industry: "锂电池", city: "惠州", url: "https://evebattery.zhiye.com" },
    { name: "欣旺达", industry: "锂电池", city: "深圳", url: "https://sunwoda.zhiye.com" },
    { name: "国轩高科", industry: "动力电池", city: "合肥", url: "https://gotion.zhiye.com" },
    { name: "隆基绿能", industry: "光伏", city: "西安", url: "https://longi.zhiye.com" },
    { name: "阳光电源", industry: "光伏逆变器", city: "合肥", url: "https://sungrow.zhiye.com" },
    { name: "远景", industry: "风电 · 储能", city: "上海", url: "https://envision.jobs.feishu.cn" },
    { name: "三一重能", industry: "风电装备", city: "北京", url: "https://sanyre.zhiye.com" },
    { name: "禾迈", industry: "微型逆变器", city: "杭州", url: "https://www.hoymiles.com/cn/careers/" },
    { name: "正浩 EcoFlow", industry: "便携储能", city: "深圳", url: "https://www.ecoflow.com/cn/careers" },
    { name: "威迈斯", industry: "车载电源", city: "深圳", url: "https://www.vmaxpower.com.cn/join" },
    { name: "科华数据", industry: "电源 · 数据中心", city: "厦门", url: "https://kehua.zhiye.com" },
    { name: "特变电工", industry: "输变电装备", city: "昌吉", url: "https://tbea.zhiye.com" },
    { name: "中国能建", industry: "能源工程", city: "北京", url: "https://zhaopin.ceec.net.cn" },
  ] },
  { name: "高端制造 · 装备", dot: "#c39aa0", companies: [
    { name: "汇川技术", industry: "工业自动化", city: "深圳", url: "https://inovance.zhiye.com" },
    { name: "大疆", industry: "无人机", city: "深圳", url: "https://we.dji.com/zh-CN/campus" },
    { name: "三一重工", industry: "工程机械", city: "长沙", url: "https://sany.zhiye.com" },
    { name: "立讯精密", industry: "精密制造", city: "东莞", url: "https://luxshare.zhiye.com" },
    { name: "徐工", industry: "工程机械", city: "徐州", url: "https://xcmg.zhiye.com" },
    { name: "卡特彼勒", industry: "工程机械", city: "徐州", url: "https://www.caterpillar.com/zh/careers.html" },
    { name: "山推", industry: "工程机械", city: "济宁", url: "https://www.shantui.com/careers/" },
    { name: "合力叉车", industry: "工业车辆", city: "合肥", url: "https://www.helichina.com/join" },
    { name: "海天塑机", industry: "注塑机", city: "宁波", url: "https://www.haitianpm.com/cn/careers/" },
    { name: "豪迈", industry: "精密机械", city: "高密", url: "https://www.himile.com/join" },
    { name: "南高齿", industry: "风电齿轮", city: "南京", url: "https://www.ngctransmission.com/cn/career" },
    { name: "中国中车", industry: "轨道交通", city: "北京", url: "https://www.crrcgc.cc/g5121.aspx" },
    { name: "宏工科技", industry: "物料自动化", city: "东莞", url: "https://www.honggong.com/join" },
    { name: "东华工程", industry: "化工工程", city: "合肥", url: "https://www.chinaecec.com/careers" },
    { name: "西门子", industry: "工业科技", city: "北京", url: "https://www.siemens.com/cn/zh/company/jobs.html" },
    { name: "施耐德", industry: "能效管理", city: "北京", url: "https://www.se.com/cn/zh/about-us/careers/overview.jsp" },
    { name: "科大智能电气", industry: "电气自动化", city: "合肥", url: "https://www.csg.com.cn/join" },
    { name: "英威腾", industry: "变频器 · 电源", city: "深圳", url: "https://invt.zhiye.com" },
    { name: "宝钢", industry: "钢铁材料", city: "上海", url: "https://www.baosteel.com/join" },
    { name: "邦德", industry: "激光装备", city: "济南", url: "https://www.bodor.com/cn/career" },
  ] },
  { name: "家电 · 消费电子", dot: "#7ea6a0", companies: [
    { name: "美的集团", industry: "智能家电", city: "佛山", url: "https://careers.midea.com" },
    { name: "海尔", industry: "智能家电", city: "青岛", url: "https://maker.haier.net/client/campus" },
    { name: "格力", industry: "家电 · 装备", city: "珠海", url: "https://gree.zhiye.com" },
    { name: "海信", industry: "家电 · 显示", city: "青岛", url: "https://hisense.zhiye.com" },
    { name: "TCL", industry: "家电 · 显示", city: "惠州", url: "https://campus.tcl.com" },
    { name: "长虹", industry: "家电", city: "绵阳", url: "https://changhong.zhiye.com" },
    { name: "奥克斯", industry: "空调", city: "宁波", url: "https://auxgroup.zhiye.com" },
    { name: "中科美菱", industry: "低温设备", city: "合肥", url: "https://www.zkmeiling.com/join" },
    { name: "方太", industry: "厨电", city: "宁波", url: "https://fotile.zhiye.com" },
    { name: "公牛", industry: "电工电器", city: "宁波", url: "https://bull.zhiye.com" },
    { name: "科沃斯", industry: "服务机器人", city: "苏州", url: "https://ecovacs.zhiye.com" },
    { name: "九号公司", industry: "智能短交通", city: "北京", url: "https://ninebot.zhiye.com" },
    { name: "安克创新", industry: "消费电子", city: "长沙", url: "https://anker-in.zhiye.com" },
    { name: "小天才", industry: "智能硬件", city: "东莞", url: "https://www.okii.com/join" },
    { name: "OPPO", industry: "智能手机", city: "东莞", url: "https://careers.oppo.com/campus" },
    { name: "联想", industry: "PC · 智能设备", city: "北京", url: "https://talent.lenovo.com.cn" },
    { name: "联宝", industry: "电子制造", city: "合肥", url: "https://lcfc.zhiye.com" },
    { name: "歌尔", industry: "声学 · 光学", city: "潍坊", url: "https://goertek.zhiye.com" },
    { name: "瑞声科技", industry: "声学器件", city: "深圳", url: "https://aac.zhiye.com" },
    { name: "和而泰", industry: "智能控制器", city: "深圳", url: "https://www.szhittech.com/join" },
    { name: "爱玛", industry: "电动两轮车", city: "天津", url: "https://aimatech.zhiye.com" },
    { name: "雅迪", industry: "电动两轮车", city: "无锡", url: "https://yadea.zhiye.com" },
    { name: "得力", industry: "办公用品", city: "宁波", url: "https://deli.zhiye.com" },
  ] },
  { name: "互联网 · 科技", dot: "#bfa871", companies: [
    { name: "华为", industry: "ICT · 终端", city: "深圳", url: "https://career.huawei.com/reccampportal" },
    { name: "腾讯", industry: "互联网", city: "深圳", url: "https://join.qq.com" },
    { name: "字节跳动", industry: "互联网", city: "北京", url: "https://jobs.bytedance.com/campus" },
    { name: "美团", industry: "本地生活", city: "北京", url: "https://campus.meituan.com" },
    { name: "阿里巴巴", industry: "电商 · 云计算", city: "杭州", url: "https://campus.alibaba.com" },
    { name: "京东", industry: "电商 · 物流", city: "北京", url: "https://campus.jd.com" },
    { name: "顺丰", industry: "快递物流", city: "深圳", url: "https://hr.sf-express.com" },
    { name: "途虎养车", industry: "汽车服务", city: "上海", url: "https://tuhu.zhiye.com" },
    { name: "得物", industry: "潮流电商", city: "上海", url: "https://dewu.jobs.feishu.cn" },
    { name: "SHEIN", industry: "跨境电商", city: "广州", url: "https://talent.sheincorp.cn" },
    { name: "科大讯飞", industry: "AI · 语音", city: "合肥", url: "https://iflytek.zhiye.com" },
    { name: "中兴", industry: "通信设备", city: "深圳", url: "https://job.zte.com.cn" },
    { name: "海康威视", industry: "智能物联", city: "杭州", url: "https://campus.hikvision.com" },
    { name: "锐捷网络", industry: "网络设备", city: "福州", url: "https://ruijie.zhiye.com" },
    { name: "TP-LINK", industry: "网络设备", city: "深圳", url: "https://hr.tp-link.com.cn" },
    { name: "海德斯", industry: "通信设备", city: "", url: "https://www.h3c.com/cn/About_H3C/Careers/" },
  ] },
  { name: "快消 · 医疗", dot: "#c78f7e", companies: [
    { name: "宝洁", industry: "日化快消", city: "广州", url: "https://www.pgcareers.com.cn" },
    { name: "亿滋", industry: "食品", city: "上海", url: "https://www.mondelezinternational.com/careers/" },
    { name: "伊利", industry: "乳业", city: "呼和浩特", url: "https://yili.zhiye.com" },
    { name: "蒙牛", industry: "乳业", city: "呼和浩特", url: "https://mengniu.zhiye.com" },
    { name: "农夫山泉", industry: "饮料", city: "杭州", url: "https://www.nongfuspring.com/careers" },
    { name: "蜜雪冰城", industry: "茶饮", city: "郑州", url: "https://www.mxbc.com/join" },
    { name: "迪卡侬", industry: "体育零售", city: "上海", url: "https://careers.decathlon.com.cn" },
    { name: "安踏", industry: "运动服饰", city: "晋江", url: "https://anta.zhiye.com" },
    { name: "三棵树", industry: "涂料", city: "莆田", url: "https://skshu.zhiye.com" },
    { name: "迈瑞医疗", industry: "医疗器械", city: "深圳", url: "https://mindray.zhiye.com" },
    { name: "英科医疗", industry: "医疗耗材", city: "淄博", url: "https://intco.zhiye.com" },
  ] },
];

const BASE_FEATURED_COMPANY_GROUPS: HotCompanyGroup[] = [
  { name: "国企", dot: "#c14f3f", companies: [
    { name: "国家电网", industry: "电力 · 能源", city: "全国", url: "https://zhaopin.sgcc.com.cn/sgcchr/static/home.html" },
    { name: "中国石油", industry: "石油 · 天然气", city: "全国", url: "https://zhaopin.cnpc.com.cn" },
    { name: "中国移动", industry: "通信运营", city: "全国", url: "https://job.10086.cn" },
    { name: "南方电网", industry: "电力 · 能源", city: "南方五省区", url: "https://zhaopin.csg.cn" },
    { name: "中国电信", industry: "通信运营", city: "全国", url: "https://job.chinatelecom.com.cn" },
    { name: "国家电投", industry: "电力 · 新能源", city: "全国", url: "https://www.spic.com.cn/" },
    { name: "中国华能", industry: "电力 · 能源", city: "全国", url: "https://zhaopin.chng.com.cn" },
    { name: "三峡集团", industry: "水电 · 新能源", city: "全国", url: "https://www.ctg.com.cn/sxjt/rlzy71/rlzydt/index.html" },
    { name: "华润集团", industry: "综合产业", city: "全国", url: "https://www.crc.com.cn/rczp/" },
    { name: "中国海油", industry: "石油 · 天然气", city: "全国", url: "https://cnooc.zhaopin.com" },
    { name: "国家能源集团", industry: "电力 · 煤炭", city: "全国", url: "https://zhaopin.chnenergy.com.cn" },
    { name: "招商局集团", industry: "交通 · 金融", city: "全国", url: "https://cmhk.zhiye.com" },
    { name: "中远海运", industry: "航运 · 物流", city: "全国", url: "https://job.coscoshipping.com" },
    { name: "中国华电", industry: "电力 · 能源", city: "全国", url: "https://rencaishichang.chd.com.cn" },
    { name: "中国铝业", industry: "有色金属 · 材料", city: "全国", url: "https://zlwebsite.chinalco.com.cn/pub/zljt/rlzy/rlzy_zpxx/" },
    { name: "中国核工业", industry: "核能 · 核技术", city: "全国", url: "https://cnnc.zhiye.com" },
    { name: "中国联通", industry: "通信运营", city: "全国", url: "https://zglt2026.zhaopin.com" },
    { name: "中国航天科技", industry: "航天 · 高端制造", city: "全国", url: "https://www.spacetalent.com.cn" },
    { name: "中国石化", industry: "石油 · 化工", city: "全国", url: "https://job.sinopec.com" },
    { name: "中国广核", industry: "核电 · 新能源", city: "全国", url: "https://cgn.hotjob.cn" },
  ] },
  { name: "外企", dot: "#567da5", companies: [
    { name: "微软", industry: "软件 · 云计算 · AI", city: "北京 · 上海 · 苏州", url: "https://jobs.careers.microsoft.com/global/zh-cn/search?lc=China" },
    { name: "苹果", industry: "消费电子 · 软件", city: "北京 · 上海 · 深圳", url: "https://jobs.apple.com/zh-cn/search?location=中国大陆-CHNC" },
    { name: "亚马逊", industry: "云计算 · 电商", city: "北京 · 上海 · 深圳", url: "https://www.amazon.jobs/en/location/beijing-CHINA" },
    { name: "IBM", industry: "企业服务 · AI", city: "北京 · 上海 · 深圳", url: "https://www.ibm.com/cn-zh/careers/search" },
    { name: "英特尔", industry: "半导体 · 芯片", city: "北京 · 上海 · 深圳", url: "https://chinacampus.jobs.intel.cn/intel/position/index" },
    { name: "英伟达", industry: "AI · 芯片", city: "北京 · 上海 · 深圳", url: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite?locationCountry=China" },
    { name: "特斯拉", industry: "新能源汽车 · 能源", city: "上海 · 北京", url: "https://www.tesla.cn/careers/search/?country=CN" },
    { name: "西门子", industry: "工业科技 · 数字化", city: "北京 · 上海 · 苏州", url: "https://jobs.siemens.com/careers?location=China" },
    { name: "博世", industry: "汽车零部件 · 工业", city: "上海 · 苏州 · 无锡", url: "https://www.bosch.com.cn/careers/" },
    { name: "施耐德", industry: "能源管理 · 自动化", city: "北京 · 上海 · 无锡", url: "https://www.se.com/cn/zh/about-us/careers/overview.jsp" },
    { name: "ABB", industry: "电气 · 自动化", city: "北京 · 上海 · 厦门", url: "https://careers.abb/global/zh/search-results?keywords=&location=China" },
    { name: "宝洁", industry: "日化 · 快消", city: "广州 · 北京 · 上海", url: "https://www.pgcareers.com.cn" },
    { name: "联合利华", industry: "快消 · 食品", city: "上海 · 合肥 · 广州", url: "https://careers.unilever.com/china" },
    { name: "欧莱雅", industry: "美妆 · 消费品", city: "上海 · 苏州 · 广州", url: "https://careers.loreal.com/zh_CN/content/China" },
    { name: "雀巢", industry: "食品 · 饮料", city: "北京 · 上海 · 广州", url: "https://www.nestle.com.cn/jobs" },
    { name: "玛氏", industry: "食品 · 宠物护理", city: "北京 · 上海 · 广州", url: "https://careers.mars.com/cn/zh/search-results" },
    { name: "耐克", industry: "运动消费品", city: "上海 · 深圳", url: "https://careers.nike.com/zh-cn/jobs" },
    { name: "迪卡侬", industry: "体育零售", city: "上海 · 全国", url: "https://careers.decathlon.com.cn" },
    { name: "强生", industry: "医疗健康", city: "上海 · 北京 · 苏州", url: "https://www.careers.jnj.com/zh-cn/jobs/?location=China" },
    { name: "阿斯利康", industry: "医药 · 生物科技", city: "上海 · 无锡 · 北京", url: "https://careers.astrazeneca.com.cn" },
  ] },
];

function attachRecruitmentAudit(groups: HotCompanyGroup[]) {
  return groups.map((group) => ({
    ...group,
    companies: group.companies.map((company) => ({
      ...company,
      recruitment: CAMPUS_RECRUITMENT_AUDIT[company.name],
    })),
  }));
}

export const HOT_COMPANY_GROUPS: HotCompanyGroup[] = attachRecruitmentAudit(BASE_HOT_COMPANY_GROUPS);

export const FEATURED_COMPANY_GROUPS: HotCompanyGroup[] = attachRecruitmentAudit(BASE_FEATURED_COMPANY_GROUPS);

export const ALL_HOT_COMPANIES = Array.from(
  new Map(
    [...HOT_COMPANY_GROUPS, ...FEATURED_COMPANY_GROUPS]
      .flatMap((group) => group.companies)
      .map((company) => [company.name.trim().toLocaleLowerCase('zh-CN'), company]),
  ).values(),
);

export const HOT_COMPANY_TOTAL = ALL_HOT_COMPANIES.length;
