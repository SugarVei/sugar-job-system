import { creamCard, muted } from './styles';
export function PrivacyNotice() { return <section style={creamCard}><strong>隐私与安全边界</strong><ul style={{ ...muted, paddingLeft: 20, marginBottom: 0 }}><li>敏感字段默认不上传云端，也不发送给 AI。</li><li>填写记录只保存统计、适配器和错误码，不保存答案明文。</li><li>设备可随时从此页面撤销；不会自动点击提交、上传附件或处理验证码。</li></ul></section>; }
