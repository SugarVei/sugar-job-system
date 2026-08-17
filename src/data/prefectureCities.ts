import type { CapitalLabelPos } from './capitalCampusCompanies';

export interface PrefectureCity {
  name: string;
  officialName: string;
  province: string;
  adcode: number;
  lng: number;
  lat: number;
  isCapital: boolean;
  labelPos: CapitalLabelPos;
}

export const PREFECTURE_CITIES: PrefectureCity[] = [
  {
    "name": "北京",
    "officialName": "北京市",
    "province": "北京市",
    "adcode": 110000,
    "lng": 116.41,
    "lat": 39.9,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "天津",
    "officialName": "天津市",
    "province": "天津市",
    "adcode": 120000,
    "lng": 117.19,
    "lat": 39.13,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "石家庄",
    "officialName": "石家庄市",
    "province": "河北省",
    "adcode": 130100,
    "lng": 114.5,
    "lat": 38.05,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "太原",
    "officialName": "太原市",
    "province": "山西省",
    "adcode": 140100,
    "lng": 112.55,
    "lat": 37.86,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "呼和浩特",
    "officialName": "呼和浩特市",
    "province": "内蒙古自治区",
    "adcode": 150100,
    "lng": 111.67,
    "lat": 40.82,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "沈阳",
    "officialName": "沈阳市",
    "province": "辽宁省",
    "adcode": 210100,
    "lng": 123.43,
    "lat": 41.8,
    "isCapital": true,
    "labelPos": "left"
  },
  {
    "name": "长春",
    "officialName": "长春市",
    "province": "吉林省",
    "adcode": 220100,
    "lng": 125.32,
    "lat": 43.89,
    "isCapital": true,
    "labelPos": "left"
  },
  {
    "name": "哈尔滨",
    "officialName": "哈尔滨市",
    "province": "黑龙江省",
    "adcode": 230100,
    "lng": 126.64,
    "lat": 45.76,
    "isCapital": true,
    "labelPos": "left"
  },
  {
    "name": "上海",
    "officialName": "上海市",
    "province": "上海市",
    "adcode": 310000,
    "lng": 121.47,
    "lat": 31.23,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "南京",
    "officialName": "南京市",
    "province": "江苏省",
    "adcode": 320100,
    "lng": 118.77,
    "lat": 32.04,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "杭州",
    "officialName": "杭州市",
    "province": "浙江省",
    "adcode": 330100,
    "lng": 120.15,
    "lat": 30.29,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "合肥",
    "officialName": "合肥市",
    "province": "安徽省",
    "adcode": 340100,
    "lng": 117.28,
    "lat": 31.86,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "福州",
    "officialName": "福州市",
    "province": "福建省",
    "adcode": 350100,
    "lng": 119.31,
    "lat": 26.08,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "南昌",
    "officialName": "南昌市",
    "province": "江西省",
    "adcode": 360100,
    "lng": 115.89,
    "lat": 28.68,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "济南",
    "officialName": "济南市",
    "province": "山东省",
    "adcode": 370100,
    "lng": 117.0,
    "lat": 36.68,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "郑州",
    "officialName": "郑州市",
    "province": "河南省",
    "adcode": 410100,
    "lng": 113.67,
    "lat": 34.76,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "武汉",
    "officialName": "武汉市",
    "province": "湖北省",
    "adcode": 420100,
    "lng": 114.3,
    "lat": 30.58,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "长沙",
    "officialName": "长沙市",
    "province": "湖南省",
    "adcode": 430100,
    "lng": 112.98,
    "lat": 28.19,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "广州",
    "officialName": "广州市",
    "province": "广东省",
    "adcode": 440100,
    "lng": 113.28,
    "lat": 23.13,
    "isCapital": true,
    "labelPos": "top"
  },
  {
    "name": "南宁",
    "officialName": "南宁市",
    "province": "广西壮族自治区",
    "adcode": 450100,
    "lng": 108.32,
    "lat": 22.82,
    "isCapital": true,
    "labelPos": "top"
  },
  {
    "name": "海口",
    "officialName": "海口市",
    "province": "海南省",
    "adcode": 460100,
    "lng": 110.33,
    "lat": 20.03,
    "isCapital": true,
    "labelPos": "top"
  },
  {
    "name": "重庆",
    "officialName": "重庆市",
    "province": "重庆市",
    "adcode": 500000,
    "lng": 106.5,
    "lat": 29.53,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "成都",
    "officialName": "成都市",
    "province": "四川省",
    "adcode": 510100,
    "lng": 104.07,
    "lat": 30.66,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "贵阳",
    "officialName": "贵阳市",
    "province": "贵州省",
    "adcode": 520100,
    "lng": 106.71,
    "lat": 26.58,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "昆明",
    "officialName": "昆明市",
    "province": "云南省",
    "adcode": 530100,
    "lng": 102.71,
    "lat": 25.04,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "拉萨",
    "officialName": "拉萨市",
    "province": "西藏自治区",
    "adcode": 540100,
    "lng": 91.13,
    "lat": 29.66,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "西安",
    "officialName": "西安市",
    "province": "陕西省",
    "adcode": 610100,
    "lng": 108.95,
    "lat": 34.26,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "兰州",
    "officialName": "兰州市",
    "province": "甘肃省",
    "adcode": 620100,
    "lng": 103.82,
    "lat": 36.06,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "西宁",
    "officialName": "西宁市",
    "province": "青海省",
    "adcode": 630100,
    "lng": 101.78,
    "lat": 36.62,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "银川",
    "officialName": "银川市",
    "province": "宁夏回族自治区",
    "adcode": 640100,
    "lng": 106.28,
    "lat": 38.47,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "乌鲁木齐",
    "officialName": "乌鲁木齐市",
    "province": "新疆维吾尔自治区",
    "adcode": 650100,
    "lng": 87.62,
    "lat": 43.79,
    "isCapital": true,
    "labelPos": "right"
  },
  {
    "name": "唐山",
    "officialName": "唐山市",
    "province": "河北省",
    "adcode": 130200,
    "lng": 118.18,
    "lat": 39.64,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "秦皇岛",
    "officialName": "秦皇岛市",
    "province": "河北省",
    "adcode": 130300,
    "lng": 119.59,
    "lat": 39.94,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "邯郸",
    "officialName": "邯郸市",
    "province": "河北省",
    "adcode": 130400,
    "lng": 114.49,
    "lat": 36.61,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "邢台",
    "officialName": "邢台市",
    "province": "河北省",
    "adcode": 130500,
    "lng": 114.51,
    "lat": 37.07,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "保定",
    "officialName": "保定市",
    "province": "河北省",
    "adcode": 130600,
    "lng": 115.48,
    "lat": 38.87,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "张家口",
    "officialName": "张家口市",
    "province": "河北省",
    "adcode": 130700,
    "lng": 114.88,
    "lat": 40.81,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "承德",
    "officialName": "承德市",
    "province": "河北省",
    "adcode": 130800,
    "lng": 117.94,
    "lat": 40.98,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "沧州",
    "officialName": "沧州市",
    "province": "河北省",
    "adcode": 130900,
    "lng": 116.86,
    "lat": 38.31,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "廊坊",
    "officialName": "廊坊市",
    "province": "河北省",
    "adcode": 131000,
    "lng": 116.7,
    "lat": 39.52,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "衡水",
    "officialName": "衡水市",
    "province": "河北省",
    "adcode": 131100,
    "lng": 115.67,
    "lat": 37.74,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "大同",
    "officialName": "大同市",
    "province": "山西省",
    "adcode": 140200,
    "lng": 113.3,
    "lat": 40.09,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "阳泉",
    "officialName": "阳泉市",
    "province": "山西省",
    "adcode": 140300,
    "lng": 113.58,
    "lat": 37.86,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "长治",
    "officialName": "长治市",
    "province": "山西省",
    "adcode": 140400,
    "lng": 113.11,
    "lat": 36.19,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "晋城",
    "officialName": "晋城市",
    "province": "山西省",
    "adcode": 140500,
    "lng": 112.85,
    "lat": 35.5,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "朔州",
    "officialName": "朔州市",
    "province": "山西省",
    "adcode": 140600,
    "lng": 112.43,
    "lat": 39.33,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "晋中",
    "officialName": "晋中市",
    "province": "山西省",
    "adcode": 140700,
    "lng": 112.74,
    "lat": 37.7,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "运城",
    "officialName": "运城市",
    "province": "山西省",
    "adcode": 140800,
    "lng": 111.0,
    "lat": 35.02,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "忻州",
    "officialName": "忻州市",
    "province": "山西省",
    "adcode": 140900,
    "lng": 112.73,
    "lat": 38.42,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "临汾",
    "officialName": "临汾市",
    "province": "山西省",
    "adcode": 141000,
    "lng": 111.52,
    "lat": 36.08,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "吕梁",
    "officialName": "吕梁市",
    "province": "山西省",
    "adcode": 141100,
    "lng": 111.13,
    "lat": 37.52,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "包头",
    "officialName": "包头市",
    "province": "内蒙古自治区",
    "adcode": 150200,
    "lng": 109.84,
    "lat": 40.66,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "乌海",
    "officialName": "乌海市",
    "province": "内蒙古自治区",
    "adcode": 150300,
    "lng": 106.83,
    "lat": 39.67,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "赤峰",
    "officialName": "赤峰市",
    "province": "内蒙古自治区",
    "adcode": 150400,
    "lng": 118.96,
    "lat": 42.28,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "通辽",
    "officialName": "通辽市",
    "province": "内蒙古自治区",
    "adcode": 150500,
    "lng": 122.26,
    "lat": 43.62,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "鄂尔多斯",
    "officialName": "鄂尔多斯市",
    "province": "内蒙古自治区",
    "adcode": 150600,
    "lng": 109.99,
    "lat": 39.82,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "呼伦贝尔",
    "officialName": "呼伦贝尔市",
    "province": "内蒙古自治区",
    "adcode": 150700,
    "lng": 119.76,
    "lat": 49.22,
    "isCapital": false,
    "labelPos": "bottom"
  },
  {
    "name": "巴彦淖尔",
    "officialName": "巴彦淖尔市",
    "province": "内蒙古自治区",
    "adcode": 150800,
    "lng": 107.42,
    "lat": 40.76,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "乌兰察布",
    "officialName": "乌兰察布市",
    "province": "内蒙古自治区",
    "adcode": 150900,
    "lng": 113.11,
    "lat": 41.03,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "兴安盟",
    "officialName": "兴安盟",
    "province": "内蒙古自治区",
    "adcode": 152200,
    "lng": 122.07,
    "lat": 46.08,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "锡林郭勒盟",
    "officialName": "锡林郭勒盟",
    "province": "内蒙古自治区",
    "adcode": 152500,
    "lng": 116.09,
    "lat": 43.94,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "阿拉善盟",
    "officialName": "阿拉善盟",
    "province": "内蒙古自治区",
    "adcode": 152900,
    "lng": 105.71,
    "lat": 38.84,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "大连",
    "officialName": "大连市",
    "province": "辽宁省",
    "adcode": 210200,
    "lng": 121.62,
    "lat": 38.91,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "鞍山",
    "officialName": "鞍山市",
    "province": "辽宁省",
    "adcode": 210300,
    "lng": 123.0,
    "lat": 41.11,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "抚顺",
    "officialName": "抚顺市",
    "province": "辽宁省",
    "adcode": 210400,
    "lng": 123.92,
    "lat": 41.88,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "本溪",
    "officialName": "本溪市",
    "province": "辽宁省",
    "adcode": 210500,
    "lng": 123.77,
    "lat": 41.3,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "丹东",
    "officialName": "丹东市",
    "province": "辽宁省",
    "adcode": 210600,
    "lng": 124.38,
    "lat": 40.12,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "锦州",
    "officialName": "锦州市",
    "province": "辽宁省",
    "adcode": 210700,
    "lng": 121.14,
    "lat": 41.12,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "营口",
    "officialName": "营口市",
    "province": "辽宁省",
    "adcode": 210800,
    "lng": 122.24,
    "lat": 40.67,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "阜新",
    "officialName": "阜新市",
    "province": "辽宁省",
    "adcode": 210900,
    "lng": 121.65,
    "lat": 42.01,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "辽阳",
    "officialName": "辽阳市",
    "province": "辽宁省",
    "adcode": 211000,
    "lng": 123.18,
    "lat": 41.27,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "盘锦",
    "officialName": "盘锦市",
    "province": "辽宁省",
    "adcode": 211100,
    "lng": 122.07,
    "lat": 41.12,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "铁岭",
    "officialName": "铁岭市",
    "province": "辽宁省",
    "adcode": 211200,
    "lng": 123.84,
    "lat": 42.29,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "朝阳",
    "officialName": "朝阳市",
    "province": "辽宁省",
    "adcode": 211300,
    "lng": 120.45,
    "lat": 41.58,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "葫芦岛",
    "officialName": "葫芦岛市",
    "province": "辽宁省",
    "adcode": 211400,
    "lng": 120.86,
    "lat": 40.76,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "吉林",
    "officialName": "吉林市",
    "province": "吉林省",
    "adcode": 220200,
    "lng": 126.55,
    "lat": 43.84,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "四平",
    "officialName": "四平市",
    "province": "吉林省",
    "adcode": 220300,
    "lng": 124.37,
    "lat": 43.17,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "辽源",
    "officialName": "辽源市",
    "province": "吉林省",
    "adcode": 220400,
    "lng": 125.15,
    "lat": 42.9,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "通化",
    "officialName": "通化市",
    "province": "吉林省",
    "adcode": 220500,
    "lng": 125.94,
    "lat": 41.72,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "白山",
    "officialName": "白山市",
    "province": "吉林省",
    "adcode": 220600,
    "lng": 126.43,
    "lat": 41.94,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "松原",
    "officialName": "松原市",
    "province": "吉林省",
    "adcode": 220700,
    "lng": 124.82,
    "lat": 45.12,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "白城",
    "officialName": "白城市",
    "province": "吉林省",
    "adcode": 220800,
    "lng": 122.84,
    "lat": 45.62,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "延边",
    "officialName": "延边朝鲜族自治州",
    "province": "吉林省",
    "adcode": 222400,
    "lng": 129.51,
    "lat": 42.9,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "齐齐哈尔",
    "officialName": "齐齐哈尔市",
    "province": "黑龙江省",
    "adcode": 230200,
    "lng": 123.96,
    "lat": 47.34,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "鸡西",
    "officialName": "鸡西市",
    "province": "黑龙江省",
    "adcode": 230300,
    "lng": 130.98,
    "lat": 45.3,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "鹤岗",
    "officialName": "鹤岗市",
    "province": "黑龙江省",
    "adcode": 230400,
    "lng": 130.28,
    "lat": 47.33,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "双鸭山",
    "officialName": "双鸭山市",
    "province": "黑龙江省",
    "adcode": 230500,
    "lng": 131.16,
    "lat": 46.64,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "大庆",
    "officialName": "大庆市",
    "province": "黑龙江省",
    "adcode": 230600,
    "lng": 125.11,
    "lat": 46.59,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "伊春",
    "officialName": "伊春市",
    "province": "黑龙江省",
    "adcode": 230700,
    "lng": 128.9,
    "lat": 47.72,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "佳木斯",
    "officialName": "佳木斯市",
    "province": "黑龙江省",
    "adcode": 230800,
    "lng": 130.36,
    "lat": 46.81,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "七台河",
    "officialName": "七台河市",
    "province": "黑龙江省",
    "adcode": 230900,
    "lng": 131.02,
    "lat": 45.77,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "牡丹江",
    "officialName": "牡丹江市",
    "province": "黑龙江省",
    "adcode": 231000,
    "lng": 129.62,
    "lat": 44.58,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "黑河",
    "officialName": "黑河市",
    "province": "黑龙江省",
    "adcode": 231100,
    "lng": 127.5,
    "lat": 50.25,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "绥化",
    "officialName": "绥化市",
    "province": "黑龙江省",
    "adcode": 231200,
    "lng": 126.99,
    "lat": 46.64,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "大兴安岭",
    "officialName": "大兴安岭地区",
    "province": "黑龙江省",
    "adcode": 232700,
    "lng": 124.71,
    "lat": 52.34,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "无锡",
    "officialName": "无锡市",
    "province": "江苏省",
    "adcode": 320200,
    "lng": 120.3,
    "lat": 31.57,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "徐州",
    "officialName": "徐州市",
    "province": "江苏省",
    "adcode": 320300,
    "lng": 117.18,
    "lat": 34.26,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "常州",
    "officialName": "常州市",
    "province": "江苏省",
    "adcode": 320400,
    "lng": 119.95,
    "lat": 31.77,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "苏州",
    "officialName": "苏州市",
    "province": "江苏省",
    "adcode": 320500,
    "lng": 120.62,
    "lat": 31.3,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "南通",
    "officialName": "南通市",
    "province": "江苏省",
    "adcode": 320600,
    "lng": 120.86,
    "lat": 32.02,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "连云港",
    "officialName": "连云港市",
    "province": "江苏省",
    "adcode": 320700,
    "lng": 119.18,
    "lat": 34.6,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "淮安",
    "officialName": "淮安市",
    "province": "江苏省",
    "adcode": 320800,
    "lng": 119.02,
    "lat": 33.6,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "盐城",
    "officialName": "盐城市",
    "province": "江苏省",
    "adcode": 320900,
    "lng": 120.14,
    "lat": 33.38,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "扬州",
    "officialName": "扬州市",
    "province": "江苏省",
    "adcode": 321000,
    "lng": 119.42,
    "lat": 32.39,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "镇江",
    "officialName": "镇江市",
    "province": "江苏省",
    "adcode": 321100,
    "lng": 119.45,
    "lat": 32.2,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "泰州",
    "officialName": "泰州市",
    "province": "江苏省",
    "adcode": 321200,
    "lng": 119.92,
    "lat": 32.48,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "宿迁",
    "officialName": "宿迁市",
    "province": "江苏省",
    "adcode": 321300,
    "lng": 118.28,
    "lat": 33.96,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "宁波",
    "officialName": "宁波市",
    "province": "浙江省",
    "adcode": 330200,
    "lng": 121.55,
    "lat": 29.87,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "温州",
    "officialName": "温州市",
    "province": "浙江省",
    "adcode": 330300,
    "lng": 120.67,
    "lat": 28.0,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "嘉兴",
    "officialName": "嘉兴市",
    "province": "浙江省",
    "adcode": 330400,
    "lng": 120.75,
    "lat": 30.76,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "湖州",
    "officialName": "湖州市",
    "province": "浙江省",
    "adcode": 330500,
    "lng": 120.1,
    "lat": 30.87,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "绍兴",
    "officialName": "绍兴市",
    "province": "浙江省",
    "adcode": 330600,
    "lng": 120.58,
    "lat": 30.0,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "金华",
    "officialName": "金华市",
    "province": "浙江省",
    "adcode": 330700,
    "lng": 119.65,
    "lat": 29.09,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "衢州",
    "officialName": "衢州市",
    "province": "浙江省",
    "adcode": 330800,
    "lng": 118.87,
    "lat": 28.94,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "舟山",
    "officialName": "舟山市",
    "province": "浙江省",
    "adcode": 330900,
    "lng": 122.11,
    "lat": 30.02,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "台州",
    "officialName": "台州市",
    "province": "浙江省",
    "adcode": 331000,
    "lng": 121.43,
    "lat": 28.66,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "丽水",
    "officialName": "丽水市",
    "province": "浙江省",
    "adcode": 331100,
    "lng": 119.92,
    "lat": 28.45,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "芜湖",
    "officialName": "芜湖市",
    "province": "安徽省",
    "adcode": 340200,
    "lng": 118.38,
    "lat": 31.33,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "蚌埠",
    "officialName": "蚌埠市",
    "province": "安徽省",
    "adcode": 340300,
    "lng": 117.36,
    "lat": 32.94,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "淮南",
    "officialName": "淮南市",
    "province": "安徽省",
    "adcode": 340400,
    "lng": 117.02,
    "lat": 32.65,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "马鞍山",
    "officialName": "马鞍山市",
    "province": "安徽省",
    "adcode": 340500,
    "lng": 118.51,
    "lat": 31.69,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "淮北",
    "officialName": "淮北市",
    "province": "安徽省",
    "adcode": 340600,
    "lng": 116.79,
    "lat": 33.97,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "铜陵",
    "officialName": "铜陵市",
    "province": "安徽省",
    "adcode": 340700,
    "lng": 117.82,
    "lat": 30.93,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "安庆",
    "officialName": "安庆市",
    "province": "安徽省",
    "adcode": 340800,
    "lng": 117.04,
    "lat": 30.51,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "黄山",
    "officialName": "黄山市",
    "province": "安徽省",
    "adcode": 341000,
    "lng": 118.32,
    "lat": 29.71,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "滁州",
    "officialName": "滁州市",
    "province": "安徽省",
    "adcode": 341100,
    "lng": 118.32,
    "lat": 32.3,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "阜阳",
    "officialName": "阜阳市",
    "province": "安徽省",
    "adcode": 341200,
    "lng": 115.82,
    "lat": 32.9,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "宿州",
    "officialName": "宿州市",
    "province": "安徽省",
    "adcode": 341300,
    "lng": 116.98,
    "lat": 33.63,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "六安",
    "officialName": "六安市",
    "province": "安徽省",
    "adcode": 341500,
    "lng": 116.51,
    "lat": 31.75,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "亳州",
    "officialName": "亳州市",
    "province": "安徽省",
    "adcode": 341600,
    "lng": 115.78,
    "lat": 33.87,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "池州",
    "officialName": "池州市",
    "province": "安徽省",
    "adcode": 341700,
    "lng": 117.49,
    "lat": 30.66,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "宣城",
    "officialName": "宣城市",
    "province": "安徽省",
    "adcode": 341800,
    "lng": 118.76,
    "lat": 30.95,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "厦门",
    "officialName": "厦门市",
    "province": "福建省",
    "adcode": 350200,
    "lng": 118.11,
    "lat": 24.49,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "莆田",
    "officialName": "莆田市",
    "province": "福建省",
    "adcode": 350300,
    "lng": 119.01,
    "lat": 25.43,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "三明",
    "officialName": "三明市",
    "province": "福建省",
    "adcode": 350400,
    "lng": 117.64,
    "lat": 26.27,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "泉州",
    "officialName": "泉州市",
    "province": "福建省",
    "adcode": 350500,
    "lng": 118.59,
    "lat": 24.91,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "漳州",
    "officialName": "漳州市",
    "province": "福建省",
    "adcode": 350600,
    "lng": 117.66,
    "lat": 24.51,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "南平",
    "officialName": "南平市",
    "province": "福建省",
    "adcode": 350700,
    "lng": 118.18,
    "lat": 26.64,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "龙岩",
    "officialName": "龙岩市",
    "province": "福建省",
    "adcode": 350800,
    "lng": 117.03,
    "lat": 25.09,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "宁德",
    "officialName": "宁德市",
    "province": "福建省",
    "adcode": 350900,
    "lng": 119.53,
    "lat": 26.66,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "景德镇",
    "officialName": "景德镇市",
    "province": "江西省",
    "adcode": 360200,
    "lng": 117.21,
    "lat": 29.29,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "萍乡",
    "officialName": "萍乡市",
    "province": "江西省",
    "adcode": 360300,
    "lng": 113.85,
    "lat": 27.62,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "九江",
    "officialName": "九江市",
    "province": "江西省",
    "adcode": 360400,
    "lng": 115.99,
    "lat": 29.71,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "新余",
    "officialName": "新余市",
    "province": "江西省",
    "adcode": 360500,
    "lng": 114.93,
    "lat": 27.81,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "鹰潭",
    "officialName": "鹰潭市",
    "province": "江西省",
    "adcode": 360600,
    "lng": 117.03,
    "lat": 28.24,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "赣州",
    "officialName": "赣州市",
    "province": "江西省",
    "adcode": 360700,
    "lng": 114.94,
    "lat": 25.85,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "吉安",
    "officialName": "吉安市",
    "province": "江西省",
    "adcode": 360800,
    "lng": 114.99,
    "lat": 27.11,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "宜春",
    "officialName": "宜春市",
    "province": "江西省",
    "adcode": 360900,
    "lng": 114.39,
    "lat": 27.8,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "抚州",
    "officialName": "抚州市",
    "province": "江西省",
    "adcode": 361000,
    "lng": 116.36,
    "lat": 27.98,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "上饶",
    "officialName": "上饶市",
    "province": "江西省",
    "adcode": 361100,
    "lng": 117.97,
    "lat": 28.44,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "青岛",
    "officialName": "青岛市",
    "province": "山东省",
    "adcode": 370200,
    "lng": 120.36,
    "lat": 36.08,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "淄博",
    "officialName": "淄博市",
    "province": "山东省",
    "adcode": 370300,
    "lng": 118.05,
    "lat": 36.81,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "枣庄",
    "officialName": "枣庄市",
    "province": "山东省",
    "adcode": 370400,
    "lng": 117.56,
    "lat": 34.86,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "东营",
    "officialName": "东营市",
    "province": "山东省",
    "adcode": 370500,
    "lng": 118.66,
    "lat": 37.43,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "烟台",
    "officialName": "烟台市",
    "province": "山东省",
    "adcode": 370600,
    "lng": 121.39,
    "lat": 37.54,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "潍坊",
    "officialName": "潍坊市",
    "province": "山东省",
    "adcode": 370700,
    "lng": 119.11,
    "lat": 36.71,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "济宁",
    "officialName": "济宁市",
    "province": "山东省",
    "adcode": 370800,
    "lng": 116.59,
    "lat": 35.42,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "泰安",
    "officialName": "泰安市",
    "province": "山东省",
    "adcode": 370900,
    "lng": 117.13,
    "lat": 36.19,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "威海",
    "officialName": "威海市",
    "province": "山东省",
    "adcode": 371000,
    "lng": 122.12,
    "lat": 37.51,
    "isCapital": false,
    "labelPos": "left"
  },
  {
    "name": "日照",
    "officialName": "日照市",
    "province": "山东省",
    "adcode": 371100,
    "lng": 119.46,
    "lat": 35.43,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "临沂",
    "officialName": "临沂市",
    "province": "山东省",
    "adcode": 371300,
    "lng": 118.33,
    "lat": 35.07,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "德州",
    "officialName": "德州市",
    "province": "山东省",
    "adcode": 371400,
    "lng": 116.31,
    "lat": 37.45,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "聊城",
    "officialName": "聊城市",
    "province": "山东省",
    "adcode": 371500,
    "lng": 115.98,
    "lat": 36.46,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "滨州",
    "officialName": "滨州市",
    "province": "山东省",
    "adcode": 371600,
    "lng": 118.02,
    "lat": 37.38,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "菏泽",
    "officialName": "菏泽市",
    "province": "山东省",
    "adcode": 371700,
    "lng": 115.47,
    "lat": 35.25,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "开封",
    "officialName": "开封市",
    "province": "河南省",
    "adcode": 410200,
    "lng": 114.34,
    "lat": 34.8,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "洛阳",
    "officialName": "洛阳市",
    "province": "河南省",
    "adcode": 410300,
    "lng": 112.43,
    "lat": 34.66,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "平顶山",
    "officialName": "平顶山市",
    "province": "河南省",
    "adcode": 410400,
    "lng": 113.31,
    "lat": 33.74,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "安阳",
    "officialName": "安阳市",
    "province": "河南省",
    "adcode": 410500,
    "lng": 114.35,
    "lat": 36.1,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "鹤壁",
    "officialName": "鹤壁市",
    "province": "河南省",
    "adcode": 410600,
    "lng": 114.3,
    "lat": 35.75,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "新乡",
    "officialName": "新乡市",
    "province": "河南省",
    "adcode": 410700,
    "lng": 113.88,
    "lat": 35.3,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "焦作",
    "officialName": "焦作市",
    "province": "河南省",
    "adcode": 410800,
    "lng": 113.24,
    "lat": 35.24,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "濮阳",
    "officialName": "濮阳市",
    "province": "河南省",
    "adcode": 410900,
    "lng": 115.04,
    "lat": 35.77,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "许昌",
    "officialName": "许昌市",
    "province": "河南省",
    "adcode": 411000,
    "lng": 113.83,
    "lat": 34.02,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "漯河",
    "officialName": "漯河市",
    "province": "河南省",
    "adcode": 411100,
    "lng": 114.03,
    "lat": 33.58,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "三门峡",
    "officialName": "三门峡市",
    "province": "河南省",
    "adcode": 411200,
    "lng": 111.19,
    "lat": 34.78,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "南阳",
    "officialName": "南阳市",
    "province": "河南省",
    "adcode": 411300,
    "lng": 112.54,
    "lat": 33.0,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "商丘",
    "officialName": "商丘市",
    "province": "河南省",
    "adcode": 411400,
    "lng": 115.65,
    "lat": 34.44,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "信阳",
    "officialName": "信阳市",
    "province": "河南省",
    "adcode": 411500,
    "lng": 114.08,
    "lat": 32.12,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "周口",
    "officialName": "周口市",
    "province": "河南省",
    "adcode": 411600,
    "lng": 114.65,
    "lat": 33.62,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "驻马店",
    "officialName": "驻马店市",
    "province": "河南省",
    "adcode": 411700,
    "lng": 114.02,
    "lat": 32.98,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "黄石",
    "officialName": "黄石市",
    "province": "湖北省",
    "adcode": 420200,
    "lng": 115.08,
    "lat": 30.22,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "十堰",
    "officialName": "十堰市",
    "province": "湖北省",
    "adcode": 420300,
    "lng": 110.79,
    "lat": 32.65,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "宜昌",
    "officialName": "宜昌市",
    "province": "湖北省",
    "adcode": 420500,
    "lng": 111.29,
    "lat": 30.7,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "襄阳",
    "officialName": "襄阳市",
    "province": "湖北省",
    "adcode": 420600,
    "lng": 112.14,
    "lat": 32.04,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "鄂州",
    "officialName": "鄂州市",
    "province": "湖北省",
    "adcode": 420700,
    "lng": 114.89,
    "lat": 30.4,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "荆门",
    "officialName": "荆门市",
    "province": "湖北省",
    "adcode": 420800,
    "lng": 112.2,
    "lat": 31.04,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "孝感",
    "officialName": "孝感市",
    "province": "湖北省",
    "adcode": 420900,
    "lng": 113.93,
    "lat": 30.93,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "荆州",
    "officialName": "荆州市",
    "province": "湖北省",
    "adcode": 421000,
    "lng": 112.24,
    "lat": 30.33,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "黄冈",
    "officialName": "黄冈市",
    "province": "湖北省",
    "adcode": 421100,
    "lng": 114.88,
    "lat": 30.45,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "咸宁",
    "officialName": "咸宁市",
    "province": "湖北省",
    "adcode": 421200,
    "lng": 114.33,
    "lat": 29.83,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "随州",
    "officialName": "随州市",
    "province": "湖北省",
    "adcode": 421300,
    "lng": 113.37,
    "lat": 31.72,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "恩施",
    "officialName": "恩施土家族苗族自治州",
    "province": "湖北省",
    "adcode": 422800,
    "lng": 109.49,
    "lat": 30.28,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "株洲",
    "officialName": "株洲市",
    "province": "湖南省",
    "adcode": 430200,
    "lng": 113.15,
    "lat": 27.84,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "湘潭",
    "officialName": "湘潭市",
    "province": "湖南省",
    "adcode": 430300,
    "lng": 112.94,
    "lat": 27.83,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "衡阳",
    "officialName": "衡阳市",
    "province": "湖南省",
    "adcode": 430400,
    "lng": 112.61,
    "lat": 26.9,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "邵阳",
    "officialName": "邵阳市",
    "province": "湖南省",
    "adcode": 430500,
    "lng": 111.47,
    "lat": 27.24,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "岳阳",
    "officialName": "岳阳市",
    "province": "湖南省",
    "adcode": 430600,
    "lng": 113.13,
    "lat": 29.37,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "常德",
    "officialName": "常德市",
    "province": "湖南省",
    "adcode": 430700,
    "lng": 111.69,
    "lat": 29.04,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "张家界",
    "officialName": "张家界市",
    "province": "湖南省",
    "adcode": 430800,
    "lng": 110.48,
    "lat": 29.13,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "益阳",
    "officialName": "益阳市",
    "province": "湖南省",
    "adcode": 430900,
    "lng": 112.36,
    "lat": 28.57,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "郴州",
    "officialName": "郴州市",
    "province": "湖南省",
    "adcode": 431000,
    "lng": 113.03,
    "lat": 25.79,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "永州",
    "officialName": "永州市",
    "province": "湖南省",
    "adcode": 431100,
    "lng": 111.61,
    "lat": 26.43,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "怀化",
    "officialName": "怀化市",
    "province": "湖南省",
    "adcode": 431200,
    "lng": 109.98,
    "lat": 27.55,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "娄底",
    "officialName": "娄底市",
    "province": "湖南省",
    "adcode": 431300,
    "lng": 112.01,
    "lat": 27.73,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "湘西",
    "officialName": "湘西土家族苗族自治州",
    "province": "湖南省",
    "adcode": 433100,
    "lng": 109.74,
    "lat": 28.31,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "韶关",
    "officialName": "韶关市",
    "province": "广东省",
    "adcode": 440200,
    "lng": 113.59,
    "lat": 24.8,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "深圳",
    "officialName": "深圳市",
    "province": "广东省",
    "adcode": 440300,
    "lng": 114.09,
    "lat": 22.55,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "珠海",
    "officialName": "珠海市",
    "province": "广东省",
    "adcode": 440400,
    "lng": 113.55,
    "lat": 22.22,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "汕头",
    "officialName": "汕头市",
    "province": "广东省",
    "adcode": 440500,
    "lng": 116.71,
    "lat": 23.37,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "佛山",
    "officialName": "佛山市",
    "province": "广东省",
    "adcode": 440600,
    "lng": 113.12,
    "lat": 23.03,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "江门",
    "officialName": "江门市",
    "province": "广东省",
    "adcode": 440700,
    "lng": 113.09,
    "lat": 22.59,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "湛江",
    "officialName": "湛江市",
    "province": "广东省",
    "adcode": 440800,
    "lng": 110.36,
    "lat": 21.27,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "茂名",
    "officialName": "茂名市",
    "province": "广东省",
    "adcode": 440900,
    "lng": 110.92,
    "lat": 21.66,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "肇庆",
    "officialName": "肇庆市",
    "province": "广东省",
    "adcode": 441200,
    "lng": 112.47,
    "lat": 23.05,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "惠州",
    "officialName": "惠州市",
    "province": "广东省",
    "adcode": 441300,
    "lng": 114.41,
    "lat": 23.08,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "梅州",
    "officialName": "梅州市",
    "province": "广东省",
    "adcode": 441400,
    "lng": 116.12,
    "lat": 24.3,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "汕尾",
    "officialName": "汕尾市",
    "province": "广东省",
    "adcode": 441500,
    "lng": 115.36,
    "lat": 22.77,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "河源",
    "officialName": "河源市",
    "province": "广东省",
    "adcode": 441600,
    "lng": 114.7,
    "lat": 23.75,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "阳江",
    "officialName": "阳江市",
    "province": "广东省",
    "adcode": 441700,
    "lng": 111.98,
    "lat": 21.86,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "清远",
    "officialName": "清远市",
    "province": "广东省",
    "adcode": 441800,
    "lng": 113.05,
    "lat": 23.69,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "东莞",
    "officialName": "东莞市",
    "province": "广东省",
    "adcode": 441900,
    "lng": 113.75,
    "lat": 23.05,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "中山",
    "officialName": "中山市",
    "province": "广东省",
    "adcode": 442000,
    "lng": 113.38,
    "lat": 22.52,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "潮州",
    "officialName": "潮州市",
    "province": "广东省",
    "adcode": 445100,
    "lng": 116.63,
    "lat": 23.66,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "揭阳",
    "officialName": "揭阳市",
    "province": "广东省",
    "adcode": 445200,
    "lng": 116.36,
    "lat": 23.54,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "云浮",
    "officialName": "云浮市",
    "province": "广东省",
    "adcode": 445300,
    "lng": 112.04,
    "lat": 22.93,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "柳州",
    "officialName": "柳州市",
    "province": "广西壮族自治区",
    "adcode": 450200,
    "lng": 109.41,
    "lat": 24.31,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "桂林",
    "officialName": "桂林市",
    "province": "广西壮族自治区",
    "adcode": 450300,
    "lng": 110.3,
    "lat": 25.27,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "梧州",
    "officialName": "梧州市",
    "province": "广西壮族自治区",
    "adcode": 450400,
    "lng": 111.3,
    "lat": 23.47,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "北海",
    "officialName": "北海市",
    "province": "广西壮族自治区",
    "adcode": 450500,
    "lng": 109.12,
    "lat": 21.47,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "防城港",
    "officialName": "防城港市",
    "province": "广西壮族自治区",
    "adcode": 450600,
    "lng": 108.35,
    "lat": 21.61,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "钦州",
    "officialName": "钦州市",
    "province": "广西壮族自治区",
    "adcode": 450700,
    "lng": 108.62,
    "lat": 21.97,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "贵港",
    "officialName": "贵港市",
    "province": "广西壮族自治区",
    "adcode": 450800,
    "lng": 109.6,
    "lat": 23.09,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "玉林",
    "officialName": "玉林市",
    "province": "广西壮族自治区",
    "adcode": 450900,
    "lng": 110.15,
    "lat": 22.63,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "百色",
    "officialName": "百色市",
    "province": "广西壮族自治区",
    "adcode": 451000,
    "lng": 106.62,
    "lat": 23.9,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "贺州",
    "officialName": "贺州市",
    "province": "广西壮族自治区",
    "adcode": 451100,
    "lng": 111.55,
    "lat": 24.41,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "河池",
    "officialName": "河池市",
    "province": "广西壮族自治区",
    "adcode": 451200,
    "lng": 108.06,
    "lat": 24.7,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "来宾",
    "officialName": "来宾市",
    "province": "广西壮族自治区",
    "adcode": 451300,
    "lng": 109.23,
    "lat": 23.73,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "崇左",
    "officialName": "崇左市",
    "province": "广西壮族自治区",
    "adcode": 451400,
    "lng": 107.35,
    "lat": 22.4,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "三亚",
    "officialName": "三亚市",
    "province": "海南省",
    "adcode": 460200,
    "lng": 109.51,
    "lat": 18.25,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "儋州",
    "officialName": "儋州市",
    "province": "海南省",
    "adcode": 460400,
    "lng": 109.58,
    "lat": 19.52,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "自贡",
    "officialName": "自贡市",
    "province": "四川省",
    "adcode": 510300,
    "lng": 104.77,
    "lat": 29.35,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "攀枝花",
    "officialName": "攀枝花市",
    "province": "四川省",
    "adcode": 510400,
    "lng": 101.72,
    "lat": 26.58,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "泸州",
    "officialName": "泸州市",
    "province": "四川省",
    "adcode": 510500,
    "lng": 105.44,
    "lat": 28.89,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "德阳",
    "officialName": "德阳市",
    "province": "四川省",
    "adcode": 510600,
    "lng": 104.4,
    "lat": 31.13,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "绵阳",
    "officialName": "绵阳市",
    "province": "四川省",
    "adcode": 510700,
    "lng": 104.74,
    "lat": 31.46,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "广元",
    "officialName": "广元市",
    "province": "四川省",
    "adcode": 510800,
    "lng": 105.83,
    "lat": 32.43,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "遂宁",
    "officialName": "遂宁市",
    "province": "四川省",
    "adcode": 510900,
    "lng": 105.57,
    "lat": 30.51,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "内江",
    "officialName": "内江市",
    "province": "四川省",
    "adcode": 511000,
    "lng": 105.07,
    "lat": 29.59,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "乐山",
    "officialName": "乐山市",
    "province": "四川省",
    "adcode": 511100,
    "lng": 103.76,
    "lat": 29.58,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "南充",
    "officialName": "南充市",
    "province": "四川省",
    "adcode": 511300,
    "lng": 106.08,
    "lat": 30.8,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "眉山",
    "officialName": "眉山市",
    "province": "四川省",
    "adcode": 511400,
    "lng": 103.83,
    "lat": 30.05,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "宜宾",
    "officialName": "宜宾市",
    "province": "四川省",
    "adcode": 511500,
    "lng": 104.63,
    "lat": 28.76,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "广安",
    "officialName": "广安市",
    "province": "四川省",
    "adcode": 511600,
    "lng": 106.63,
    "lat": 30.46,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "达州",
    "officialName": "达州市",
    "province": "四川省",
    "adcode": 511700,
    "lng": 107.5,
    "lat": 31.21,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "雅安",
    "officialName": "雅安市",
    "province": "四川省",
    "adcode": 511800,
    "lng": 103.0,
    "lat": 29.99,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "巴中",
    "officialName": "巴中市",
    "province": "四川省",
    "adcode": 511900,
    "lng": 106.75,
    "lat": 31.86,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "资阳",
    "officialName": "资阳市",
    "province": "四川省",
    "adcode": 512000,
    "lng": 104.64,
    "lat": 30.12,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "阿坝",
    "officialName": "阿坝藏族羌族自治州",
    "province": "四川省",
    "adcode": 513200,
    "lng": 102.22,
    "lat": 31.9,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "甘孜",
    "officialName": "甘孜藏族自治州",
    "province": "四川省",
    "adcode": 513300,
    "lng": 101.96,
    "lat": 30.05,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "凉山",
    "officialName": "凉山彝族自治州",
    "province": "四川省",
    "adcode": 513400,
    "lng": 102.26,
    "lat": 27.89,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "六盘水",
    "officialName": "六盘水市",
    "province": "贵州省",
    "adcode": 520200,
    "lng": 104.85,
    "lat": 26.58,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "遵义",
    "officialName": "遵义市",
    "province": "贵州省",
    "adcode": 520300,
    "lng": 106.94,
    "lat": 27.71,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "安顺",
    "officialName": "安顺市",
    "province": "贵州省",
    "adcode": 520400,
    "lng": 105.93,
    "lat": 26.25,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "毕节",
    "officialName": "毕节市",
    "province": "贵州省",
    "adcode": 520500,
    "lng": 105.29,
    "lat": 27.3,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "铜仁",
    "officialName": "铜仁市",
    "province": "贵州省",
    "adcode": 520600,
    "lng": 109.19,
    "lat": 27.72,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "黔西南",
    "officialName": "黔西南布依族苗族自治州",
    "province": "贵州省",
    "adcode": 522300,
    "lng": 104.9,
    "lat": 25.09,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "黔东南",
    "officialName": "黔东南苗族侗族自治州",
    "province": "贵州省",
    "adcode": 522600,
    "lng": 107.98,
    "lat": 26.58,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "黔南",
    "officialName": "黔南布依族苗族自治州",
    "province": "贵州省",
    "adcode": 522700,
    "lng": 107.52,
    "lat": 26.26,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "曲靖",
    "officialName": "曲靖市",
    "province": "云南省",
    "adcode": 530300,
    "lng": 103.8,
    "lat": 25.5,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "玉溪",
    "officialName": "玉溪市",
    "province": "云南省",
    "adcode": 530400,
    "lng": 102.54,
    "lat": 24.35,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "保山",
    "officialName": "保山市",
    "province": "云南省",
    "adcode": 530500,
    "lng": 99.17,
    "lat": 25.11,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "昭通",
    "officialName": "昭通市",
    "province": "云南省",
    "adcode": 530600,
    "lng": 103.72,
    "lat": 27.34,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "丽江",
    "officialName": "丽江市",
    "province": "云南省",
    "adcode": 530700,
    "lng": 100.23,
    "lat": 26.87,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "普洱",
    "officialName": "普洱市",
    "province": "云南省",
    "adcode": 530800,
    "lng": 100.97,
    "lat": 22.78,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "临沧",
    "officialName": "临沧市",
    "province": "云南省",
    "adcode": 530900,
    "lng": 100.09,
    "lat": 23.89,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "楚雄",
    "officialName": "楚雄彝族自治州",
    "province": "云南省",
    "adcode": 532300,
    "lng": 101.55,
    "lat": 25.04,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "红河",
    "officialName": "红河哈尼族彝族自治州",
    "province": "云南省",
    "adcode": 532500,
    "lng": 103.38,
    "lat": 23.37,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "文山",
    "officialName": "文山壮族苗族自治州",
    "province": "云南省",
    "adcode": 532600,
    "lng": 104.24,
    "lat": 23.37,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "西双版纳",
    "officialName": "西双版纳傣族自治州",
    "province": "云南省",
    "adcode": 532800,
    "lng": 100.8,
    "lat": 22.0,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "大理",
    "officialName": "大理白族自治州",
    "province": "云南省",
    "adcode": 532900,
    "lng": 100.23,
    "lat": 25.59,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "德宏",
    "officialName": "德宏傣族景颇族自治州",
    "province": "云南省",
    "adcode": 533100,
    "lng": 98.58,
    "lat": 24.44,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "怒江",
    "officialName": "怒江傈僳族自治州",
    "province": "云南省",
    "adcode": 533300,
    "lng": 98.85,
    "lat": 25.85,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "迪庆",
    "officialName": "迪庆藏族自治州",
    "province": "云南省",
    "adcode": 533400,
    "lng": 99.71,
    "lat": 27.83,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "日喀则",
    "officialName": "日喀则市",
    "province": "西藏自治区",
    "adcode": 540200,
    "lng": 88.89,
    "lat": 29.27,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "昌都",
    "officialName": "昌都市",
    "province": "西藏自治区",
    "adcode": 540300,
    "lng": 97.18,
    "lat": 31.14,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "林芝",
    "officialName": "林芝市",
    "province": "西藏自治区",
    "adcode": 540400,
    "lng": 94.36,
    "lat": 29.65,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "山南",
    "officialName": "山南市",
    "province": "西藏自治区",
    "adcode": 540500,
    "lng": 91.77,
    "lat": 29.24,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "那曲",
    "officialName": "那曲市",
    "province": "西藏自治区",
    "adcode": 540600,
    "lng": 92.06,
    "lat": 31.48,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "阿里",
    "officialName": "阿里地区",
    "province": "西藏自治区",
    "adcode": 542500,
    "lng": 80.11,
    "lat": 32.5,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "铜川",
    "officialName": "铜川市",
    "province": "陕西省",
    "adcode": 610200,
    "lng": 108.98,
    "lat": 34.92,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "宝鸡",
    "officialName": "宝鸡市",
    "province": "陕西省",
    "adcode": 610300,
    "lng": 107.14,
    "lat": 34.37,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "咸阳",
    "officialName": "咸阳市",
    "province": "陕西省",
    "adcode": 610400,
    "lng": 108.71,
    "lat": 34.33,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "渭南",
    "officialName": "渭南市",
    "province": "陕西省",
    "adcode": 610500,
    "lng": 109.5,
    "lat": 34.5,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "延安",
    "officialName": "延安市",
    "province": "陕西省",
    "adcode": 610600,
    "lng": 109.49,
    "lat": 36.6,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "汉中",
    "officialName": "汉中市",
    "province": "陕西省",
    "adcode": 610700,
    "lng": 107.03,
    "lat": 33.08,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "榆林",
    "officialName": "榆林市",
    "province": "陕西省",
    "adcode": 610800,
    "lng": 109.74,
    "lat": 38.29,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "安康",
    "officialName": "安康市",
    "province": "陕西省",
    "adcode": 610900,
    "lng": 109.03,
    "lat": 32.69,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "商洛",
    "officialName": "商洛市",
    "province": "陕西省",
    "adcode": 611000,
    "lng": 109.94,
    "lat": 33.87,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "嘉峪关",
    "officialName": "嘉峪关市",
    "province": "甘肃省",
    "adcode": 620200,
    "lng": 98.28,
    "lat": 39.79,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "金昌",
    "officialName": "金昌市",
    "province": "甘肃省",
    "adcode": 620300,
    "lng": 102.19,
    "lat": 38.51,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "白银",
    "officialName": "白银市",
    "province": "甘肃省",
    "adcode": 620400,
    "lng": 104.17,
    "lat": 36.55,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "天水",
    "officialName": "天水市",
    "province": "甘肃省",
    "adcode": 620500,
    "lng": 105.72,
    "lat": 34.58,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "武威",
    "officialName": "武威市",
    "province": "甘肃省",
    "adcode": 620600,
    "lng": 102.63,
    "lat": 37.93,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "张掖",
    "officialName": "张掖市",
    "province": "甘肃省",
    "adcode": 620700,
    "lng": 100.46,
    "lat": 38.93,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "平凉",
    "officialName": "平凉市",
    "province": "甘肃省",
    "adcode": 620800,
    "lng": 106.68,
    "lat": 35.54,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "酒泉",
    "officialName": "酒泉市",
    "province": "甘肃省",
    "adcode": 620900,
    "lng": 98.51,
    "lat": 39.74,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "庆阳",
    "officialName": "庆阳市",
    "province": "甘肃省",
    "adcode": 621000,
    "lng": 107.64,
    "lat": 35.73,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "定西",
    "officialName": "定西市",
    "province": "甘肃省",
    "adcode": 621100,
    "lng": 104.63,
    "lat": 35.58,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "陇南",
    "officialName": "陇南市",
    "province": "甘肃省",
    "adcode": 621200,
    "lng": 104.93,
    "lat": 33.39,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "临夏",
    "officialName": "临夏回族自治州",
    "province": "甘肃省",
    "adcode": 622900,
    "lng": 103.21,
    "lat": 35.6,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "甘南",
    "officialName": "甘南藏族自治州",
    "province": "甘肃省",
    "adcode": 623000,
    "lng": 102.91,
    "lat": 34.99,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "海东",
    "officialName": "海东市",
    "province": "青海省",
    "adcode": 630200,
    "lng": 102.1,
    "lat": 36.5,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "海北",
    "officialName": "海北藏族自治州",
    "province": "青海省",
    "adcode": 632200,
    "lng": 100.9,
    "lat": 36.96,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "黄南",
    "officialName": "黄南藏族自治州",
    "province": "青海省",
    "adcode": 632300,
    "lng": 102.02,
    "lat": 35.52,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "海南州",
    "officialName": "海南藏族自治州",
    "province": "青海省",
    "adcode": 632500,
    "lng": 100.62,
    "lat": 36.28,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "果洛",
    "officialName": "果洛藏族自治州",
    "province": "青海省",
    "adcode": 632600,
    "lng": 100.24,
    "lat": 34.47,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "玉树",
    "officialName": "玉树藏族自治州",
    "province": "青海省",
    "adcode": 632700,
    "lng": 97.01,
    "lat": 33.0,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "海西",
    "officialName": "海西蒙古族藏族自治州",
    "province": "青海省",
    "adcode": 632800,
    "lng": 97.37,
    "lat": 37.37,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "石嘴山",
    "officialName": "石嘴山市",
    "province": "宁夏回族自治区",
    "adcode": 640200,
    "lng": 106.38,
    "lat": 39.01,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "吴忠",
    "officialName": "吴忠市",
    "province": "宁夏回族自治区",
    "adcode": 640300,
    "lng": 106.2,
    "lat": 37.99,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "固原",
    "officialName": "固原市",
    "province": "宁夏回族自治区",
    "adcode": 640400,
    "lng": 106.29,
    "lat": 36.0,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "中卫",
    "officialName": "中卫市",
    "province": "宁夏回族自治区",
    "adcode": 640500,
    "lng": 105.19,
    "lat": 37.51,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "克拉玛依",
    "officialName": "克拉玛依市",
    "province": "新疆维吾尔自治区",
    "adcode": 650200,
    "lng": 84.87,
    "lat": 45.6,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "吐鲁番",
    "officialName": "吐鲁番市",
    "province": "新疆维吾尔自治区",
    "adcode": 650400,
    "lng": 89.18,
    "lat": 42.95,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "哈密",
    "officialName": "哈密市",
    "province": "新疆维吾尔自治区",
    "adcode": 650500,
    "lng": 93.51,
    "lat": 42.83,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "昌吉",
    "officialName": "昌吉回族自治州",
    "province": "新疆维吾尔自治区",
    "adcode": 652300,
    "lng": 87.3,
    "lat": 44.01,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "博尔塔拉",
    "officialName": "博尔塔拉蒙古自治州",
    "province": "新疆维吾尔自治区",
    "adcode": 652700,
    "lng": 82.07,
    "lat": 44.9,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "巴音郭楞",
    "officialName": "巴音郭楞蒙古自治州",
    "province": "新疆维吾尔自治区",
    "adcode": 652800,
    "lng": 86.15,
    "lat": 41.77,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "阿克苏",
    "officialName": "阿克苏地区",
    "province": "新疆维吾尔自治区",
    "adcode": 652900,
    "lng": 80.27,
    "lat": 41.17,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "克孜勒苏",
    "officialName": "克孜勒苏柯尔克孜自治州",
    "province": "新疆维吾尔自治区",
    "adcode": 653000,
    "lng": 76.17,
    "lat": 39.71,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "喀什",
    "officialName": "喀什地区",
    "province": "新疆维吾尔自治区",
    "adcode": 653100,
    "lng": 75.99,
    "lat": 39.47,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "和田",
    "officialName": "和田地区",
    "province": "新疆维吾尔自治区",
    "adcode": 653200,
    "lng": 79.93,
    "lat": 37.11,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "伊犁",
    "officialName": "伊犁哈萨克自治州",
    "province": "新疆维吾尔自治区",
    "adcode": 654000,
    "lng": 81.32,
    "lat": 43.92,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "塔城",
    "officialName": "塔城地区",
    "province": "新疆维吾尔自治区",
    "adcode": 654200,
    "lng": 82.99,
    "lat": 46.75,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "阿勒泰",
    "officialName": "阿勒泰地区",
    "province": "新疆维吾尔自治区",
    "adcode": 654300,
    "lng": 88.14,
    "lat": 47.85,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "台湾",
    "officialName": "台湾省",
    "province": "台湾省",
    "adcode": 710000,
    "lng": 121.51,
    "lat": 25.04,
    "isCapital": false,
    "labelPos": "right"
  },
  {
    "name": "香港",
    "officialName": "香港特别行政区",
    "province": "香港特别行政区",
    "adcode": 810000,
    "lng": 114.17,
    "lat": 22.32,
    "isCapital": false,
    "labelPos": "top"
  },
  {
    "name": "澳门",
    "officialName": "澳门特别行政区",
    "province": "澳门特别行政区",
    "adcode": 820000,
    "lng": 113.55,
    "lat": 22.2,
    "isCapital": false,
    "labelPos": "top"
  }
];

export const PREFECTURE_BY_NAME = Object.fromEntries(
  PREFECTURE_CITIES.map((city) => [city.name, city]),
) as Record<string, PrefectureCity>;

export const UNSELECTABLE_GEO_NAMES = new Set(['台湾', '香港', '澳门']);

/** 热门公司总部里出现的县级市，归到所属地级市区域。 */
export const COUNTY_TO_PREFECTURE: Record<string, string> = {
  招远: '烟台',
  个旧: '红河',
  格尔木: '海西',
  高密: '潍坊',
  贵溪: '鹰潭',
  昆山: '苏州',
  晋江: '泉州',
  桐乡: '嘉兴',
  海南: '海口',
};
