import type { ActiveConfig } from '../contexts/ApiKeysContext';
import type {
  InterviewFeedback,
  JobAssistJdAnalysis,
  JobAssistPreferences,
  JobAssistProfile,
  JobAssistRoute,
  MockInterviewQuestion,
  TailoringResult,
} from '../types/jobAssist';
import { callAIJson } from './aiChatClient';

const SAFETY_RULES = `
你是 Sugar 求职辅助。必须遵守：
1. 只使用用户简历、JD、用户明确确认的事实和本轮回答，不猜测经历、指标、职责、技能熟练度或团队规模。
2. 简历没有的信息写“简历未提供，需要用户确认”；“接触过”不能改成“熟练”，“AI 辅助”不能说成独立完成。
3. 缺口只能分为表达缺口、信息缺口、能力缺口；能力缺口绝不能写进简历。
4. 不代替用户提交网申，不处理密码、Cookie、验证码、身份证、银行卡、健康/犯罪/征信、电子签名或法律声明。
5. 只输出合法 JSON，不要 Markdown、解释文字或代码围栏。`;

function routeLabel(route: JobAssistRoute) {
  return route === 'campus' ? '校招' : '社招';
}

export function analyzeResumeProfile({
  config,
  route,
  resumeText,
  corrections,
}: {
  config: ActiveConfig;
  route: JobAssistRoute;
  resumeText: string;
  corrections?: string;
}) {
  return callAIJson<JobAssistProfile>({
    config,
    maxTokens: 4096,
    messages: [
      {
        role: 'system',
        content: `${SAFETY_RULES}\n请分析${routeLabel(route)}简历，优势必须给出简历证据，推荐 2-3 个真实方向并把第一个标为主推。`,
      },
      {
        role: 'user',
        content: `简历原文：\n${resumeText}\n\n用户更正（如有，视为用户确认事实）：\n${corrections || '无'}\n\n返回结构：
{"snapshot":["画像要点"],"strengths":[{"conclusion":"结论","evidence":"原文证据"}],"weaknesses":[{"gap":"短板","impact":"影响环节"}],"directions":[{"title":"方向","typical_titles":["岗位标题"],"reason":"推荐理由","gaps":["需补内容"],"primary":true}],"needs_confirmation":["待确认信息"]}`,
      },
    ],
  });
}

export function analyzeJd({
  config,
  route,
  resumeText,
  profile,
  confirmedFacts,
  preferences,
  jdText,
}: {
  config: ActiveConfig;
  route: JobAssistRoute;
  resumeText: string;
  profile: JobAssistProfile;
  confirmedFacts: string[];
  preferences: JobAssistPreferences;
  jdText: string;
}) {
  const weights = route === 'campus'
    ? '硬技能30、项目/实习25、学历/届别/专业20、证书语言10、城市行业意向15'
    : '职级硬性要求30、相关工作成果30、技能20、行业业务域10、城市到岗意向10';
  return callAIJson<JobAssistJdAnalysis>({
    config,
    maxTokens: 4096,
    messages: [
      { role: 'system', content: `${SAFETY_RULES}\n先检查${routeLabel(route)}硬门槛，再按权重评分：${weights}。硬门槛失败时 eligible=false 且 match_score=null，优势不能抵消硬门槛。coverage 是有证据评分项权重占比。` },
      {
        role: 'user',
        content: `简历原文：\n${resumeText}\n画像：${JSON.stringify(profile)}\n已确认事实：${JSON.stringify(confirmedFacts)}\n偏好：${JSON.stringify(preferences)}\nJD：\n${jdText}\n\n返回结构：
{"eligible":true,"hard_requirements":[{"requirement":"门槛","passed":true,"evidence":"证据或待确认"}],"match_score":78,"match_level":"中匹配","score_breakdown":{"技能":20},"coverage":75,"confidence":"medium","evidence":["证据"],"presentation_gaps":["表达缺口"],"information_gaps":["信息缺口"],"capability_gaps":["能力缺口"],"next_steps":["下一步，最多3条"],"summary":"总结","jd_requirements":["要求"],"skill_keywords":["关键词"]}`,
      },
    ],
  });
}

export function tailorResumeForJd({
  config,
  resumeText,
  confirmedFacts,
  jdText,
  analysis,
}: {
  config: ActiveConfig;
  resumeText: string;
  confirmedFacts: string[];
  jdText: string;
  analysis: JobAssistJdAnalysis;
}) {
  return callAIJson<TailoringResult>({
    config,
    maxTokens: 6144,
    messages: [
      { role: 'system', content: `${SAFETY_RULES}\n只改排序和表达；不得把信息缺口、能力缺口写进草稿。没有真实数字就描述规模、状态或交付对象，不能生成看似合理的数字。` },
      {
        role: 'user',
        content: `简历原文：\n${resumeText}\n已确认事实：${JSON.stringify(confirmedFacts)}\nJD：\n${jdText}\n匹配分析：${JSON.stringify(analysis)}\n\n返回结构：{"suggestions":["修改建议"],"revised_draft":"可直接继续编辑的完整文字草稿","questions_to_confirm":["仍需确认的问题"]}`,
      },
    ],
  });
}

export function createInterviewPlan({
  config,
  route,
  resumeText,
  confirmedFacts,
  jdText,
  count = 3,
}: {
  config: ActiveConfig;
  route: JobAssistRoute;
  resumeText: string;
  confirmedFacts: string[];
  jdText: string;
  count?: number;
}) {
  return callAIJson<MockInterviewQuestion[]>({
    config,
    maxTokens: 2048,
    messages: [
      { role: 'system', content: `${SAFETY_RULES}\n为${routeLabel(route)}生成 ${count} 道文字模拟面试题，只返回 JSON 数组。覆盖自我介绍/简历深挖/JD核心能力；每次由界面只展示一题。` },
      { role: 'user', content: `简历：\n${resumeText}\n已确认事实：${JSON.stringify(confirmedFacts)}\nJD：\n${jdText}\n返回：[ {"type":"题型","question":"问题","focus":"考察重点"} ]` },
    ],
  });
}

export function scoreInterviewAnswer({
  config,
  question,
  answer,
  resumeText,
  confirmedFacts,
  jdText,
}: {
  config: ActiveConfig;
  question: MockInterviewQuestion;
  answer: string;
  resumeText: string;
  confirmedFacts: string[];
  jdText: string;
}) {
  return callAIJson<InterviewFeedback>({
    config,
    maxTokens: 3072,
    messages: [
      { role: 'system', content: `${SAFETY_RULES}\n按回答相关性25、事实证据25、表达结构20、岗位契合20、简洁清晰10评分。润色示例只改善表达，不改变事实；缺数字要明确提示补充。` },
      {
        role: 'user',
        content: `问题：${JSON.stringify(question)}\n用户本轮回答（仅用于本次点评，不会保存）：\n${answer}\n简历：\n${resumeText}\n已确认事实：${JSON.stringify(confirmedFacts)}\nJD：\n${jdText}\n返回结构：{"scores":{"relevance":20,"evidence":18,"structure":16,"role_fit":15,"clarity":8},"total_score":77,"effective_point":"有效内容","main_issue":"最大问题与影响","recommended_structure":"STAR/PREP等","improved_example":"不虚构事实的润色示例","issue_tags":["标签"],"improvement_summary":"不含逐字回答的简短摘要"}`,
      },
    ],
  });
}

