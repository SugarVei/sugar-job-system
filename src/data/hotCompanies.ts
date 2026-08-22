import {
  CAMPUS_RECRUITMENT_AUDIT,
  type CampusRecruitmentAudit,
} from './campusRecruitmentAudit20260811';
import { STATE_OWNED_STANDARD_COMPANIES } from './stateOwnedStandardCompanies20260813';

export interface HotCompany {
  name: string;
  updateDate?: string;
  industry: string;
  city: string;
  url: string;
  companyType?: string;
  industryTags?: string[];
  noticeUrl?: string;
  applyUrl?: string;
  deadlineText?: string;
  records?: number;
  source?: 'excel' | 'private' | 'legacy';
  recruitment?: CampusRecruitmentAudit;
}

export interface HotCompanyGroup {
  name: string;
  dot: string;
  companies: HotCompany[];
}

const BASE_HOT_COMPANY_GROUPS: HotCompanyGroup[] = [
  { name: "半导体 · 芯片 · 显示", dot: "#8ba3bd", companies: [
    { name: "中芯国际", industry: "晶圆代工", city: "上海", url: "https://smics.zhiye.com/campus" },
    { name: "长江存储", industry: "存储芯片", city: "武汉", url: "https://ymtc-campus.zhiye.com" },
    { name: "长鑫存储", industry: "存储芯片", city: "合肥", url: "https://cxmt.zhiye.com/campus/jobs" },
    { name: "北方华创", industry: "半导体设备", city: "北京", url: "https://career.naura.com/campus" },
    { name: "韦尔股份", industry: "图像传感器", city: "上海", url: "https://ovt-omnivision.zhiye.com/Campus" },
    { name: "紫光展锐", industry: "手机芯片", city: "上海", url: "https://www.hotjob.cn/wt/UNISOC/web/index?brandCode=1" },
    { name: "寒武纪", industry: "AI 芯片", city: "北京", url: "https://app.mokahr.com/campus-recruitment/cambricon" },
    { name: "台积电", industry: "晶圆代工", city: "南京", url: "https://careers.tsmc.com/zh_TW/careers" },
    { name: "华虹 · 华力", industry: "晶圆代工", city: "上海", url: "https://app.mokahr.com/campus-recruitment/huahong/78009" },
    { name: "华润微电子", industry: "功率半导体", city: "无锡", url: "https://runjob.crc.com.cn/" },
    { name: "晶合集成", industry: "晶圆代工", city: "合肥", url: "https://nexchip.zhiye.com" },
    { name: "芯碁微装", industry: "直写光刻设备", city: "合肥", url: "https://cfmee.zhiye.com" },
    { name: "鹏芯微", industry: "晶圆代工", city: "深圳", url: "https://career.pxwsemi.com" },
    { name: "鹏新旭", industry: "半导体制造", city: "深圳", url: "https://pensun.zhiye.com/campus/jobs" },
    { name: "新凯来", industry: "半导体设备", city: "深圳", url: "https://career.sicarrier.com" },
    { name: "深南电路", industry: "PCB · 封装基板", city: "深圳", url: "https://scc.zhiye.com" },
    { name: "江丰电子", industry: "溅射靶材", city: "宁波", url: "https://www.kfmic.com/join" },
    { name: "睿创微纳", industry: "红外传感", city: "烟台", url: "https://www.raytrontek.com/news/news-detail-1019.htm" },
    { name: "京东方", industry: "显示面板", city: "北京", url: "https://campus.boe.com" },
    { name: "维信诺", industry: "OLED 面板", city: "昆山", url: "https://visionox.zhiye.com" },
    { name: "翰博高新", industry: "显示材料", city: "合肥", url: "http://www.hibr.com.cn/job_us.php?c_id=52" },
  ] },
  { name: "新能源车 · 整车", dot: "#93a98c", companies: [
    { name: "比亚迪", industry: "新能源整车", city: "深圳", url: "https://job.byd.com" },
    { name: "蔚来", industry: "智能电动车", city: "上海", url: "https://campus.nio.com/" },
    { name: "理想汽车", industry: "智能电动车", city: "北京", url: "https://www.lixiang.com/employ/campus/list.html" },
    { name: "小鹏汽车", industry: "智能电动车", city: "广州", url: "https://xiaopeng.jobs.feishu.cn/campus" },
    { name: "小米汽车", industry: "智能电动车", city: "北京", url: "https://hr.xiaomi.com/campus" },
    { name: "极氪", industry: "智能电动车", city: "杭州", url: "https://campus.zeekrlife.com" },
    { name: "零跑", industry: "智能电动车", city: "杭州", url: "https://leapmotor.zhiye.com/campus" },
    { name: "赛力斯", industry: "新能源整车", city: "重庆", url: "https://sokon.zhiye.com/campus" },
    { name: "特斯拉", industry: "智能电动车", city: "上海", url: "https://app.mokahr.com/campus-recruitment/tesla/41460" },
    { name: "奇瑞", industry: "整车", city: "芜湖", url: "https://chery.zhiye.com/campus" },
    { name: "吉利", industry: "整车", city: "杭州", url: "https://campus.geely.com" },
    { name: "长安汽车", industry: "整车", city: "重庆", url: "https://changan.zhiye.com/Campus" },
    { name: "上汽集团", industry: "整车", city: "上海", url: "https://saic-recruit.saicmotor.com" },
    { name: "中国一汽", industry: "整车", city: "长春", url: "https://faw-zhaopin.hotjob.cn/" },
    { name: "江淮汽车", industry: "整车", city: "合肥", url: "https://jac.zhiye.com" },
    { name: "宇通", industry: "客车", city: "郑州", url: "https://join.yutong.com" },
    { name: "开沃", industry: "新能源客车", city: "南京", url: "https://www.skywellcorp.com/join" },
  ] },
  { name: "汽车电子 · 零部件", dot: "#a08cb5", companies: [
    { name: "博世", industry: "汽车零部件", city: "上海", url: "https://jobs.bosch.com/zh-cn/" },
    { name: "联合电子", industry: "汽车电子", city: "上海", url: "https://www.hotjob.cn/wt/UAES/web/index" },
    { name: "经纬恒润", industry: "汽车电子", city: "北京", url: "http://zhaopin.hirain.com" },
    { name: "禾赛", industry: "激光雷达", city: "上海", url: "https://kwh0jtf778.jobs.feishu.cn/229043" },
    { name: "福耀科技", industry: "汽车玻璃", city: "福州", url: "https://job.fuyaogroup.com/fuyao/position/index?recruitmentType=CAMPUSRECRUITMENT" },
    { name: "万向", industry: "汽车零部件", city: "杭州", url: "https://app.mokahr.com/campus-recruitment/wanxiang/144360" },
    { name: "巨一科技", industry: "电驱 · 智能装备", city: "合肥", url: "https://www.jee-cn.com/join/school.html" },
    { name: "联创电子", industry: "光学电子", city: "南昌", url: "https://www.lcetron.com/join" },
  ] },
  { name: "电池 · 能源", dot: "#c9906b", companies: [
    { name: "宁德时代", industry: "动力电池", city: "宁德", url: "https://talent.catl.com" },
    { name: "中创新航", industry: "动力电池", city: "常州", url: "https://calbjs.zhiye.com/campus/jobs" },
    { name: "亿纬锂能", industry: "锂电池", city: "惠州", url: "https://www.evebattery.com/join-us" },
    { name: "欣旺达", industry: "锂电池", city: "深圳", url: "https://sunwodacampus.zhiye.com/" },
    { name: "国轩高科", industry: "动力电池", city: "合肥", url: "https://gotion.zhiye.com" },
    { name: "隆基绿能", industry: "光伏", city: "西安", url: "https://longi.hotjob.cn/" },
    { name: "阳光电源", industry: "光伏逆变器", city: "合肥", url: "https://jobs.sungrowpower.com" },
    { name: "远景", industry: "风电 · 储能", city: "上海", url: "https://envision-career.com" },
    { name: "三一重能", industry: "风电装备", city: "北京", url: "https://sany.zhiye.com" },
    { name: "禾迈", industry: "微型逆变器", city: "杭州", url: "https://www.hoymiles.com/cn/careers/" },
    { name: "正浩 EcoFlow", industry: "便携储能", city: "深圳", url: "https://jobs.ecoflow.com/602892" },
    { name: "威迈斯", industry: "车载电源", city: "深圳", url: "https://vmax.zhiye.com/Campus" },
    { name: "科华数据", industry: "电源 · 数据中心", city: "厦门", url: "https://kehua.zhiye.com" },
    { name: "特变电工", industry: "输变电装备", city: "昌吉", url: "http://tbea.hotjob.cn" },
    { name: "中国能建", industry: "能源工程", city: "北京", url: "https://ceec.iguopin.com" },
  ] },
  { name: "高端制造 · 装备", dot: "#c39aa0", companies: [
    { name: "汇川技术", industry: "工业自动化", city: "深圳", url: "https://inovance.zhiye.com/campus" },
    { name: "大疆", industry: "无人机", city: "深圳", url: "https://we.dji.com/zh-CN/campus" },
    { name: "三一重工", industry: "工程机械", city: "长沙", url: "https://sany.zhiye.com/campus/jobs" },
    { name: "立讯精密", industry: "精密制造", city: "东莞", url: "https://luxshare.hotjob.cn/" },
    { name: "徐工", industry: "工程机械", city: "徐州", url: "https://app.mokahr.com/campus-recruitment/xcmg" },
    { name: "卡特彼勒", industry: "工程机械", city: "徐州", url: "https://careers.caterpillar.com/zh/%E8%81%8C%E4%BD%8D/?search=campushire&country=China" },
    { name: "山推", industry: "工程机械", city: "济宁", url: "https://www.shantui.com/about/xiao-yuan-zhao-pin.jsp" },
    { name: "合力叉车", industry: "工业车辆", city: "合肥", url: "https://www.helichina.com/contact/job/" },
    { name: "海天塑机", industry: "注塑机", city: "宁波", url: "https://haitian.zhiye.com/campus" },
    { name: "豪迈", industry: "精密机械", city: "高密", url: "https://himile.zhiye.com" },
    { name: "南高齿", industry: "风电齿轮", city: "南京", url: "https://www.ngctransmission.com/cn/career" },
    { name: "中国中车", industry: "轨道交通", city: "北京", url: "https://crrc.hotjob.cn/" },
    { name: "宏工科技", industry: "物料自动化", city: "东莞", url: "https://www.honggong.com/join" },
    { name: "东华工程", industry: "化工工程", city: "合肥", url: "https://chinaecec.zhiye.com" },
    { name: "西门子", industry: "工业科技", city: "北京", url: "https://jobs.siemens.com.cn/siemens/position/index?recruitmentType=CAMPUSRECRUITMENT" },
    { name: "施耐德", industry: "能效管理", city: "北京", url: "https://careers.se.com/china" },
    { name: "科大智能电气", industry: "电气自动化", city: "合肥", url: "https://www.csg.com.cn/jrwm" },
    { name: "英威腾", industry: "变频器 · 电源", city: "深圳", url: "https://invt.zhiye.com/campus" },
    { name: "宝钢", industry: "钢铁材料", city: "上海", url: "https://www.baosteel.com/join" },
    { name: "邦德", industry: "激光装备", city: "济南", url: "https://bodor.com/en/recruit/" },
  ] },
  { name: "家电 · 消费电子", dot: "#7ea6a0", companies: [
    { name: "美的集团", industry: "智能家电", city: "佛山", url: "https://careers.midea.com" },
    { name: "海尔", industry: "智能家电", city: "青岛", url: "https://maker.haier.net/client/campus/index" },
    { name: "格力", industry: "家电 · 装备", city: "珠海", url: "https://www.gree.com" },
    { name: "海信", industry: "家电 · 显示", city: "青岛", url: "https://jobs.hisense.com" },
    { name: "TCL", industry: "家电 · 显示", city: "惠州", url: "https://campus.tcl.com" },
    { name: "长虹", industry: "家电", city: "绵阳", url: "http://group.changhong.com/jrzh_295/xyzp/" },
    { name: "奥克斯", industry: "空调", city: "宁波", url: "https://auxgroup.zhiye.com/campus" },
    { name: "中科美菱", industry: "低温设备", city: "合肥", url: "http://www.zkmeiling.com/info.php?class_id=106104101" },
    { name: "方太", industry: "厨电", city: "宁波", url: "https://fotile.zhiye.com/campus" },
    { name: "公牛", industry: "电工电器", city: "宁波", url: "https://gongniu.zhiye.com/Campus" },
    { name: "科沃斯", industry: "服务机器人", city: "苏州", url: "https://hr.ecovacs.cn/" },
    { name: "九号公司", industry: "智能短交通", city: "北京", url: "https://join.ninebot.com/campus" },
    { name: "安克创新", industry: "消费电子", city: "长沙", url: "https://career.anker.com.cn/universities/recruitment/" },
    { name: "小天才", industry: "智能硬件", city: "东莞", url: "http://xiaozhao.eebbk.com" },
    { name: "OPPO", industry: "智能手机", city: "东莞", url: "https://careers.oppo.com/campus" },
    { name: "联想", industry: "PC · 智能设备", city: "北京", url: "https://talent.lenovo.com.cn" },
    { name: "联宝", industry: "电子制造", city: "合肥", url: "https://lcfc.zhiye.com/campus" },
    { name: "歌尔", industry: "声学 · 光学", city: "潍坊", url: "https://goertek.hotjob.cn/" },
    { name: "瑞声科技", industry: "声学器件", city: "深圳", url: "https://talent.aactechnologies.com/campus" },
    { name: "和而泰", industry: "智能控制器", city: "深圳", url: "https://www.szhittech.com/join" },
    { name: "爱玛", industry: "电动两轮车", city: "天津", url: "https://xyz.51job.com/External/Apply.aspx?CtmID=7051515" },
    { name: "雅迪", industry: "电动两轮车", city: "无锡", url: "https://www.yadea.com.cn/add-us" },
    { name: "得力", industry: "办公用品", city: "宁波", url: "https://app.mokahr.com/campus-recruitment/nbdeli/70019?locale=zh-CN" },
  ] },
  { name: "互联网 · 科技", dot: "#bfa871", companies: [
    { name: "华为", industry: "ICT · 终端", city: "深圳", url: "https://career.huawei.com/cn/campus-recruitment" },
    { name: "腾讯", industry: "互联网", city: "深圳", url: "https://join.qq.com" },
    { name: "字节跳动", industry: "互联网", city: "北京", url: "https://jobs.bytedance.com/campus" },
    { name: "美团", industry: "本地生活", city: "北京", url: "https://zhaopin.meituan.com/web/campus" },
    { name: "阿里巴巴", industry: "电商 · 云计算", city: "杭州", url: "https://campus-talent.alibaba.com/" },
    { name: "京东", industry: "电商 · 物流", city: "北京", url: "https://campus.jd.com/" },
    { name: "顺丰", industry: "快递物流", city: "深圳", url: "https://campus.sf-express.com" },
    { name: "途虎养车", industry: "汽车服务", city: "上海", url: "https://app.mokahr.com/m/campus_apply/tuhu/28398" },
    { name: "得物", industry: "潮流电商", city: "上海", url: "https://campus.dewu.com" },
    { name: "SHEIN", industry: "跨境电商", city: "广州", url: "https://talent.sheincorp.cn" },
    { name: "科大讯飞", industry: "AI · 语音", city: "合肥", url: "https://iflytek.zhiye.com" },
    { name: "中兴", industry: "通信设备", city: "深圳", url: "https://job.zte.com.cn/cn/campus-recruitment/Recruitment_positions/future.html" },
    { name: "海康威视", industry: "智能物联", city: "杭州", url: "https://campushr.hikvision.com/" },
    { name: "锐捷网络", industry: "网络设备", city: "福州", url: "https://www.ruijie.com.cn/campus-recruiting/" },
    { name: "TP-LINK", industry: "网络设备", city: "深圳", url: "https://hr.tp-link.com.cn/m/" },
    { name: "海德斯", industry: "通信设备", city: "", url: "https://career.h3c.com/campus/jobs" },
  ] },
  { name: "快消 · 医疗", dot: "#c78f7e", companies: [
    { name: "宝洁", industry: "日化快消", city: "广州", url: "https://careers.pg.com.cn" },
    { name: "亿滋", industry: "食品", city: "上海", url: "https://campus.51job.com/2026mdlz" },
    { name: "伊利", industry: "乳业", city: "呼和浩特", url: "https://yili.hotjob.cn/" },
    { name: "蒙牛", industry: "乳业", city: "呼和浩特", url: "https://mengniu.zhiye.com/custom/xiaoyuan" },
    { name: "农夫山泉", industry: "饮料", city: "杭州", url: "https://www.nongfuspring.com/careers" },
    { name: "蜜雪冰城", industry: "茶饮", city: "郑州", url: "https://careers.mxbc.com/campus" },
    { name: "迪卡侬", industry: "体育零售", city: "上海", url: "https://recruitment.decathlon.com.cn/p/campus.html" },
    { name: "安踏", industry: "运动服饰", city: "晋江", url: "https://campus.anta.com" },
    { name: "三棵树", industry: "涂料", city: "莆田", url: "https://skshu.zhiye.com" },
    { name: "迈瑞医疗", industry: "医疗器械", city: "深圳", url: "https://career.mindray.com/campus/jobs" },
    { name: "英科医疗", industry: "医疗耗材", city: "淄博", url: "https://intco.zhiye.com" },
  ] },
  { name: "采矿", dot: "#9a7b55", companies: [
    { name: "国家能源集团", industry: "煤炭 · 能源", city: "", url: "https://zhaopin.chnenergy.com.cn/recTypeSerch?kinds=1" },
    { name: "中国神华", industry: "煤炭 · 能源", city: "", url: "http://www.shenhuachina.com/zgshww/rczp02/rczplist.shtml" },
    { name: "中国中煤", industry: "煤炭 · 能源", city: "", url: "https://zhaopin.chinacoal.com" },
    { name: "陕煤集团", industry: "煤炭 · 能源", city: "", url: "https://webhr.shccig.com/webhrN2-zp" },
    { name: "山东能源", industry: "煤炭 · 能源", city: "", url: "https://zhaopin.shandong-energy.com/recruit" },
    { name: "兖矿能源", industry: "煤炭 · 能源", city: "", url: "https://zhaopin.shandong-energy.com/recruit" },
    { name: "山西焦煤", industry: "煤炭 · 能源", city: "", url: "https://www.sxcc.com.cn/tzgg/37618.jhtml" },
    { name: "晋能控股", industry: "煤炭 · 能源", city: "", url: "https://www.jnkgjtnews.com/info/1009/47856.htm" },
    { name: "潞安化工", industry: "煤炭 · 能源", city: "", url: "https://www.chinaluan.com/tzgg/" },
    { name: "淮北矿业", industry: "煤炭 · 能源", city: "", url: "http://www.hbcoal.com/rczp2.htm" },
    { name: "河南能源", industry: "煤炭 · 能源", city: "", url: "https://hnecgc.com.cn/m/henc/" },
    { name: "华阳集团", industry: "煤炭 · 能源", city: "", url: "https://zhaopin.ymjt.com.cn" },
    { name: "紫金矿业", industry: "黄金", city: "", url: "https://join.zjky.cn" },
    { name: "山东黄金", industry: "黄金", city: "", url: "https://sdhjjt.zhaopin.com" },
    { name: "招金矿业", industry: "黄金", city: "", url: "https://www.zhaojin.com.cn/recruit/campus.html" },
    { name: "中国黄金集团", industry: "黄金", city: "", url: "https://hjzp.chinagoldgroup.com/recruit" },
    { name: "赤峰黄金", industry: "黄金", city: "", url: "https://www.cfgold.com/cn/join-us/recruitment/" },
    { name: "湖南黄金", industry: "黄金", city: "", url: "http://www.hngoldcorp.com/job/list-400.html" },
    { name: "江西铜业", industry: "有色 · 金属矿", city: "", url: "https://www.jxcc.com/join/xyJoinList.html" },
    { name: "洛阳钼业", industry: "有色 · 金属矿", city: "", url: "https://www.cmoc.com/html/CareerDevelopment/CampusRecruitment/" },
    { name: "中国五矿", industry: "有色 · 金属矿", city: "", url: "https://zhaopin.minmetals.com.cn" },
    { name: "中国有色矿业集团", industry: "有色 · 金属矿", city: "", url: "https://hrcnmc.iguopin.com/" },
    { name: "中色股份", industry: "有色 · 金属矿", city: "", url: "https://nfc.cnmc.com.cn/jsjs/rlzy/rczp/xyzp/A027008003001Gone1.html" },
    { name: "中铝集团", industry: "有色 · 金属矿", city: "", url: "https://chinalco.iguopin.com/" },
    { name: "云南铜业", industry: "有色 · 金属矿", city: "", url: "https://ynty.chinalco.com.cn/lxwm/zxns/" },
    { name: "驰宏锌锗", industry: "有色 · 金属矿", city: "", url: "https://chxz.chinalco.com.cn/rlzy/" },
    { name: "金川集团", industry: "有色 · 金属矿", city: "", url: "https://www.jnmc.com/" },
    { name: "西部矿业", industry: "有色 · 金属矿", city: "", url: "https://www.westmining.com/rlzy/xyzp/" },
    { name: "云锡 / 锡业股份", industry: "有色 · 金属矿", city: "", url: "https://www.ytc.cn/xxgk/gsgg.htm" },
    { name: "厦门钨业", industry: "有色 · 金属矿", city: "", url: "https://campus.51job.com/cxtc2026/" },
    { name: "中国稀土集团", industry: "稀土 · 盐湖 · 锂钴 · 铁矿", city: "", url: "https://www.regcc.cn/zgxtjt/zpdt/list.shtml" },
    { name: "北方稀土", industry: "稀土 · 盐湖 · 锂钴 · 铁矿", city: "", url: "https://www.reht.com/index/Lxwm.do?LB=1&TYPE_CODE=020901" },
    { name: "盛和资源", industry: "稀土 · 盐湖 · 锂钴 · 铁矿", city: "", url: "http://shengheholding.com/resouce.aspx?t=35" },
    { name: "盐湖股份", industry: "稀土 · 盐湖 · 锂钴 · 铁矿", city: "", url: "https://www.qhyhgf.com/newsinfo/8772808.html" },
    { name: "藏格矿业", industry: "稀土 · 盐湖 · 锂钴 · 铁矿", city: "", url: "https://www.zanggekuangye.com/careers/campus/index.html" },
    { name: "中矿资源", industry: "稀土 · 盐湖 · 锂钴 · 铁矿", city: "", url: "https://www.sinomine.cn/33.html" },
    { name: "赣锋锂业", industry: "稀土 · 盐湖 · 锂钴 · 铁矿", city: "", url: "https://www.ganfenglithium.com/career.html" },
    { name: "天齐锂业", industry: "稀土 · 盐湖 · 锂钴 · 铁矿", city: "", url: "https://tianqilithium-hr.zhiye.com/campus/jobs" },
    { name: "华友钴业", industry: "稀土 · 盐湖 · 锂钴 · 铁矿", city: "", url: "https://campus.huayou.com/" },
    { name: "宝武资源", industry: "稀土 · 盐湖 · 锂钴 · 铁矿", city: "", url: "https://campus.51job.com/baosteelresources2026/" },
  ] },
];

const BASE_FEATURED_COMPANY_GROUPS: HotCompanyGroup[] = [
  { name: "国企", dot: "#c14f3f", companies: [
    ...STATE_OWNED_STANDARD_COMPANIES,
    { name: "中远海运", industry: "航运 · 物流", city: "全国", url: "https://coscoshipping.iguopin.com" },
  ] },
  { name: "外企", dot: "#567da5", companies: [
    { name: "微软", industry: "软件 · 云计算 · AI", city: "北京 · 上海 · 苏州", url: "https://www.microsoft.com/zh-cn/aprd/recruitment" },
    { name: "苹果", industry: "消费电子 · 软件", city: "北京 · 上海 · 深圳", url: "https://www.apple.com/careers/cn/students.html" },
    { name: "亚马逊", industry: "云计算 · 电商", city: "北京 · 上海 · 深圳", url: "https://www.amazon.jobs/en/jobs/10489936/applied-scientist-2026-27-campus-international-technology-team-beijing" },
    { name: "IBM", industry: "企业服务 · AI", city: "北京 · 上海 · 深圳", url: "https://www.ibm.com/cn-zh/careers/career-opportunities" },
    { name: "英特尔", industry: "半导体 · 芯片", city: "北京 · 上海 · 深圳", url: "https://chinacampus.jobs.intel.cn/intel/position/index" },
    { name: "英伟达", industry: "AI · 芯片", city: "北京 · 上海 · 深圳", url: "https://www.nvidia.cn/about-nvidia/careers/university-recruiting/" },
    { name: "特斯拉", industry: "新能源汽车 · 能源", city: "上海 · 北京", url: "https://app.mokahr.com/campus-recruitment/tesla/41460" },
    { name: "西门子", industry: "工业科技 · 数字化", city: "北京 · 上海 · 苏州", url: "https://www.siemens.com/zh-cn/company/jobs/early-career-programs/" },
    { name: "博世", industry: "汽车零部件 · 工业", city: "上海 · 苏州 · 无锡", url: "https://jobs.bosch.com/zh-cn/" },
    { name: "施耐德", industry: "能源管理 · 自动化", city: "北京 · 上海 · 无锡", url: "https://careers.se.com/china" },
    { name: "ABB", industry: "电气 · 自动化", city: "北京 · 上海 · 厦门", url: "https://careers.abb/china/zh/graduates-entry-level" },
    { name: "宝洁", industry: "日化 · 快消", city: "广州 · 北京 · 上海", url: "https://careers.pg.com.cn" },
    { name: "联合利华", industry: "快消 · 食品", city: "上海 · 合肥 · 广州", url: "https://careers.unilever.com/en/early-careers" },
    { name: "欧莱雅", industry: "美妆 · 消费品", city: "上海 · 苏州 · 广州", url: "https://careers.loreal.com/zh_CN/content/China" },
    { name: "雀巢", industry: "食品 · 饮料", city: "北京 · 上海 · 广州", url: "https://www.nestlecareers.cn/zh-hans/application-process" },
    { name: "玛氏", industry: "食品 · 宠物护理", city: "北京 · 上海 · 广州", url: "https://careers.mars.com/cn/zh/students-graduates" },
    { name: "耐克", industry: "运动消费品", city: "上海 · 深圳", url: "https://careers.nike.com/zh-cn/jobs" },
    { name: "迪卡侬", industry: "体育零售", city: "上海 · 全国", url: "https://recruitment.decathlon.com.cn/p/campus.html" },
    { name: "强生", industry: "医疗健康", city: "上海 · 北京 · 苏州", url: "https://chinacampus.jnj.com.cn/jnj/home/index/" },
    { name: "阿斯利康", industry: "医药 · 生物科技", city: "上海 · 无锡 · 北京", url: "https://app.mokahr.com/campus-recruitment/astrazeneca/148833" },
    { name: "赫思曼", industry: "工业网络 · 通信", city: "中国", url: "https://careers.belden.com/content/EarlyCareer/?locale=en_US" },
    { name: "科宝", industry: "工业自动化", city: "中国", url: "https://www.kobold.cn/Ab_index_gci_10.html" },
    { name: "天祥认证", industry: "检测认证", city: "中国", url: "https://www.intertek.com/careers/" },
    { name: "威图", industry: "工业机柜 · 自动化", city: "中国", url: "https://www.rittal.com/cn-zh/Company/Karriere" },
    { name: "娇兰", industry: "美妆 · 消费品", city: "中国", url: "https://www.guerlain.com.cn/landing/join-us" },
    { name: "徕卡", industry: "光学 · 影像", city: "中国", url: "https://www.leica-camera.cn/company/career" },
    { name: "芙丽芳丝", industry: "美妆 · 消费品", city: "中国", url: "https://www.kao.com/cn/careers/" },
    { name: "亿滋", industry: "食品 · 快消", city: "中国", url: "https://campus.51job.com/2026mdlz" },
    { name: "礼来", industry: "医药 · 生物科技", city: "中国", url: "https://careersite.tupu360.com/lilly/home/index/" },
    { name: "施克", industry: "传感器 · 自动化", city: "中国", url: "https://www.sick.com/cn/zh/career/w/career" },
    { name: "杜蕾斯", industry: "快消 · 健康", city: "中国", url: "https://careers.reckitt.com/?locale=zh_CN" },
    { name: "赛默飞", industry: "生命科学 · 医疗", city: "中国", url: "https://jobs.thermofisher.com/cn/zh/students-new-grads" },
    { name: "雅培", industry: "医疗健康", city: "中国", url: "https://www.abbott.com.cn/careers/students.html" },
    { name: "阿科玛", industry: "化工材料", city: "中国", url: "https://jobs.arkema.com/go/%E6%A0%A1%E6%8B%9B-jobs-for-students/4222301/" },
    { name: "欧舒丹", industry: "美妆 · 消费品", city: "中国", url: "https://careers.loccitane.com/" },
    { name: "蔡司", industry: "光学 · 医疗", city: "中国", url: "https://www.zeiss.com/career/zh_cn/home.html" },
    { name: "黛珂", industry: "美妆 · 消费品", city: "中国", url: "https://www.kose.com.cn/job.php" },
    { name: "雀巢奈斯派索", industry: "食品 · 饮料", city: "中国", url: "https://www.nestlecareers.cn/zh-hans/trainee-programme" },
    { name: "诺华", industry: "医药 · 生物科技", city: "中国", url: "https://www.novartis.com.cn/careers" },
    { name: "图尔克", industry: "工业自动化", city: "中国", url: "https://www.turck.com.cn/cn/careers-140.php" },
    { name: "安捷伦", industry: "生命科学 · 仪器", city: "中国", url: "https://careers.agilent.com/graduates-students/" },
    { name: "波科", industry: "医疗器械", city: "中国", url: "https://bostonscientific.cn/CareerDevelopment/CampusRecruitment" },
    { name: "索尔维", industry: "化工材料", city: "中国", url: "https://careers.solvay.com/job-?locale=zh_CN" },
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
