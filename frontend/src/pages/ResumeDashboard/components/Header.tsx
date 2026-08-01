import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import UserMenu from "@/components/UserMenu";
import { Plus, Upload, Trash2, Sparkles, Download } from "./Icons";
import { Palette } from "lucide-react";
import SkinPickerModal from "@/pages/Workspace/v2/components/SkinPickerModal";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onImport: () => void;
  onCreate: () => void;
  /** AI 智能导入回调 */
  onAIImport?: () => void;
  /** 选中的简历数量（用于批量删除） */
  selectedCount?: number;
  /** 批量删除回调 */
  onBatchDelete?: () => void;
  /** 批量下载选中简历回调（全选时即下载全部） */
  onBatchDownload?: () => void;
  /** 批量下载进度文案（非空表示下载中） */
  downloadProgress?: string | null;
  /** 简历总数 */
  totalCount?: number;
  /** 是否处于多选模式 */
  isMultiSelectMode?: boolean;
  /** 切换多选模式 */
  onToggleMultiSelectMode?: () => void;
  /** 退出多选模式 */
  onExitMultiSelectMode?: () => void;
  /** 全选当前列表 */
  onSelectAll?: () => void;
  /** 取消全选 */
  onClearSelection?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onImport,
  onCreate,
  onAIImport,
  selectedCount = 0,
  onBatchDelete,
  onBatchDownload,
  downloadProgress = null,
  totalCount = 0,
  isMultiSelectMode = false,
  onToggleMultiSelectMode,
  onExitMultiSelectMode,
  onSelectAll,
  onClearSelection,
}) => {
  const allSelected = totalCount > 0 && selectedCount === totalCount;

  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [skinPickerOpen, setSkinPickerOpen] = useState(false);
  const importMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        importMenuRef.current &&
        !importMenuRef.current.contains(event.target as Node)
      ) {
        setImportMenuOpen(false);
      }
    };
    if (importMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [importMenuOpen]);

  return (
    <div className="border-b border-black fresh:border-slate-200 px-0 pb-6 shrink-0 bg-[#F6F3EC] fresh:bg-white dark:bg-[#1C1C1C] relative z-30 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      {/* 左侧标题区：复刻自 /builder/dashboard */}
      <div>
        <h1 className="font-serifcn fresh:font-hero text-3xl md:text-4xl font-black fresh:font-bold text-slate-800 dark:text-white tracking-tight leading-none">
          我的简历
        </h1>
        <p className="mt-2 text-sm font-mono fresh:font-sans text-[#3367D6] fresh:text-slate-500 tracking-normal max-w-md font-medium">
          共 {totalCount} 份简历，选择一份继续编辑
        </p>
      </div>

      {/* 右侧操作区：原 Header 的全部交互按钮（多选/导入/新建/账户）保留 */}
      <div className="flex items-center flex-wrap gap-3 lg:justify-end">
        {/* 多选模式按钮 */}
        {totalCount > 0 && onToggleMultiSelectMode && (
          <Button
            onClick={onToggleMultiSelectMode}
            variant={isMultiSelectMode ? "default" : "outline"}
            className={`h-11 px-5 ${
              isMultiSelectMode
                ? "bg-black text-white hover:bg-black"
                : ""
            }`}
          >
            {isMultiSelectMode ? "退出多选" : "多选"}
          </Button>
        )}

        {/* 多选模式下：全选 / 取消全选 */}
        {isMultiSelectMode &&
          totalCount > 0 &&
          onSelectAll &&
          onClearSelection && (
            <Button
              onClick={allSelected ? onClearSelection : onSelectAll}
              variant="outline"
              className="h-11 px-5"
            >
              {allSelected ? "取消全选" : "全选"}
            </Button>
          )}

        {/* 批量下载（多选模式，选中后出现；全选时即「下载全部」） */}
        {selectedCount > 0 && onBatchDownload && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Button
              onClick={onBatchDownload}
              disabled={Boolean(downloadProgress)}
              variant="outline"
              className="h-11 px-5"
            >
              <Download className="mr-2 h-4 w-4" />
              {downloadProgress || (allSelected ? "下载全部" : "下载")}
            </Button>
          </motion.div>
        )}

        {/* 批量删除 */}
        {selectedCount > 0 && onBatchDelete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Button
              onClick={onBatchDelete}
              variant="destructive"
              className="h-11 px-5"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </Button>
          </motion.div>
        )}


        <div className="h-8 w-px bg-black fresh:bg-slate-200 mx-1 hidden sm:block" />

        <Button
          type="button"
          onClick={() => setSkinPickerOpen(true)}
          variant="outline"
          title="切换界面皮肤（NEO / 清新）"
          aria-label="界面皮肤"
          className="h-11 px-5"
        >
          <Palette className="mr-2 h-4 w-4 text-[#4285F4]" />
          界面皮肤
        </Button>

        <SkinPickerModal
          open={skinPickerOpen}
          onPicked={() => setSkinPickerOpen(false)}
          onClose={() => setSkinPickerOpen(false)}
        />

        {/* 统一导入下拉：AI 智能上传 / JSON 导入 */}
        {(onAIImport || onImport) && (
          <div className="relative" ref={importMenuRef}>
            <button
              onClick={() => setImportMenuOpen((v) => !v)}
              className={cn(
                "px-5 py-2.5 rounded-none fresh:rounded-md text-sm font-mono fresh:font-sans uppercase fresh:normal-case tracking-wide fresh:tracking-normal transition-[transform,box-shadow,background-color] duration-150 ease-out flex items-center gap-2 h-11",
                "bg-[#F0F0E8] fresh:bg-slate-50 border border-black fresh:border-slate-200 text-black shadow-[2px_2px_0px_0px_#000000] fresh:shadow-sm",
                "hover:bg-[#E5E5E0] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-none",
                "active:translate-y-[2px] active:translate-x-[2px]"
              )}
            >
              <Upload className="w-4 h-4 text-[#4285F4]" />
              导入
            </button>

            {importMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#F0F0E8] fresh:bg-white rounded-none fresh:rounded-md shadow-[4px_4px_0px_0px_#000000] fresh:shadow-lg border border-black fresh:border-slate-200 overflow-hidden z-50">
                {onAIImport && (
                  <button
                    onClick={() => {
                      setImportMenuOpen(false);
                      onAIImport();
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-mono fresh:font-sans uppercase fresh:normal-case tracking-wide fresh:tracking-normal text-black hover:bg-[#E5E5E0] fresh:hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-black" />
                    AI 导入
                  </button>
                )}
                {onImport && (
                  <button
                    onClick={() => {
                      setImportMenuOpen(false);
                      onImport();
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-mono fresh:font-sans uppercase fresh:normal-case tracking-wide fresh:tracking-normal text-black hover:bg-[#E5E5E0] fresh:hover:bg-slate-50 flex items-center gap-2 border-t border-black fresh:border-slate-200"
                  >
                    <Upload className="w-4 h-4 text-[#4285F4]" />
                    JSON 导入
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 创建按钮 */}
        <Button
          onClick={onCreate}
          className="h-11 px-6"
        >
          <Plus className="mr-2 h-5 w-5 stroke-[3px]" />
          新建简历
        </Button>

        <div className="ml-2 pl-2 border-l border-black fresh:border-slate-200">
          <UserMenu />
        </div>
      </div>
    </div>
  );
};
