import { Sparkles } from "lucide-react";
import PortalDropdown from "@/components/common/PortalDropdown";

/** Agent 可选模型（与后端 _ALLOWED_AGENT_MODELS 白名单一致） */
export const AGENT_MODELS = [
  // 2026-07-16 收敛:只保留 DeepSeek(qwen/claude 暂下线)。只剩一个模型时
  // 选择器组件自动隐藏(见下方 length<=1 分支),顶栏不再显示模型下拉。
  // 2026-09-16 阿里云百炼欠费,改走 DeepSeek 官方,型号名随之变更。
  { value: "deepseek-flash", label: "DeepSeek Flash", hint: "快速 · 高性价比 · 默认推荐" },
];

export const DEFAULT_AGENT_MODEL = "deepseek-flash";

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

/** 对话页模型选择器（参考 Manus 顶部模型下拉），复用 PortalDropdown */
export default function ModelSelector({ value, onChange }: ModelSelectorProps) {
  // 只有一个模型时不显示选择器
  if (AGENT_MODELS.length <= 1) return null;

  return (
    <div className="w-[13rem] shrink-0">
      <PortalDropdown
        value={value}
        options={AGENT_MODELS}
        placeholder="选择模型"
        onSelect={(v) => v && onChange(v)}
        selectedIcon={<Sparkles className="size-4 shrink-0 text-chat-accent dark:text-amber-400" />}
        dropdownClassName="min-w-[16rem]"
        triggerClassName="h-8 px-2.5"
        triggerLabelClassName="text-[15px]"
      />
    </div>
  );
}
