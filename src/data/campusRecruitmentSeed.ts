/**
 * 2027 校招开招情况静态底库（2026-08-08 公开信息核对）
 * 前端优先用 Supabase 每日同步结果；无记录时回落到本表。
 */
import type { CampusRecruitmentStatus } from '../hooks/useCampusRecruitmentStatuses';

export type CampusSeed = {
  status: 'started' | 'not_started';
  evidence_text: string;
  evidence_url?: string;
};

export const CAMPUS_RECRUITMENT_SEED: Record<string, CampusSeed> = {
  '中芯国际': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://careers.smics.com',
  },
  '长江存储': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://ymtc.zhiye.com',
  },
  '长鑫存储': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://cxmt.zhiye.com',
  },
  '北方华创': {
    status: 'started',
    evidence_text: '官网已发布多条 2027 届校园招聘岗位',
    evidence_url: 'https://career.naura.com/campus/jobs',
  },
  '韦尔股份': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.willsemi.com/cn/recruitment',
  },
  '紫光展锐': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://unisoc.zhiye.com',
  },
  '寒武纪': {
    status: 'started',
    evidence_text: '2026-08-06 寒武纪宣布 2027 届校园招聘正式启动',
    evidence_url: 'https://app.mokahr.com/campus-recruitment/cambricon',
  },
  '台积电': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.tsmc.com/chinese/careers',
  },
  '华虹·华力': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.huahonggrace.com/cn/careers',
  },
  '华润微电子': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.crmicro.com/join',
  },
  '晶合集成': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://nexchip.zhiye.com',
  },
  '芯碁微装': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://cfmee.zhiye.com',
  },
  '鹏芯微': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.pxwsemi.com/join',
  },
  '鹏新旭': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.pengxinxu.com',
  },
  '新凯来': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.sicarrier.com',
  },
  '深南电路': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://scc.zhiye.com',
  },
  '江丰电子': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.kfmic.com/join',
  },
  '睿创微纳': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://raytron.zhiye.com',
  },
  '京东方': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://campus.boe.com',
  },
  '维信诺': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://visionox.zhiye.com',
  },
  '翰博高新': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.hibr.com.cn/join',
  },
  '比亚迪': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://job.byd.com',
  },
  '蔚来': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://nio.jobs.feishu.cn/campus',
  },
  '理想汽车': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.lixiang.com/careers',
  },
  '小鹏汽车': {
    status: 'started',
    evidence_text: '小鹏集团 2027 届「探索者计划」全球校招已启动',
    evidence_url: 'https://app.mokahr.com/campus-recruitment/xiaopeng',
  },
  '小米汽车': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://hr.xiaomi.com/campus',
  },
  '极氪': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://zeekr.zhiye.com',
  },
  '零跑': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://leapmotor.zhiye.com',
  },
  '赛力斯': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://seres.zhiye.com',
  },
  '特斯拉': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.tesla.cn/careers',
  },
  '奇瑞': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://chery.zhiye.com',
  },
  '吉利': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://geely.zhiye.com',
  },
  '长安汽车': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://changan.zhiye.com',
  },
  '上汽集团': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://saicmotor.zhiye.com',
  },
  '中国一汽': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://faw.zhiye.com',
  },
  '江淮汽车': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://jac.zhiye.com',
  },
  '宇通': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://yutong.zhiye.com',
  },
  '开沃': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.skywellcorp.com/join',
  },
  '博世': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.bosch.com.cn/careers/',
  },
  '联合电子': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.uaes.com/career',
  },
  '经纬恒润': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://hirain.zhiye.com',
  },
  '禾赛': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://hesai.jobs.feishu.cn',
  },
  '福耀科技': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://fuyao.zhiye.com',
  },
  '万向': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.wanxiang.com.cn/join',
  },
  '巨一科技': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://jee.zhiye.com',
  },
  '联创电子': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.lcetron.com/join',
  },
  '宁德时代': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://talent.catl.com',
  },
  '中创新航': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://calb.zhiye.com',
  },
  '亿纬锂能': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://evebattery.zhiye.com',
  },
  '欣旺达': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://sunwoda.zhiye.com',
  },
  '国轩高科': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://gotion.zhiye.com',
  },
  '隆基绿能': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://longi.zhiye.com',
  },
  '阳光电源': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://sungrow.zhiye.com',
  },
  '远景': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://envision.jobs.feishu.cn',
  },
  '三一重能': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://sanyre.zhiye.com',
  },
  '禾迈': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.hoymiles.com/cn/careers/',
  },
  '正浩ecoflow': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.ecoflow.com/cn/careers',
  },
  '威迈斯': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.vmaxpower.com.cn/join',
  },
  '科华数据': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://kehua.zhiye.com',
  },
  '特变电工': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://tbea.zhiye.com',
  },
  '中国能建': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://zhaopin.ceec.net.cn',
  },
  '汇川技术': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://inovance.zhiye.com',
  },
  '大疆': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://we.dji.com/zh-CN/campus',
  },
  '三一重工': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://sany.zhiye.com',
  },
  '立讯精密': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://luxshare.zhiye.com',
  },
  '徐工': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://xcmg.zhiye.com',
  },
  '卡特彼勒': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.caterpillar.com/zh/careers.html',
  },
  '山推': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.shantui.com/careers/',
  },
  '合力叉车': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.helichina.com/join',
  },
  '海天塑机': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.haitianpm.com/cn/careers/',
  },
  '豪迈': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.himile.com/join',
  },
  '南高齿': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.ngctransmission.com/cn/career',
  },
  '中国中车': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.crrcgc.cc/g5121.aspx',
  },
  '宏工科技': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.honggong.com/join',
  },
  '东华工程': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.chinaecec.com/careers',
  },
  '西门子': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.siemens.com/cn/zh/company/jobs.html',
  },
  '施耐德': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.se.com/cn/zh/about-us/careers/overview.jsp',
  },
  '科大智能电气': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.csg.com.cn/join',
  },
  '英威腾': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://invt.zhiye.com',
  },
  '宝钢': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.baosteel.com/join',
  },
  '邦德': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.bodor.com/cn/career',
  },
  '美的集团': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://careers.midea.com',
  },
  '海尔': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://maker.haier.net/client/campus',
  },
  '格力': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://gree.zhiye.com',
  },
  '海信': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://hisense.zhiye.com',
  },
  'tcl': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://campus.tcl.com',
  },
  '长虹': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://changhong.zhiye.com',
  },
  '奥克斯': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://auxgroup.zhiye.com',
  },
  '中科美菱': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.zkmeiling.com/join',
  },
  '方太': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://fotile.zhiye.com',
  },
  '公牛': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://bull.zhiye.com',
  },
  '科沃斯': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://ecovacs.zhiye.com',
  },
  '九号': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://ninebot.zhiye.com',
  },
  '安克创新': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://anker-in.zhiye.com',
  },
  '小天才': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.okii.com/join',
  },
  'oppo': {
    status: 'started',
    evidence_text: 'OPPO 2027 届全球校园招聘已启动（校招简章）',
    evidence_url: 'https://careers.oppo.com/campus',
  },
  '联想': {
    status: 'started',
    evidence_text: '2027 届网申自 2026-08-05 开启',
    evidence_url: 'https://talent.lenovo.com.cn/campus',
  },
  '联宝': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://lcfc.zhiye.com',
  },
  '歌尔': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://goertek.zhiye.com',
  },
  '瑞声科技': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://aac.zhiye.com',
  },
  '和而泰': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.szhittech.com/join',
  },
  '爱玛': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://aimatech.zhiye.com',
  },
  '雅迪': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://yadea.zhiye.com',
  },
  '得力': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://deli.zhiye.com',
  },
  '华为': {
    status: 'started',
    evidence_text: '官网 2027 届应届生招聘对象与 AI 专项招聘进行中',
    evidence_url: 'https://career.huawei.com/reccampportal/portal5/campus-recruitment.html',
  },
  '腾讯': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://join.qq.com',
  },
  '字节跳动': {
    status: 'started',
    evidence_text: '2026-08-03 官方启动 2027 届校园招聘（公开报道与官网校招页）',
    evidence_url: 'https://jobs.bytedance.com/campus',
  },
  '美团': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://campus.meituan.com',
  },
  '阿里巴巴': {
    status: 'started',
    evidence_text: '2026-08-04 阿里巴巴 2027 届应届生招聘正式启动',
    evidence_url: 'https://campus.alibaba.com',
  },
  '京东': {
    status: 'started',
    evidence_text: '2026-08-03 宣布全面启动 2027 校园招聘 / JDS 校招',
    evidence_url: 'https://campus.jd.com',
  },
  '顺丰': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://hr.sf-express.com',
  },
  '途虎养车': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://tuhu.zhiye.com',
  },
  '得物': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://dewu.jobs.feishu.cn',
  },
  'shein': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://talent.sheincorp.cn',
  },
  '科大讯飞': {
    status: 'started',
    evidence_text: '科大讯飞 2027 届「飞凡计划」秋招正式启动',
    evidence_url: 'https://campus.iflytek.com',
  },
  '中兴': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://job.zte.com.cn',
  },
  '海康威视': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://campus.hikvision.com',
  },
  '锐捷网络': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://ruijie.zhiye.com',
  },
  'tp-link': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://hr.tp-link.com.cn',
  },
  '宝洁': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.pgcareers.com.cn',
  },
  '亿滋': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.mondelezinternational.com/careers/',
  },
  '伊利': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://yili.zhiye.com',
  },
  '蒙牛': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://mengniu.zhiye.com',
  },
  '农夫山泉': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.nongfuspring.com/careers',
  },
  '蜜雪冰城': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://www.mxbc.com/join',
  },
  '迪卡侬': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://careers.decathlon.com.cn',
  },
  '安踏': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://anta.zhiye.com',
  },
  '三棵树': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://skshu.zhiye.com',
  },
  '迈瑞医疗': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://mindray.zhiye.com',
  },
  '英科医疗': {
    status: 'not_started',
    evidence_text: '公开渠道暂未确认 2027 届校招网申已开放；请以官网为准。最近人工核对：2026-08-08',
    evidence_url: 'https://intco.zhiye.com',
  },
};

export function seedStatusForCompany(companyName: string, officialUrl: string): CampusRecruitmentStatus {
  const key = companyName
    .trim()
    .toLocaleLowerCase('zh-CN')
    .replace(/\s+/gu, '')
    .replace(/(?:股份有限责任公司|有限责任公司|股份有限公司|集团有限公司|集团公司|有限公司|公司)$/u, '');
  const seed = CAMPUS_RECRUITMENT_SEED[key];
  return {
    company_key: key,
    company_name: companyName,
    official_url: seed?.evidence_url || officialUrl,
    status: seed?.status ?? 'not_started',
    evidence_text: seed?.evidence_text ?? '公开渠道暂未确认 2027 届校招网申已开放。',
    evidence_url: seed?.evidence_url ?? officialUrl,
    last_checked_at: '2026-08-08T08:00:00.000Z',
    next_check_at: seed?.status === 'started' ? null : '2026-08-09T08:00:00.000Z',
    started_at: seed?.status === 'started' ? '2026-08-08T08:00:00.000Z' : null,
    error_message: null,
    check_count: 1,
  };
}
