export interface CampusCompany {
  name: string;
  url: string;
}

export interface CapitalCampusCity {
  name: string;
  province: string;
  lng: number;
  lat: number;
  companies: CampusCompany[];
}

/** 仅由「各省会代表性企业-校招网址.md」解析，整理日 2026-08-16。 */
export const CAPITAL_CAMPUS_CITIES: CapitalCampusCity[] = [
  {
    "name": "北京",
    "province": "北京市",
    "lng": 116.41,
    "lat": 39.9,
    "companies": [
      {
        "name": "字节跳动",
        "url": "https://jobs.bytedance.com/campus"
      },
      {
        "name": "百度",
        "url": "https://talent.baidu.com/jobs/campus"
      },
      {
        "name": "京东",
        "url": "https://campus.jd.com"
      },
      {
        "name": "美团",
        "url": "https://zhaopin.meituan.com/web/campus"
      },
      {
        "name": "小米",
        "url": "https://hr.xiaomi.com/campus"
      },
      {
        "name": "快手",
        "url": "https://campus.kuaishou.cn"
      },
      {
        "name": "滴滴",
        "url": "https://campus.didiglobal.com"
      },
      {
        "name": "联想",
        "url": "https://talent.lenovo.com.cn/"
      },
      {
        "name": "工商银行",
        "url": "https://job.icbc.com.cn"
      },
      {
        "name": "建设银行",
        "url": "https://job.ccb.com"
      },
      {
        "name": "农业银行",
        "url": "https://career.abchina.com.cn"
      },
      {
        "name": "国家电网",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "中国石油",
        "url": "https://zhaopin.cnpc.com.cn"
      },
      {
        "name": "中国移动",
        "url": "https://job.10086.cn"
      },
      {
        "name": "贝壳找房",
        "url": "https://campus.ke.com/"
      },
      {
        "name": "理想汽车",
        "url": "https://www.lixiang.com/employ/campus.html"
      },
      {
        "name": "北汽集团",
        "url": "https://baicgroup.zhiye.com/"
      },
      {
        "name": "中国电信",
        "url": "https://job.chinatelecom.com.cn/"
      },
      {
        "name": "中国石化",
        "url": "http://job.sinopec.com"
      },
      {
        "name": "360集团",
        "url": "https://campus.360.cn"
      }
    ]
  },
  {
    "name": "天津",
    "province": "天津市",
    "lng": 117.2,
    "lat": 39.13,
    "companies": [
      {
        "name": "天津银行",
        "url": "https://www.bankoftianjin.com/tianjincareer/xyzp/index.html"
      },
      {
        "name": "渤海银行",
        "url": "https://www.cbhb.com.cn/cbhbank/jrwm/zpxx/index.shtml"
      },
      {
        "name": "中国海油",
        "url": "https://cnooc.zhaopin.com"
      },
      {
        "name": "天津港集团",
        "url": "https://www.ptacn.com/channels/34.html"
      },
      {
        "name": "天士力",
        "url": "https://tasly.zhaopin.com"
      },
      {
        "name": "一汽丰田",
        "url": "https://zhaopin.faw.com.cn"
      },
      {
        "name": "中建六局",
        "url": "https://6bur.cscec.com/zyfz2/zpxx2/"
      },
      {
        "name": "中交一航局",
        "url": "https://www.ccccyhj.com/channel/55.html"
      },
      {
        "name": "中铁十八局",
        "url": "http://cr18g.crcc.cn/"
      },
      {
        "name": "天津农商银行",
        "url": "https://www.trcbank.com.cn/class/xyzp/index.htm"
      },
      {
        "name": "TCL中环",
        "url": "https://zhonghuan.zhiye.com/campus"
      },
      {
        "name": "力神电池",
        "url": "https://lishen.zhaopin.com/"
      },
      {
        "name": "中国中车",
        "url": "https://crrc.hotjob.cn/"
      },
      {
        "name": "国家电网",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "中国移动",
        "url": "https://job.10086.cn"
      },
      {
        "name": "工商银行",
        "url": "https://job.icbc.com.cn"
      },
      {
        "name": "建设银行",
        "url": "https://job.ccb.com"
      },
      {
        "name": "农业银行",
        "url": "https://career.abchina.com.cn"
      },
      {
        "name": "中国石化",
        "url": "http://job.sinopec.com"
      },
      {
        "name": "中国石油",
        "url": "https://zhaopin.cnpc.com.cn"
      }
    ]
  },
  {
    "name": "石家庄",
    "province": "河北省",
    "lng": 114.48,
    "lat": 38.04,
    "companies": [
      {
        "name": "河北银行",
        "url": "https://hebbank.zhiye.com/Campus"
      },
      {
        "name": "石药集团",
        "url": "https://cspc.cn/hr/index.html"
      },
      {
        "name": "华北制药",
        "url": "http://www.ncpc.com"
      },
      {
        "name": "河钢集团",
        "url": "https://hbisco.com/joinus"
      },
      {
        "name": "以岭药业",
        "url": "https://www.hotjob.cn/wt/yiling/web/index/campus"
      },
      {
        "name": "冀中能源",
        "url": "http://www.jznyjt.com/"
      },
      {
        "name": "长城汽车",
        "url": "https://zhaopin.gwm.cn"
      },
      {
        "name": "河北建投",
        "url": "https://hecic2026.zhaopin.com"
      },
      {
        "name": "新奥集团",
        "url": "https://enn.zhiye.com/Campus"
      },
      {
        "name": "国家电网",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "中国移动",
        "url": "https://job.10086.cn"
      },
      {
        "name": "工商银行",
        "url": "https://job.icbc.com.cn"
      },
      {
        "name": "建设银行",
        "url": "https://job.ccb.com"
      },
      {
        "name": "农业银行",
        "url": "https://career.abchina.com.cn"
      },
      {
        "name": "中国石化",
        "url": "http://job.sinopec.com"
      },
      {
        "name": "中国石油",
        "url": "https://zhaopin.cnpc.com.cn"
      },
      {
        "name": "中国电信",
        "url": "https://job.chinatelecom.com.cn/"
      },
      {
        "name": "中国中车",
        "url": "https://crrc.hotjob.cn/"
      },
      {
        "name": "国家能源集团",
        "url": "https://zhaopin.chnenergy.com.cn"
      },
      {
        "name": "中国中煤",
        "url": "https://zhaopin.chinacoal.com"
      }
    ]
  },
  {
    "name": "太原",
    "province": "山西省",
    "lng": 112.55,
    "lat": 37.87,
    "companies": [
      {
        "name": "晋商银行",
        "url": "https://www.jshbank.com/"
      },
      {
        "name": "山西焦煤",
        "url": "https://www.sxcc.com.cn/"
      },
      {
        "name": "晋能控股",
        "url": "https://www.jnkgjtnews.com/tzgg.htm"
      },
      {
        "name": "太钢集团",
        "url": "https://zhaopin.tisco.com.cn/"
      },
      {
        "name": "山西汾酒",
        "url": "https://www.fenjiu.com.cn/"
      },
      {
        "name": "太重集团",
        "url": "https://www.tz.com.cn/"
      },
      {
        "name": "山西建投",
        "url": "https://www.sxcig.com/xxgk/rczp/1.htm"
      },
      {
        "name": "国家电网",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "中国移动",
        "url": "https://job.10086.cn"
      },
      {
        "name": "工商银行",
        "url": "https://job.icbc.com.cn"
      },
      {
        "name": "建设银行",
        "url": "https://job.ccb.com"
      },
      {
        "name": "农业银行",
        "url": "https://career.abchina.com.cn"
      },
      {
        "name": "中国石化",
        "url": "http://job.sinopec.com"
      },
      {
        "name": "中国石油",
        "url": "https://zhaopin.cnpc.com.cn"
      },
      {
        "name": "中国电信",
        "url": "https://job.chinatelecom.com.cn/"
      },
      {
        "name": "国家能源集团",
        "url": "https://zhaopin.chnenergy.com.cn"
      },
      {
        "name": "中国中煤",
        "url": "https://zhaopin.chinacoal.com"
      },
      {
        "name": "中国中车",
        "url": "https://crrc.hotjob.cn/"
      },
      {
        "name": "中国人寿",
        "url": "https://chinalife.zhiye.com/"
      },
      {
        "name": "中国建筑",
        "url": "https://recruit.cscec.com/"
      }
    ]
  },
  {
    "name": "呼和浩特",
    "province": "内蒙古自治区",
    "lng": 111.75,
    "lat": 40.84,
    "companies": [
      {
        "name": "伊利集团",
        "url": "https://yili.hotjob.cn/wt/yili/web/index/campus"
      },
      {
        "name": "蒙牛乳业",
        "url": "https://mengniu.zhiye.com/custom/xiaoyuan"
      },
      {
        "name": "内蒙古银行",
        "url": "https://www.boimc.com.cn/"
      },
      {
        "name": "蒙商银行",
        "url": "https://msbank.zhiye.com/campus/jobs"
      },
      {
        "name": "内蒙古电力",
        "url": "https://zhaopin.impc.com.cn"
      },
      {
        "name": "国家能源集团",
        "url": "https://zhaopin.chnenergy.com.cn"
      },
      {
        "name": "中国中煤",
        "url": "https://zhaopin.chinacoal.com"
      },
      {
        "name": "TCL中环",
        "url": "https://zhonghuan.zhiye.com/campus"
      },
      {
        "name": "国家电网",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "中国移动",
        "url": "https://job.10086.cn"
      },
      {
        "name": "工商银行",
        "url": "https://job.icbc.com.cn"
      },
      {
        "name": "建设银行",
        "url": "https://job.ccb.com"
      },
      {
        "name": "农业银行",
        "url": "https://career.abchina.com.cn"
      },
      {
        "name": "中国石化",
        "url": "http://job.sinopec.com"
      },
      {
        "name": "中国石油",
        "url": "https://zhaopin.cnpc.com.cn"
      },
      {
        "name": "中国电信",
        "url": "https://job.chinatelecom.com.cn/"
      },
      {
        "name": "中国人寿",
        "url": "https://chinalife.zhiye.com/"
      },
      {
        "name": "中国中车",
        "url": "https://crrc.hotjob.cn/"
      },
      {
        "name": "中国建筑",
        "url": "https://recruit.cscec.com/"
      },
      {
        "name": "邮储银行",
        "url": "https://www.psbc.com/cn/gyyc/rczp/xyzp/index.html"
      }
    ]
  },
  {
    "name": "沈阳",
    "province": "辽宁省",
    "lng": 123.43,
    "lat": 41.8,
    "companies": [
      {
        "name": "华晨宝马汽车有限公司",
        "url": "https://www.bmw-brilliance.cn/cn/zh/career/future-talent-program/index.html"
      },
      {
        "name": "沈阳飞机工业（集团）有限公司",
        "url": "https://sacavic.zhiye.com/"
      },
      {
        "name": "中国航发沈阳黎明航空发动机有限责任公司",
        "url": "https://slae.aecc.cn/410/rczp/index.html"
      },
      {
        "name": "航空工业沈阳飞机设计研究所",
        "url": "http://601.zhiye.com"
      },
      {
        "name": "中国航发沈阳发动机研究所",
        "url": "https://job.chinaaecc.com/apply?code=7567382963734636256"
      },
      {
        "name": "东软集团股份有限公司",
        "url": "https://neusoft-campus.zhiye.com/"
      },
      {
        "name": "沈阳新松机器人自动化股份有限公司",
        "url": "http://zhaopin.siasun.com"
      },
      {
        "name": "东软医疗系统股份有限公司",
        "url": "https://neusoftmedical.zhiye.com/campus"
      },
      {
        "name": "沈阳鼓风机集团股份有限公司",
        "url": "https://www.shengu.com.cn/rencaizhaopin/"
      },
      {
        "name": "特变电工沈阳变压器集团有限公司",
        "url": "https://tbea.hotjob.cn/"
      },
      {
        "name": "国网辽宁省电力有限公司",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "盛京银行股份有限公司",
        "url": "https://www.shengjingbank.com.cn/"
      },
      {
        "name": "辽宁农村商业银行股份有限公司",
        "url": "http://www.lnrcb.cn/c/2025-10-30/552177.shtml"
      },
      {
        "name": "沈阳地铁集团有限公司",
        "url": "https://www.symtc.com"
      },
      {
        "name": "三一重型装备有限公司",
        "url": "https://sanycampus.zhiye.com"
      },
      {
        "name": "中车沈阳机车车辆有限公司",
        "url": "https://crrc.hotjob.cn/"
      },
      {
        "name": "中国科学院沈阳自动化研究所",
        "url": "https://sia.cas.cn/zpjy/"
      },
      {
        "name": "中国科学院金属研究所",
        "url": "http://www.imr.cas.cn/rczp/"
      },
      {
        "name": "中国通用技术集团（沈阳机床）",
        "url": "http://genertec.zhiye.com/"
      },
      {
        "name": "沈阳远大企业集团",
        "url": "https://cnydgroup.com/zh/jobs/recruitment-process.html"
      }
    ]
  },
  {
    "name": "长春",
    "province": "吉林省",
    "lng": 125.32,
    "lat": 43.82,
    "companies": [
      {
        "name": "中国第一汽车集团有限公司",
        "url": "https://faw-zhaopin.hotjob.cn/"
      },
      {
        "name": "一汽红旗",
        "url": "https://faw-zhaopin.hotjob.cn/"
      },
      {
        "name": "一汽解放汽车有限公司",
        "url": "http://zhaopin.faw.com.cn"
      },
      {
        "name": "一汽-大众汽车有限公司",
        "url": "https://faw-vw.hotjob.cn"
      },
      {
        "name": "一汽丰田汽车有限公司",
        "url": "https://faw-zhaopin.hotjob.cn/"
      },
      {
        "name": "一汽奔腾轿车有限公司",
        "url": "https://faw-zhaopin.hotjob.cn/"
      },
      {
        "name": "启明信息技术股份有限公司",
        "url": "http://zhaopin.faw.com.cn"
      },
      {
        "name": "中车长春轨道客车股份有限公司",
        "url": "https://crrc-ckgf.hotjob.cn"
      },
      {
        "name": "吉林银行股份有限公司",
        "url": "https://www.jlbank.com.cn/jlbank/gyjx/rczp/xyzp/2025091208311798149/index.html"
      },
      {
        "name": "长光卫星技术股份有限公司",
        "url": "https://cgwx.hotjob.cn/"
      },
      {
        "name": "长春金赛药业有限责任公司",
        "url": "https://campus.jincai.com.cn/"
      },
      {
        "name": "国网吉林省电力有限公司",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "中国科学院长春光学精密机械与物理研究所",
        "url": "https://ciomp.cas.cn/ciomp_hr/hr_graduate_society/"
      },
      {
        "name": "中国科学院长春应用化学研究所",
        "url": "https://ciac.cas.cn/rczp/"
      },
      {
        "name": "吉林电力股份有限公司",
        "url": "https://zhaopin.spic.com.cn/"
      },
      {
        "name": "长春市轨道交通集团有限公司",
        "url": "http://ccgzw.changchun.gov.cn/qyzp/202505/t20250526_3402773.html"
      },
      {
        "name": "一汽模具制造有限公司",
        "url": "https://faw-zhaopin.hotjob.cn/"
      },
      {
        "name": "长春一汽富维汽车零部件股份有限公司",
        "url": "https://faw-zhaopin.hotjob.cn/"
      },
      {
        "name": "奥迪一汽新能源汽车有限公司",
        "url": "https://faw-zhaopin.hotjob.cn/"
      },
      {
        "name": "一汽物流有限公司",
        "url": "https://faw-zhaopin.hotjob.cn/"
      }
    ]
  },
  {
    "name": "哈尔滨",
    "province": "黑龙江省",
    "lng": 126.53,
    "lat": 45.8,
    "companies": [
      {
        "name": "哈尔滨电气集团有限公司",
        "url": "https://www.harbin-electric.com/zxns/xyzp.htm"
      },
      {
        "name": "哈电集团哈尔滨电机厂有限责任公司",
        "url": "https://www.hec-china.com"
      },
      {
        "name": "哈尔滨锅炉厂有限责任公司",
        "url": "https://www.harbin-electric.com/zxns/xyzp.htm"
      },
      {
        "name": "哈尔滨汽轮机厂有限责任公司",
        "url": "https://www.htc.com.cn/"
      },
      {
        "name": "哈尔滨电气国际工程有限责任公司",
        "url": "https://hadian.zhaopin.com"
      },
      {
        "name": "中国航空工业集团哈飞",
        "url": "https://avic2026.zhiye.com"
      },
      {
        "name": "中国航发哈尔滨东安发动机有限公司",
        "url": "https://hde.aecc.cn/"
      },
      {
        "name": "哈尔滨银行股份有限公司",
        "url": "https://www.hrbb.com.cn/harBinBank/jrhx/hxzp/1281065/index.html"
      },
      {
        "name": "龙江银行股份有限公司",
        "url": "https://www.lj-bank.com/view.php?aid=35203"
      },
      {
        "name": "黑龙江省农村信用社联合社",
        "url": "https://www.hljrcc.com/"
      },
      {
        "name": "国网黑龙江省电力有限公司",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "哈药集团股份有限公司",
        "url": "https://hayao.zhiye.com/campus"
      },
      {
        "name": "中国船舶集团有限公司第七〇三研究所",
        "url": "https://cssc.zhiye.com/Campus"
      },
      {
        "name": "中国铁路哈尔滨局集团有限公司",
        "url": "https://rczp.china-railway.com.cn/"
      },
      {
        "name": "东北轻合金有限责任公司",
        "url": "https://dq.chinalco.com.cn/rlzy_410/cpyc/"
      },
      {
        "name": "北大荒完达山乳业股份有限公司",
        "url": "https://www.wondersun.com.cn/join/social_recruitment.htm"
      }
    ]
  },
  {
    "name": "上海",
    "province": "上海市",
    "lng": 121.47,
    "lat": 31.23,
    "companies": [
      {
        "name": "上汽集团",
        "url": "https://saic-recruit.saicmotor.com"
      },
      {
        "name": "浦发银行",
        "url": "https://job.spdb.com.cn"
      },
      {
        "name": "交通银行",
        "url": "https://job.bankcomm.com"
      },
      {
        "name": "上海银行",
        "url": "https://bosc.zhiye.com"
      },
      {
        "name": "上海农商银行",
        "url": "https://shrcb.zhiye.com/campus"
      },
      {
        "name": "中国商飞",
        "url": "https://zhaopin.comac.cc"
      },
      {
        "name": "中国宝武",
        "url": "https://campus.51job.com/baowugroup2026"
      },
      {
        "name": "中芯国际",
        "url": "https://smics.zhiye.com/campus"
      },
      {
        "name": "上海电气",
        "url": "https://sec.hotjob.cn/"
      },
      {
        "name": "中远海运",
        "url": "https://coscoshipping.iguopin.com"
      },
      {
        "name": "中国东航",
        "url": "https://job.ceair.com"
      },
      {
        "name": "中国银联",
        "url": "https://join.unionpay.com"
      },
      {
        "name": "中国太保产险",
        "url": "https://app.mokahr.com/campus-recruitment/cpicproperty/150956"
      },
      {
        "name": "国泰君安",
        "url": "https://hr.gtja.com"
      },
      {
        "name": "拼多多",
        "url": "https://careers.pddglobalhr.com/campus/"
      },
      {
        "name": "携程",
        "url": "https://campus.ctrip.com"
      },
      {
        "name": "哔哩哔哩",
        "url": "https://jobs.bilibili.com"
      },
      {
        "name": "米哈游",
        "url": "https://jobs.mihoyo.com"
      },
      {
        "name": "小红书",
        "url": "https://job.xiaohongshu.com/campus"
      },
      {
        "name": "蔚来",
        "url": "https://nio.jobs.feishu.cn/campus"
      }
    ]
  },
  {
    "name": "南京",
    "province": "江苏省",
    "lng": 118.8,
    "lat": 32.06,
    "companies": [
      {
        "name": "华为（南京）",
        "url": "https://career.huawei.com/reccampportal/portal5/campus-recruitment.html"
      },
      {
        "name": "南瑞集团",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "南瑞继保",
        "url": "https://nrec.zhiye.com/campus"
      },
      {
        "name": "国电南自",
        "url": "https://sac2026.zhaopin.com/"
      },
      {
        "name": "华泰证券",
        "url": "https://job.htsc.com.cn"
      },
      {
        "name": "南京银行",
        "url": "https://job.njcb.com.cn"
      },
      {
        "name": "江苏银行",
        "url": "https://hr.jsbchina.cn/zp"
      },
      {
        "name": "苏宁易购",
        "url": "https://campus.suning.cn/rps-campus/"
      },
      {
        "name": "中兴通讯（南京）",
        "url": "https://job.zte.com.cn/cn/campus-recruitment/Recruitment_positions/future.html"
      },
      {
        "name": "中车浦镇",
        "url": "https://crrc.hotjob.cn/"
      },
      {
        "name": "中电科十四所",
        "url": "https://hr.nriet.com"
      },
      {
        "name": "电科莱斯／二十八所",
        "url": "https://app.mokahr.com/campus_apply/cetcles/40889"
      },
      {
        "name": "南京钢铁",
        "url": "https://xyz.51job.com/External/Apply.aspx?CtmID=8937721"
      },
      {
        "name": "扬子石化",
        "url": "https://job.sinopec.com"
      },
      {
        "name": "江苏省广播电视总台",
        "url": "https://zhaopin.jsbc.com/"
      },
      {
        "name": "江苏国信",
        "url": "https://jsgx2026.zhaopin.com"
      },
      {
        "name": "紫金山实验室",
        "url": "https://xy.liepin.com/pmlabs/"
      },
      {
        "name": "国睿科技",
        "url": "http://2026guorui.zhaopin.com"
      },
      {
        "name": "国网江苏省电力",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "先声药业",
        "url": "https://wecruit.hotjob.cn/SU61458d83bef57c54dcb4e43f/pb/index.html"
      }
    ]
  },
  {
    "name": "杭州",
    "province": "浙江省",
    "lng": 120.15,
    "lat": 30.28,
    "companies": [
      {
        "name": "阿里巴巴",
        "url": "https://campus-talent.alibaba.com"
      },
      {
        "name": "蚂蚁集团",
        "url": "https://talent.antgroup.com/campus/home"
      },
      {
        "name": "网易",
        "url": "https://campus.163.com"
      },
      {
        "name": "海康威视",
        "url": "https://campushr.hikvision.com/"
      },
      {
        "name": "大华股份",
        "url": "https://job.dahuatech.com"
      },
      {
        "name": "新华三",
        "url": "https://career.h3c.com/campus/jobs"
      },
      {
        "name": "吉利",
        "url": "https://campus.geely.com"
      },
      {
        "name": "零跑",
        "url": "https://leapmotor.zhiye.com/campus"
      },
      {
        "name": "恒生电子",
        "url": "https://campus.hundsun.com/"
      },
      {
        "name": "浙商银行",
        "url": "https://zp.czbank.com.cn"
      },
      {
        "name": "杭州银行",
        "url": "https://myjob.hzbank.com.cn"
      },
      {
        "name": "中控技术",
        "url": "https://app.mokahr.com/campus-recruitment/supcon/148189"
      },
      {
        "name": "娃哈哈",
        "url": "https://apply.wahaha.com.cn/"
      },
      {
        "name": "农夫山泉",
        "url": "https://www.nongfuspring.com/careers"
      },
      {
        "name": "万向",
        "url": "https://app.mokahr.com/campus-recruitment/wanxiang/144360"
      },
      {
        "name": "绿城中国",
        "url": "https://www.chinagreentown.com/joinus/campus"
      },
      {
        "name": "物产中大",
        "url": "https://campus.wzgroup.cn/"
      },
      {
        "name": "同花顺",
        "url": "https://campus.10jqka.com.cn/"
      },
      {
        "name": "浙能集团",
        "url": "https://hrx.zjenergy.com.cn/recruit/talent/official.html#/test1"
      },
      {
        "name": "华东医药",
        "url": "https://app.mokahr.com/campus-recruitment/eastchinapharm/67935"
      }
    ]
  },
  {
    "name": "合肥",
    "province": "安徽省",
    "lng": 117.23,
    "lat": 31.82,
    "companies": [
      {
        "name": "科大讯飞",
        "url": "https://campus.iflytek.com/"
      },
      {
        "name": "蔚来",
        "url": "https://nio.jobs.feishu.cn/campus"
      },
      {
        "name": "江淮汽车",
        "url": "https://jac.zhiye.com/campus"
      },
      {
        "name": "长鑫存储",
        "url": "https://cxmt.zhiye.com/campus/jobs"
      },
      {
        "name": "阳光电源",
        "url": "https://jobs.sungrowpower.com/"
      },
      {
        "name": "国轩高科",
        "url": "https://gotion.zhiye.com"
      },
      {
        "name": "晶合集成",
        "url": "https://nexchip.zhiye.com"
      },
      {
        "name": "联宝科技",
        "url": "https://lcfc.zhiye.com/campus"
      },
      {
        "name": "大众安徽",
        "url": "https://app.mokahr.com/campus-recruitment/vwa/118095"
      },
      {
        "name": "京东方",
        "url": "https://campus.boe.com"
      },
      {
        "name": "维信诺",
        "url": "https://app.mokahr.com/m/campus_apply/newvisionox/24735"
      },
      {
        "name": "芯碁微装",
        "url": "https://app.mokahr.com/campus-recruitment/cfmee"
      },
      {
        "name": "中电科38所",
        "url": "https://cetc38.zhaopin.com/"
      },
      {
        "name": "皖能集团",
        "url": "https://wenergy1.zhiye.com/campus"
      },
      {
        "name": "安徽建工",
        "url": "http://www.aceg.com.cn/"
      },
      {
        "name": "安徽交控",
        "url": "https://hr.ahjkjt.com/zp.html"
      },
      {
        "name": "徽商银行",
        "url": "http://rczp.hsbank.com.cn/"
      },
      {
        "name": "国元证券",
        "url": "https://gyzq.zhiye.com/"
      },
      {
        "name": "华安证券",
        "url": "https://hahr.hazq.com:8083/eip4ha-hyapp/recruitment/socialApply?type=03"
      },
      {
        "name": "华米科技",
        "url": "https://zepp.jobs.feishu.cn/103996"
      }
    ]
  },
  {
    "name": "福州",
    "province": "福建省",
    "lng": 119.3,
    "lat": 26.08,
    "companies": [
      {
        "name": "兴业银行",
        "url": "https://job.cib.com.cn/"
      },
      {
        "name": "紫金矿业",
        "url": "https://www.zjky.cn/join/xiao-yuan-zhao-pin.htm"
      },
      {
        "name": "福耀玻璃",
        "url": "https://job.fuyaogroup.com/fuyao/position/index?recruitmentType=CAMPUSRECRUITMENT"
      },
      {
        "name": "锐捷网络",
        "url": "https://www.ruijie.com.cn/campus-recruiting/"
      },
      {
        "name": "星网锐捷",
        "url": "https://starnet.zhiye.com/campus"
      },
      {
        "name": "永辉超市",
        "url": "https://yhchaoshi.zhiye.com/Campus"
      },
      {
        "name": "网龙",
        "url": "https://nd.zhiye.com/campus"
      },
      {
        "name": "新大陆支付",
        "url": "https://newlandpayment.zhiye.com/"
      },
      {
        "name": "新大陆数字技术",
        "url": "https://newland.zhiye.com/Campus"
      },
      {
        "name": "福建电子信息集团",
        "url": "https://campus.51job.com/fei/"
      },
      {
        "name": "福建农信",
        "url": "https://career.fjnx.com.cn/"
      },
      {
        "name": "福建投资集团",
        "url": "https://www.fidc.com.cn/rczl/zpxx/"
      },
      {
        "name": "福建能源石化",
        "url": "http://www.fjnhjt.cn/"
      },
      {
        "name": "中闽能源",
        "url": "http://www.zhongminenergy.com/rlzy/zpxx/"
      },
      {
        "name": "东南汽车",
        "url": "http://www.soueast-motor.com/"
      },
      {
        "name": "海峡银行",
        "url": "https://www.fjhxbank.com/"
      }
    ]
  },
  {
    "name": "南昌",
    "province": "江西省",
    "lng": 115.86,
    "lat": 28.68,
    "companies": [
      {
        "name": "江铃汽车",
        "url": "https://jmc.zhiye.com/campus"
      },
      {
        "name": "江西铜业",
        "url": "https://www.jxcc.com/join.html"
      },
      {
        "name": "江西银行",
        "url": "https://jxyh2026.zhaopin.com/"
      },
      {
        "name": "洪都航空",
        "url": "https://hongdu.zhiye.com/"
      },
      {
        "name": "华润江中",
        "url": "https://www.crjz.com/"
      },
      {
        "name": "泰豪科技",
        "url": "https://www.tellhow.cn/join/index.html"
      },
      {
        "name": "江西中烟",
        "url": "https://jxgytobacco.iguopin.com/"
      },
      {
        "name": "济民可信",
        "url": "https://www.jemincare.com/join_us"
      },
      {
        "name": "江西交投",
        "url": "https://www.jxgsgl.com/"
      },
      {
        "name": "江西建工",
        "url": "https://www.jxsjgjt.com/rlzyuan/p-24-12.html"
      },
      {
        "name": "江铃新能源",
        "url": "https://www.jmev.com/"
      },
      {
        "name": "双胞胎集团",
        "url": "https://www.sbtjt.com/"
      },
      {
        "name": "南昌轨道交通",
        "url": "https://www.ncmtr.com/"
      },
      {
        "name": "仁和集团",
        "url": "http://www.renhe.com/?cat=148"
      }
    ]
  },
  {
    "name": "济南",
    "province": "山东省",
    "lng": 117,
    "lat": 36.65,
    "companies": [
      {
        "name": "浪潮集团",
        "url": "http://career.inspur.com/campus2027/campus.html"
      },
      {
        "name": "中国重汽",
        "url": "https://zhaopin.sinotruk.com:8009/"
      },
      {
        "name": "山东能源",
        "url": "https://zhaopin.shandong-energy.com/recruit"
      },
      {
        "name": "齐鲁制药",
        "url": "https://qilu-pharma.zhiye.com/campus"
      },
      {
        "name": "齐鲁银行",
        "url": "https://campus.51job.com/qlbank2026"
      },
      {
        "name": "山东黄金",
        "url": "https://sdhjjt.zhaopin.com/"
      },
      {
        "name": "山东高速",
        "url": "https://sdhsg.zhaopin.com/"
      },
      {
        "name": "鲁商集团",
        "url": "https://lushang.hotjob.cn/"
      },
      {
        "name": "山钢集团",
        "url": "https://mob.shansteelgroup.com:59090/hcm/recruit"
      },
      {
        "name": "山东航空",
        "url": "https://www.sda.cn/about/joinShandongair/"
      },
      {
        "name": "济南二机床",
        "url": "https://www.jiermt.com/"
      },
      {
        "name": "积成电子",
        "url": "https://ieslab.zhaopin.com/"
      },
      {
        "name": "神思电子",
        "url": "https://www.sdses.com/lists/171.html"
      },
      {
        "name": "济南能源",
        "url": "https://www.jinanenergy.cn/list-34-1.html"
      }
    ]
  },
  {
    "name": "郑州",
    "province": "河南省",
    "lng": 113.65,
    "lat": 34.76,
    "companies": [
      {
        "name": "宇通集团",
        "url": "https://join.yutong.com"
      },
      {
        "name": "郑煤机",
        "url": "https://zmjrczp.zmj.com/"
      },
      {
        "name": "中原银行",
        "url": "http://www.zybank.com.cn"
      },
      {
        "name": "郑州银行",
        "url": "https://zzbankcampus.hotjob.cn"
      },
      {
        "name": "中原证券",
        "url": "https://www.ccnew.com/main/joinus/xyzp/index.shtml"
      },
      {
        "name": "中铁装备",
        "url": "http://www.crectbm.com"
      },
      {
        "name": "中建七局",
        "url": "http://7bur.cscec.com/"
      },
      {
        "name": "中铁七局",
        "url": "http://www.crsg.cn/"
      },
      {
        "name": "河南能源",
        "url": "https://www.hnecgc.com.cn/m/henc/"
      },
      {
        "name": "河南中烟",
        "url": "https://www.hatic.com"
      },
      {
        "name": "河南投资集团",
        "url": "https://hnic.hotjob.cn"
      },
      {
        "name": "河南农商银行",
        "url": "https://hnnsyh2026.hqrczp.cn/"
      },
      {
        "name": "国网河南电力",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "郑州商品交易所",
        "url": "https://www.czce.com.cn"
      },
      {
        "name": "黄河设计院",
        "url": "https://yrec.zhaopin.com/"
      },
      {
        "name": "安图生物",
        "url": "https://wecruit.hotjob.cn/SU62302d11bef57c4972f79a6b/pb/index.html"
      },
      {
        "name": "比亚迪（郑州）",
        "url": "https://job.byd.com/portal/pc/"
      },
      {
        "name": "富士康（郑州）",
        "url": "https://foxconn.hotjob.cn"
      },
      {
        "name": "郑州地铁",
        "url": "https://www.zzmetro.cn"
      },
      {
        "name": "中原农险",
        "url": "https://zyic.com"
      }
    ]
  },
  {
    "name": "武汉",
    "province": "湖北省",
    "lng": 114.31,
    "lat": 30.59,
    "companies": [
      {
        "name": "东风汽车",
        "url": "http://dfmc.hotjob.cn"
      },
      {
        "name": "长江存储",
        "url": "https://ymtc.zhiye.com"
      },
      {
        "name": "华为（武汉）",
        "url": "https://career.huawei.com"
      },
      {
        "name": "汉口银行",
        "url": "http://www.hkbchina.com"
      },
      {
        "name": "中国信科",
        "url": "https://campus.51job.com/cict2026/"
      },
      {
        "name": "长飞光纤",
        "url": "https://yofccampus.zhiye.com/"
      },
      {
        "name": "中建三局",
        "url": "http://zhaopin.cscec3b.com.cn/"
      },
      {
        "name": "长江证券",
        "url": "https://cjzq.zhiye.com/campus"
      },
      {
        "name": "湖北银行",
        "url": "http://www.hubeibank.cn/cn/rczp/xyzp/13763.html"
      },
      {
        "name": "岚图汽车",
        "url": "https://app.mokahr.com/campus-recruitment/voyah/146293"
      },
      {
        "name": "中铁大桥局",
        "url": "https://zhr.crec.cn/zhaopin/"
      },
      {
        "name": "中铁四院",
        "url": "http://campus.51job.com/tsy2026/"
      },
      {
        "name": "中交二航局",
        "url": "https://www.sneb.com.cn/col84/index"
      },
      {
        "name": "光迅科技",
        "url": "https://career.accelink.com"
      },
      {
        "name": "精测电子",
        "url": "https://jingce.zhiye.com/"
      },
      {
        "name": "华工科技",
        "url": "http://www.hgtech.com.cn/campus/index.jhtml"
      },
      {
        "name": "中南电力设计院",
        "url": "https://job.csepdi.com"
      },
      {
        "name": "九州通",
        "url": "https://jztey.hotjob.cn/"
      },
      {
        "name": "人福医药",
        "url": "http://www.humanwell.com.cn"
      },
      {
        "name": "湖北中烟",
        "url": "http://www.hbtobacco.com"
      }
    ]
  },
  {
    "name": "长沙",
    "province": "湖南省",
    "lng": 112.94,
    "lat": 28.23,
    "companies": [
      {
        "name": "三一集团",
        "url": "https://sany.zhiye.com/campus/jobs"
      },
      {
        "name": "中联重科",
        "url": "https://wecruit.hotjob.cn/SU60a6449a2f9d2430fdc11a19/pb/index.html"
      },
      {
        "name": "长沙银行",
        "url": "https://cscb.zhiye.com"
      },
      {
        "name": "湖南钢铁",
        "url": "https://www.chinavalin.com"
      },
      {
        "name": "铁建重工",
        "url": "http://crchi.zhiye.com"
      },
      {
        "name": "山河智能",
        "url": "https://www.sunward.com.cn/rczy/"
      },
      {
        "name": "湖南银行",
        "url": "https://campus.51job.com/hnbank"
      },
      {
        "name": "方正证券",
        "url": "https://foundersc.zhiye.com/campus/jobs"
      },
      {
        "name": "芒果TV",
        "url": "https://app.mokahr.com/campus-recruitment/mgtv/44490"
      },
      {
        "name": "中建五局",
        "url": "https://recruit.cscec.com/recruit"
      },
      {
        "name": "湖南中烟",
        "url": "https://www.hntic.com"
      },
      {
        "name": "蓝思科技",
        "url": "https://xy.liepin.com/lskj2026"
      },
      {
        "name": "爱尔眼科",
        "url": "http://www.aierchina.com/"
      },
      {
        "name": "中南传媒",
        "url": "https://hncb.iguopin.com"
      },
      {
        "name": "湖南建投",
        "url": "http://campus.51job.com/hnjt2026"
      },
      {
        "name": "长沙地铁",
        "url": "https://www.hncsmtr.com"
      },
      {
        "name": "财信金控",
        "url": "https://www.hnchasing.com"
      },
      {
        "name": "中铁五局",
        "url": "https://www.ztwj.cn/n65/index.html"
      },
      {
        "name": "国网湖南电力",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "威胜集团",
        "url": "https://www.wasion.cn/join/xyzp"
      }
    ]
  },
  {
    "name": "广州",
    "province": "广东省",
    "lng": 113.26,
    "lat": 23.13,
    "companies": [
      {
        "name": "广汽集团",
        "url": "https://gacgroup2026.zhaopin.com/post/index.html"
      },
      {
        "name": "南方电网",
        "url": "https://zhaopin.csg.cn"
      },
      {
        "name": "南方航空",
        "url": "https://job.csair.cn/"
      },
      {
        "name": "小鹏汽车",
        "url": "https://xiaopeng.jobs.feishu.cn/campus"
      },
      {
        "name": "唯品会",
        "url": "https://job.vip.com"
      },
      {
        "name": "广发证券",
        "url": "https://job.gf.com.cn/"
      },
      {
        "name": "广发银行",
        "url": "https://chinalife.zhiye.com/"
      },
      {
        "name": "视源股份",
        "url": "https://campus.cvte.com"
      },
      {
        "name": "三七互娱",
        "url": "https://zhaopin.37.com"
      },
      {
        "name": "立白",
        "url": "https://zhaopin.liby.com.cn/campus"
      },
      {
        "name": "金发科技",
        "url": "https://kingfa.zhiye.com/"
      },
      {
        "name": "海大集团",
        "url": "https://app.mokahr.com/campus-recruitment/haid/101909"
      },
      {
        "name": "保利发展",
        "url": "https://polycareer.zhiye.com/campus"
      },
      {
        "name": "越秀地产",
        "url": "https://yxdc2026.zhaopin.com/"
      },
      {
        "name": "广州银行",
        "url": "https://gzcb.hotjob.cn/"
      },
      {
        "name": "广州农商银行",
        "url": "https://cdms.grcbank.com:8080/yp/school"
      },
      {
        "name": "广州地铁",
        "url": "https://gzmetro.zhiye.com/campus"
      },
      {
        "name": "虎牙",
        "url": "https://hr.huya.com"
      },
      {
        "name": "金域医学",
        "url": "https://kingmed.zhiye.com/campus"
      },
      {
        "name": "无限极",
        "url": "https://app.mokahr.com/m/campus-recruitment/infinitushr/"
      }
    ]
  },
  {
    "name": "南宁",
    "province": "广西壮族自治区",
    "lng": 108.37,
    "lat": 22.82,
    "companies": [
      {
        "name": "北部湾投资集团",
        "url": "https://bgigc.zhiye.com/Campus"
      },
      {
        "name": "北部湾银行",
        "url": "https://zhaopin.bankofbbg.com/"
      },
      {
        "name": "广西投资集团",
        "url": "http://www.gig.cn"
      },
      {
        "name": "广西农村投资集团",
        "url": "https://gnjt2025.zhaopin.com/zk/"
      },
      {
        "name": "广西农商联合银行",
        "url": "https://www.gx966888.com"
      },
      {
        "name": "广西中烟",
        "url": "https://gxzy2026.zhaopin.com"
      },
      {
        "name": "广西电网",
        "url": "https://zhaopin.csg.cn"
      },
      {
        "name": "中国移动广西",
        "url": "https://job.10086.cn"
      },
      {
        "name": "中国电信广西",
        "url": "https://job.chinatelecom.com.cn"
      },
      {
        "name": "中国联通广西",
        "url": "https://zglt.zhaopin.com"
      },
      {
        "name": "中国人寿广西",
        "url": "https://chinalife.zhiye.com/"
      },
      {
        "name": "招商银行南宁分行",
        "url": "https://career.cmbchina.com"
      },
      {
        "name": "浦发银行南宁分行",
        "url": "https://job.spdb.com.cn"
      },
      {
        "name": "工商银行广西",
        "url": "https://job.icbc.com.cn"
      },
      {
        "name": "建设银行广西",
        "url": "https://job.ccb.com"
      },
      {
        "name": "农业银行广西",
        "url": "https://career.abchina.com.cn"
      },
      {
        "name": "交通银行广西",
        "url": "https://job.bankcomm.com"
      },
      {
        "name": "邮储银行广西",
        "url": "https://www.psbc.com/cn/gyyc/rczp/xyzp/"
      },
      {
        "name": "广西交通投资集团",
        "url": "http://www.gxjttzjt.com"
      },
      {
        "name": "南宁轨道交通",
        "url": "http://www.nngdjt.com"
      }
    ]
  },
  {
    "name": "海口",
    "province": "海南省",
    "lng": 110.35,
    "lat": 20.02,
    "companies": [
      {
        "name": "海航集团",
        "url": "http://recruitment.hnair.com/HRCandidateManageAir/home.aspx"
      },
      {
        "name": "海南控股",
        "url": "http://hk2026.zhaopin.com/"
      },
      {
        "name": "海南橡胶",
        "url": "https://www.hirub.cn/jobBoard.html?kind=HR"
      },
      {
        "name": "海南港航",
        "url": "https://coscoshipping.iguopin.com/job"
      },
      {
        "name": "海南电网",
        "url": "https://zhaopin.csg.cn"
      },
      {
        "name": "海南银行",
        "url": "https://xyz.51job.com/External/Apply.aspx?CtmiD=9392219"
      },
      {
        "name": "民生银行海口分行",
        "url": "https://career.cmbc.com.cn/"
      },
      {
        "name": "招商银行海口分行",
        "url": "https://career.cmbchina.com"
      },
      {
        "name": "兴业银行海口分行",
        "url": "https://job.cib.com.cn/"
      },
      {
        "name": "中国移动海南",
        "url": "https://job.10086.cn"
      },
      {
        "name": "中国电信海南",
        "url": "https://job.chinatelecom.com.cn"
      },
      {
        "name": "中国联通海南",
        "url": "https://zglt.zhaopin.com"
      },
      {
        "name": "中国人寿海南",
        "url": "https://chinalife.zhiye.com/"
      },
      {
        "name": "工商银行海南",
        "url": "https://job.icbc.com.cn"
      },
      {
        "name": "建设银行海南",
        "url": "https://job.ccb.com"
      },
      {
        "name": "农业银行海南",
        "url": "https://career.abchina.com.cn"
      },
      {
        "name": "交通银行海南",
        "url": "https://job.bankcomm.com"
      },
      {
        "name": "邮储银行海南",
        "url": "https://www.psbc.com/cn/gyyc/rczp/xyzp/"
      },
      {
        "name": "南方航空（海口）",
        "url": "https://job.csair.cn/"
      },
      {
        "name": "中国海油（海南）",
        "url": "https://cnooc.zhaopin.com"
      }
    ]
  },
  {
    "name": "重庆",
    "province": "重庆市",
    "lng": 106.55,
    "lat": 29.56,
    "companies": [
      {
        "name": "长安汽车",
        "url": "https://changan.zhiye.com/Campus"
      },
      {
        "name": "赛力斯",
        "url": "https://sokon.zhiye.com/campus"
      },
      {
        "name": "阿维塔",
        "url": "https://xcn5vbnquq58.jobs.feishu.cn/915151"
      },
      {
        "name": "长安福特",
        "url": "https://www.ford.com.cn/careers"
      },
      {
        "name": "庆铃集团",
        "url": "https://xy.liepin.com/qlqc2026/"
      },
      {
        "name": "重庆农村商业银行",
        "url": "https://www.cqrcb.com/cqrcb/aboutus/job/index.html"
      },
      {
        "name": "重庆银行",
        "url": "https://cqcbank2026.zhaopin.com"
      },
      {
        "name": "西南证券",
        "url": "https://www.swsc.com.cn/"
      },
      {
        "name": "重庆三峡银行",
        "url": "https://zhaopin.ccqtgb.com:8443/recruit"
      },
      {
        "name": "龙湖集团",
        "url": "https://www.longfor.com/join/job.html"
      },
      {
        "name": "重庆轨道交通",
        "url": "https://www.cqrc.net/gzw/index/"
      },
      {
        "name": "太极集团",
        "url": "https://sinopharm2026.iguopin.com/job"
      },
      {
        "name": "智飞生物",
        "url": "https://www.zhifeishengwu.com/zh_CN/recruitment.html"
      },
      {
        "name": "重庆建工",
        "url": "https://www.ccegc.cn/jjjg/zpxx/"
      },
      {
        "name": "重庆高速集团",
        "url": "https://www.cegc.com.cn/"
      },
      {
        "name": "重庆机场集团",
        "url": "https://www.cqrc.net/gzw/index/"
      },
      {
        "name": "重庆水务环境集团",
        "url": "https://www.cqweh.com/"
      },
      {
        "name": "渝富控股",
        "url": "https://www.cqyfkgjt.com/join-us/"
      },
      {
        "name": "西南铝业",
        "url": "https://chinalco.iguopin.com/"
      },
      {
        "name": "京东方（重庆）",
        "url": "https://campus.boe.com"
      }
    ]
  },
  {
    "name": "成都",
    "province": "四川省",
    "lng": 104.07,
    "lat": 30.67,
    "companies": [
      {
        "name": "通威股份",
        "url": "https://www.tongwei.com/recruit.html"
      },
      {
        "name": "新希望集团",
        "url": "https://newhope.zhiye.com/campus"
      },
      {
        "name": "成都银行",
        "url": "https://bocd.zhiye.com/"
      },
      {
        "name": "四川银行",
        "url": "https://scyh2026.zhaopin.com/"
      },
      {
        "name": "成都农商银行",
        "url": "https://cdrcb2026.zhaopin.com"
      },
      {
        "name": "国金证券",
        "url": "http://career.gjzq.com.cn/Campus"
      },
      {
        "name": "华西证券",
        "url": "https://www.hx168.com.cn"
      },
      {
        "name": "科伦药业",
        "url": "https://kelun.zhiye.com/campus"
      },
      {
        "name": "东方电气",
        "url": "https://dec2026.iguopin.com"
      },
      {
        "name": "四川航空",
        "url": "https://www.sichuanair.com"
      },
      {
        "name": "蜀道集团",
        "url": "https://sdhr.shudaojt.com/recruit#/index"
      },
      {
        "name": "中铁二院",
        "url": "https://xz.creegc.com"
      },
      {
        "name": "中铁八局",
        "url": "http://www.cr8gc.com"
      },
      {
        "name": "极米科技",
        "url": "https://campus.xgimi.com"
      },
      {
        "name": "成都轨道交通",
        "url": "http://cdmetro.zhaopin.com"
      },
      {
        "name": "成都交投",
        "url": "https://zhaopin.cdccic.com:6066/recruitment/all"
      },
      {
        "name": "航空工业成飞",
        "url": "https://cac.avic.com/sycd/rlzy/"
      },
      {
        "name": "中电科十所",
        "url": "https://www.spaceonhr.cn/"
      },
      {
        "name": "中电科29所",
        "url": "http://campus.51job.com/cetc29"
      },
      {
        "name": "京东方（成都）",
        "url": "https://campus.boe.com"
      }
    ]
  },
  {
    "name": "贵阳",
    "province": "贵州省",
    "lng": 106.63,
    "lat": 26.65,
    "companies": [
      {
        "name": "贵阳银行",
        "url": "http://ideal.51job.com/gyyh2026cz"
      },
      {
        "name": "贵州银行",
        "url": "https://job.bgzchina.com"
      },
      {
        "name": "华创证券",
        "url": "https://www.hczq.com"
      },
      {
        "name": "中国振华电子集团",
        "url": "https://www.iguopin.com/company/sub/jobs?id=10685300523509495"
      },
      {
        "name": "振华科技",
        "url": "https://www.czst.com.cn/"
      },
      {
        "name": "贵州磷化集团",
        "url": "https://gzlhjt.zhiye.com/campus/jobs"
      },
      {
        "name": "贵州高速集团",
        "url": "http://gzgs.zhaopin.com"
      },
      {
        "name": "贵州电网",
        "url": "https://zhaopin.csg.cn"
      },
      {
        "name": "中国航发黎阳",
        "url": "http://campus.51job.com/liyang/"
      },
      {
        "name": "贵阳农商银行",
        "url": "https://www.gynsh.com/gynsh/agribusiness/job/index.html"
      },
      {
        "name": "中铁五局",
        "url": "https://www.ztwj.cn/n65/index.html"
      },
      {
        "name": "贵州轮胎",
        "url": "https://gztyre.com/job/rc_center.htm"
      },
      {
        "name": "水电九局",
        "url": "http://9j.powerchina.cn/"
      },
      {
        "name": "贵州金控",
        "url": "http://www.gzkszp.com/"
      },
      {
        "name": "贵州建工",
        "url": "https://www.gzjgjt.com/"
      },
      {
        "name": "贵州交投",
        "url": "https://www.gzrc.com.cn"
      },
      {
        "name": "贵州农商联合银行",
        "url": "https://www.gznxbank.com"
      },
      {
        "name": "贵州铝业集团",
        "url": "https://bm.bjpass.com/front/site/gzrcrq"
      },
      {
        "name": "贵州中铝铝业",
        "url": "https://www.gzchalco.com/job/index.html"
      },
      {
        "name": "贵州燃气",
        "url": "https://www.guizhougas.com/"
      }
    ]
  },
  {
    "name": "昆明",
    "province": "云南省",
    "lng": 102.71,
    "lat": 25.04,
    "companies": [
      {
        "name": "中国铁路昆明局集团",
        "url": "https://rczp.kunming-railway.cn"
      },
      {
        "name": "中国移动云南公司",
        "url": "https://hire.ynydhlw.com"
      },
      {
        "name": "云南电网",
        "url": "https://zhaopin.csg.cn"
      },
      {
        "name": "云南白药集团",
        "url": "https://zhaopin.ynby.cn"
      },
      {
        "name": "云南中烟工业",
        "url": "https://www.ynzy-tobacco.com"
      },
      {
        "name": "云南建投集团",
        "url": "https://ynjstzkg.zhiye.com/"
      },
      {
        "name": "华能澜沧江水电",
        "url": "https://zhaopin.chng.com.cn"
      },
      {
        "name": "云天化股份",
        "url": "https://app.mokahr.com/social-recruitment/yth"
      },
      {
        "name": "富滇银行",
        "url": "https://hr.fudian-bank.com"
      },
      {
        "name": "云南红塔银行",
        "url": "https://www.ynhtbank.com"
      },
      {
        "name": "云南省农村信用社",
        "url": "https://www.ynrcc.com"
      },
      {
        "name": "中国电信云南公司",
        "url": "https://job.chinatelecom.com.cn"
      },
      {
        "name": "中国联通云南分公司",
        "url": "https://zglt.zhaopin.com"
      },
      {
        "name": "招商银行昆明分行",
        "url": "https://career.cmbchina.com"
      },
      {
        "name": "建设银行云南省分行",
        "url": "http://job.ccb.com"
      },
      {
        "name": "农业银行云南省分行",
        "url": "https://career.abchina.com.cn"
      },
      {
        "name": "工商银行云南省分行",
        "url": "https://job.icbc.com.cn"
      },
      {
        "name": "中国银行云南省分行",
        "url": "https://www.boc.cn/aboutboc/bi4/"
      },
      {
        "name": "交通银行云南省分行",
        "url": "https://job.bankcomm.com"
      },
      {
        "name": "邮储银行云南省分行",
        "url": "https://www.psbc.com/cn/gyyc/rczp/xyzp/"
      }
    ]
  },
  {
    "name": "拉萨",
    "province": "西藏自治区",
    "lng": 91.11,
    "lat": 29.65,
    "companies": [
      {
        "name": "国网西藏电力",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "中国移动西藏公司",
        "url": "https://job.10086.cn"
      },
      {
        "name": "中国电信西藏公司",
        "url": "https://job.chinatelecom.com.cn"
      },
      {
        "name": "中国联通西藏分公司",
        "url": "https://zglt.zhaopin.com"
      },
      {
        "name": "华能西藏雅江公司",
        "url": "https://zhaopin.chng.com.cn"
      },
      {
        "name": "大唐西藏能源开发",
        "url": "https://zhaopin.china-cdt.com"
      },
      {
        "name": "国家能源集团（藏青疆专项）",
        "url": "https://zhaopin.chnenergy.com.cn"
      },
      {
        "name": "西藏开发投资集团",
        "url": "http://www.xzkt.com/show-44-5136-1.html"
      },
      {
        "name": "西藏交通发展集团",
        "url": "https://xzjfzp.xzjtfzjt.cn:10101/n/s/4c00b1f3"
      },
      {
        "name": "西藏银行",
        "url": "https://www.xzbc.com.cn/yxfb/rczp/xyzp/"
      },
      {
        "name": "国家开发银行西藏分行",
        "url": "https://cdb2026.zhaopin.com"
      },
      {
        "name": "农业银行西藏分行",
        "url": "https://career.abchina.com.cn"
      },
      {
        "name": "工商银行西藏分行",
        "url": "https://job.icbc.com.cn"
      },
      {
        "name": "建设银行西藏分行",
        "url": "http://job.ccb.com"
      },
      {
        "name": "中国银行西藏分行",
        "url": "https://www.boc.cn/aboutboc/bi4/"
      },
      {
        "name": "交通银行西藏分行",
        "url": "https://job.bankcomm.com"
      }
    ]
  },
  {
    "name": "西安",
    "province": "陕西省",
    "lng": 108.94,
    "lat": 34.34,
    "companies": [
      {
        "name": "隆基绿能",
        "url": "https://longi.hotjob.cn/"
      },
      {
        "name": "陕汽控股",
        "url": "https://sxqc.zhiye.com"
      },
      {
        "name": "陕煤集团",
        "url": "https://webhr.shccig.com/webhrN2-zp"
      },
      {
        "name": "延长石油",
        "url": "http://www.sxycpc.com"
      },
      {
        "name": "陕投集团",
        "url": "https://sxigc.zhaopin.com"
      },
      {
        "name": "陕建控股",
        "url": "https://sjkghr.sxjgkg.com:2081/zhaopin"
      },
      {
        "name": "法士特",
        "url": "https://fast.zhiye.com"
      },
      {
        "name": "中国西电集团",
        "url": "https://campus.51job.com/zgxdjt/about.html"
      },
      {
        "name": "西部证券",
        "url": "https://XBZQ.hotjob.cn"
      },
      {
        "name": "西安银行",
        "url": "https://campus.51job.com/xacbank2026"
      },
      {
        "name": "长安银行",
        "url": "https://job.ccabchina.com/"
      },
      {
        "name": "国网陕西电力",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "陕西移动",
        "url": "https://job.10086.cn"
      },
      {
        "name": "航空工业一飞院",
        "url": "https://yfytalent.m.zhiye.com"
      },
      {
        "name": "三星（中国）半导体",
        "url": "https://dearsamsung.zhiye.com/"
      },
      {
        "name": "美光科技",
        "url": "https://www.micron.cn/about/careers/university-recruiting"
      },
      {
        "name": "比亚迪",
        "url": "https://job.byd.com"
      },
      {
        "name": "中兴通讯",
        "url": "https://job.zte.com.cn"
      },
      {
        "name": "华为",
        "url": "https://career.huawei.com"
      },
      {
        "name": "建设银行陕西省分行",
        "url": "http://job.ccb.com"
      }
    ]
  },
  {
    "name": "兰州",
    "province": "甘肃省",
    "lng": 103.83,
    "lat": 36.06,
    "companies": [
      {
        "name": "国网甘肃省电力公司",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "中国石油兰州石化",
        "url": "https://zhaopin.cnpc.com.cn"
      },
      {
        "name": "中国铁路兰州局集团",
        "url": "https://rczp.china-railway.com.cn"
      },
      {
        "name": "甘肃公航旅集团",
        "url": "http://www.ghatg.com"
      },
      {
        "name": "甘肃建投",
        "url": "http://zhaopin.gsjtw.cc/"
      },
      {
        "name": "兰石集团",
        "url": "https://gzw.gansu.gov.cn/gzw/c109030/202604/174325458.shtml"
      },
      {
        "name": "甘肃银行",
        "url": "https://www.gsbankchina.com"
      },
      {
        "name": "兰州银行",
        "url": "https://www.lzbank.com"
      },
      {
        "name": "甘肃农信",
        "url": "http://campus.51job.com/gsrcu"
      },
      {
        "name": "华龙证券",
        "url": "https://hlzj.changanjoin.com"
      },
      {
        "name": "甘肃能化",
        "url": "http://www.gsnhgf.cn/"
      },
      {
        "name": "甘肃电投",
        "url": "https://gepic.iguopin.com"
      },
      {
        "name": "方大炭素",
        "url": "http://www.fangdacarbon.com/index.html"
      },
      {
        "name": "兰州生物制品研究所",
        "url": "http://hrs.vacmic.com"
      },
      {
        "name": "中核兰州铀浓缩",
        "url": "https://cnnc.zhiye.com/xiaoyuan"
      },
      {
        "name": "佛慈制药",
        "url": "http://www.focipharm.com/col_zxns/index/"
      },
      {
        "name": "奇正集团",
        "url": "https://www.qzh.cn/hdapp/bas/col_rczp.php"
      },
      {
        "name": "读者出版集团",
        "url": "https://www.duzhepg.com/rczp1.jhtml"
      },
      {
        "name": "祁连山水泥",
        "url": "https://scement14.zhiye.com/"
      },
      {
        "name": "中国移动甘肃公司",
        "url": "https://job.10086.cn"
      }
    ]
  },
  {
    "name": "西宁",
    "province": "青海省",
    "lng": 101.78,
    "lat": 36.62,
    "companies": [
      {
        "name": "国网青海省电力公司",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "黄河公司（国家电投）",
        "url": "https://zhaopin.spic.com.cn"
      },
      {
        "name": "西部矿业集团",
        "url": "https://www.westmininggroup.com/"
      },
      {
        "name": "青海省投资集团",
        "url": "http://www.qhinv.com.cn/n5/n24/"
      },
      {
        "name": "青海交控集团",
        "url": "http://www.qhjkjt.com/"
      },
      {
        "name": "青海国投",
        "url": "https://www.qhsgtgs.com/"
      },
      {
        "name": "青海银行",
        "url": "https://www.bankqh.com/cms/portal/gengduofuwu/job/index.html"
      },
      {
        "name": "青海农信",
        "url": "https://www.qhrccb.com/"
      },
      {
        "name": "中国铁路青藏集团",
        "url": "https://rczp.china-railway.com.cn"
      },
      {
        "name": "青海能源集团",
        "url": "http://hr.qhsdjt.com.cn:8898/zp.html"
      },
      {
        "name": "中铝青海",
        "url": "https://chinalco.iguopin.com"
      },
      {
        "name": "中国移动青海公司",
        "url": "https://job.10086.cn"
      },
      {
        "name": "中国电信青海公司",
        "url": "https://job.chinatelecom.com.cn"
      },
      {
        "name": "中国联通青海公司",
        "url": "https://zglt.zhaopin.com"
      },
      {
        "name": "中国石油青海公司",
        "url": "https://zhaopin.cnpc.com.cn"
      }
    ]
  },
  {
    "name": "银川",
    "province": "宁夏回族自治区",
    "lng": 106.27,
    "lat": 38.47,
    "companies": [
      {
        "name": "国网宁夏电力",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "国家能源集团宁夏煤业",
        "url": "https://zhaopin.chnenergy.com.cn"
      },
      {
        "name": "宝丰能源",
        "url": "https://www.baofengenergy.com/"
      },
      {
        "name": "宁夏银行",
        "url": "http://www.bankofnx.com.cn/"
      },
      {
        "name": "黄河农商银行",
        "url": "https://www.bankyellowriver.com"
      },
      {
        "name": "共享集团",
        "url": "https://www.kocel.com/"
      },
      {
        "name": "宁夏交建",
        "url": "http://www.nxcc.com/"
      },
      {
        "name": "宁夏建投",
        "url": "https://www.nxjstz.com/"
      },
      {
        "name": "宁夏国投",
        "url": "https://ningxiaguotou.com/"
      },
      {
        "name": "宁夏建材",
        "url": "https://zhaopin.cnbm.com.cn"
      },
      {
        "name": "中国石油宁夏石化",
        "url": "https://zhaopin.cnpc.com.cn"
      },
      {
        "name": "中国石化宁夏能源化工",
        "url": "https://job.sinopec.com"
      },
      {
        "name": "国家电投铝电",
        "url": "https://zhaopin.spic.com.cn"
      },
      {
        "name": "伊品生物",
        "url": "https://eppen.com.cn/"
      },
      {
        "name": "中国移动宁夏公司",
        "url": "https://job.10086.cn"
      },
      {
        "name": "中国电信宁夏公司",
        "url": "https://job.chinatelecom.com.cn"
      },
      {
        "name": "中国联通宁夏公司",
        "url": "https://zglt.zhaopin.com"
      }
    ]
  },
  {
    "name": "乌鲁木齐",
    "province": "新疆维吾尔自治区",
    "lng": 87.62,
    "lat": 43.83,
    "companies": [
      {
        "name": "国网新疆电力",
        "url": "https://zhaopin.sgcc.com.cn"
      },
      {
        "name": "中泰集团",
        "url": "http://www.zthx.com"
      },
      {
        "name": "广汇能源",
        "url": "http://www.xjguanghui.com/"
      },
      {
        "name": "金风科技",
        "url": "https://goldwind.zhiye.com/campus"
      },
      {
        "name": "乌鲁木齐银行",
        "url": "https://hr.boubank.com"
      },
      {
        "name": "新疆银行",
        "url": "https://www.xjbank.com/"
      },
      {
        "name": "昆仑银行",
        "url": "https://www.klb.cn"
      },
      {
        "name": "中建新疆建工",
        "url": "https://recruit.cscec.com"
      },
      {
        "name": "新疆众和",
        "url": "http://campus.51job.com/joinworld2026/"
      },
      {
        "name": "中国铁路乌鲁木齐局集团",
        "url": "https://rczp.china-railway.com.cn"
      },
      {
        "name": "新疆交投集团",
        "url": "https://yecai.xjjtkj.cn:8034/job-ui/#/recruitList"
      },
      {
        "name": "新投集团",
        "url": "https://www.xj-inv.com/"
      },
      {
        "name": "天润乳业",
        "url": "https://www.xjtrry.com/page141"
      },
      {
        "name": "中国石油乌鲁木齐石化",
        "url": "https://zhaopin.cnpc.com.cn"
      },
      {
        "name": "中石化西北油田",
        "url": "https://job.sinopec.com"
      },
      {
        "name": "国家能源集团新疆公司",
        "url": "https://zhaopin.chnenergy.com.cn"
      },
      {
        "name": "中国移动新疆公司",
        "url": "https://job.10086.cn"
      },
      {
        "name": "中国电信新疆公司",
        "url": "https://job.chinatelecom.com.cn"
      },
      {
        "name": "中国联通新疆公司",
        "url": "https://zglt.zhaopin.com"
      },
      {
        "name": "新疆交建股份",
        "url": "https://www.xjjjjt.com/"
      }
    ]
  }
];

export const CAPITAL_CAMPUS_TOTAL = CAPITAL_CAMPUS_CITIES.reduce((total, city) => total + city.companies.length, 0);
