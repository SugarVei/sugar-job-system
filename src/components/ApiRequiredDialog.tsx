import Modal from './Modal';

interface Props {
  open: boolean;
  featureName: string;
  onClose: () => void;
  onOpenSettings: () => void;
}

export default function ApiRequiredDialog({ open, featureName, onClose, onOpenSettings }: Props) {
  return (
    <Modal
      open={open}
      title="使用 AI 功能前需要配置 API"
      onClose={onClose}
      maxWidth={500}
      footer={(
        <>
          <button type="button" onClick={onClose} style={secondaryButton}>暂不配置</button>
          <button type="button" onClick={onOpenSettings} style={primaryButton}>前往 AI 设置</button>
        </>
      )}
    >
      <div style={{ display: 'grid', gap: 14, color: '#5f5a51', fontSize: 14, lineHeight: 1.75 }}>
        <div style={{ padding: '13px 15px', borderRadius: 14, background: '#fff7df', border: '1px solid #efd59a', color: '#76551b' }}>
          你刚才选择的“{featureName}”需要调用第三方 AI 服务，但当前账号还没有配置可用的 API Key。
        </div>
        <p style={{ margin: 0 }}>
          请打开左下角的“AI 设置”，选择服务商，按照页面教程在服务商官方平台购买 API 额度并创建 API Key，然后回到 Sugar 保存配置。
        </p>
        <p style={{ margin: 0, color: '#817a6e' }}>
          API 费用由第三方服务商直接收取，项目作者不参与 API 额度销售，也不会从中获得任何收益。你可以按自己的需要选择服务商和充值金额。
        </p>
      </div>
    </Modal>
  );
}

const primaryButton: React.CSSProperties = {
  height: 40,
  padding: '0 18px',
  border: 'none',
  borderRadius: 12,
  background: '#1b1a17',
  color: '#fffdf8',
  fontSize: 13.5,
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  border: '1px solid #ded6c9',
  background: '#fffdf8',
  color: '#655f55',
};
