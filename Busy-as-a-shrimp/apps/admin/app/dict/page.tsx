"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { getAdminApi } from "@/api";
import type {
  CreateDictDataDto,
  DictData,
  DictType,
  UpsertDictDataDto,
  UpsertDictTypeDto
} from "@/api/admin-api";
import { getErrorMessage } from "@/utils/error-message";

import styles from "./page.module.css";

const DICT_TYPES_QUERY_KEY = ["admin", "dict", "types"] as const;
const DICT_DATA_QUERY_KEY = ["admin", "dict", "data"] as const;

type DictStatus = "normal" | "disabled";
type DialogMode = "create" | "edit" | null;

interface DictTypeFormValues {
  dictName: string;
  dictType: string;
  status: DictStatus;
  remark: string;
}

interface DictDataFormValues {
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  dictSort: string;
  status: DictStatus;
  remark: string;
}

const DICT_STATUS_OPTIONS: Array<{ value: DictStatus; label: string }> = [
  { value: "normal", label: "正常" },
  { value: "disabled", label: "停用" }
];

function DictTypeSkeleton() {
  return (
    <div className={styles.skeletonWrap} aria-hidden>
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className={styles.skeletonRow} />
      ))}
    </div>
  );
}

function DictDataSkeleton() {
  return (
    <div className={styles.skeletonWrap} aria-hidden>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className={styles.skeletonRow} />
      ))}
    </div>
  );
}

function buildDictTypeForm(data?: DictType): DictTypeFormValues {
  return {
    dictName: data?.dictName ?? "",
    dictType: data?.dictType ?? "",
    status: data?.status ?? "normal",
    remark: data?.remark ?? ""
  };
}

function buildDictDataForm(data?: DictData, nextSort = 1): DictDataFormValues {
  return {
    dictCode: data?.dictCode ?? "",
    dictLabel: data?.dictLabel ?? "",
    dictValue: data?.dictValue ?? "",
    dictSort: data ? String(data.dictSort) : String(nextSort),
    status: data?.status ?? "normal",
    remark: data?.remark ?? ""
  };
}

function parseDictSort(raw: string): number | null {
  const parsed = Number(raw.trim());
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

interface EditorDialogProps {
  title: string;
  submitLabel: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}

function EditorDialog({
  title,
  submitLabel,
  submitting,
  onClose,
  onSubmit,
  children
}: EditorDialogProps) {
  return (
    <div className={styles.dialogBackdrop} onClick={onClose}>
      <div
        className={styles.dialogCard}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.dialogHeader}>
          <h3 className={styles.dialogTitle}>{title}</h3>
          <button
            type="button"
            className={styles.dialogCloseBtn}
            onClick={onClose}
            aria-label="关闭弹层"
          >
            ×
          </button>
        </header>

        <form className={styles.dialogForm} onSubmit={onSubmit}>
          {children}
          <div className={styles.dialogActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onClose}
              disabled={submitting}
            >
              取消
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={submitting}>
              {submitting ? "提交中..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DictPage() {
  const queryClient = useQueryClient();
  const [activeDictType, setActiveDictType] = useState<string | null>(null);
  const [activeDictDataId, setActiveDictDataId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [dictTypeDialogMode, setDictTypeDialogMode] = useState<DialogMode>(null);
  const [dictDataDialogMode, setDictDataDialogMode] = useState<DialogMode>(null);
  const [dictTypeForm, setDictTypeForm] = useState<DictTypeFormValues>(buildDictTypeForm());
  const [dictDataForm, setDictDataForm] = useState<DictDataFormValues>(buildDictDataForm());

  const dictTypesQuery = useQuery({
    queryKey: DICT_TYPES_QUERY_KEY,
    queryFn: async (): Promise<DictType[]> => {
      return getAdminApi().dictTypes();
    }
  });

  const dictDataQuery = useQuery({
    queryKey: [...DICT_DATA_QUERY_KEY, activeDictType],
    queryFn: async (): Promise<DictData[]> => {
      return getAdminApi().dictData(activeDictType ?? "");
    },
    enabled: Boolean(activeDictType)
  });

  const createDictTypeMutation = useMutation({
    mutationFn: (payload: UpsertDictTypeDto) => getAdminApi().createDictType(payload),
    onSuccess: async (created) => {
      setNotice(`已新增字典类型：${created.dictName}`);
      setActiveDictType(created.dictType);
      setActiveDictDataId(null);
      setDictTypeDialogMode(null);
      await queryClient.invalidateQueries({ queryKey: DICT_TYPES_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: DICT_DATA_QUERY_KEY });
    },
    onError: (error) => {
      setNotice(`新增字典类型失败：${getErrorMessage(error)}`);
    }
  });

  const updateDictTypeMutation = useMutation({
    mutationFn: ({ dictId, payload }: { dictId: number; payload: UpsertDictTypeDto }) =>
      getAdminApi().updateDictType(dictId, payload),
    onSuccess: async (updated) => {
      setNotice(`已更新字典类型：${updated.dictName}`);
      setActiveDictType(updated.dictType);
      setDictTypeDialogMode(null);
      await queryClient.invalidateQueries({ queryKey: DICT_TYPES_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: DICT_DATA_QUERY_KEY });
    },
    onError: (error) => {
      setNotice(`修改字典类型失败：${getErrorMessage(error)}`);
    }
  });

  const deleteDictTypeMutation = useMutation({
    mutationFn: (dictId: number) => getAdminApi().deleteDictType(dictId),
    onSuccess: async (result) => {
      setNotice(`已删除字典类型 #${result.dictId}`);
      setActiveDictType(null);
      setActiveDictDataId(null);
      await queryClient.invalidateQueries({ queryKey: DICT_TYPES_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: DICT_DATA_QUERY_KEY });
    },
    onError: (error) => {
      setNotice(`删除字典类型失败：${getErrorMessage(error)}`);
    }
  });

  const createDictDataMutation = useMutation({
    mutationFn: (payload: CreateDictDataDto) => getAdminApi().createDictData(payload),
    onSuccess: async (created) => {
      setNotice(`已新增字典项：${created.dictLabel}`);
      setActiveDictDataId(created.dictDataId);
      setDictDataDialogMode(null);
      await queryClient.invalidateQueries({ queryKey: [...DICT_DATA_QUERY_KEY, activeDictType] });
    },
    onError: (error) => {
      setNotice(`新增字典项失败：${getErrorMessage(error)}`);
    }
  });

  const updateDictDataMutation = useMutation({
    mutationFn: ({ dictDataId, payload }: { dictDataId: number; payload: UpsertDictDataDto }) =>
      getAdminApi().updateDictData(dictDataId, payload),
    onSuccess: async (updated) => {
      setNotice(`已更新字典项：${updated.dictLabel}`);
      setActiveDictDataId(updated.dictDataId);
      setDictDataDialogMode(null);
      await queryClient.invalidateQueries({ queryKey: [...DICT_DATA_QUERY_KEY, activeDictType] });
    },
    onError: (error) => {
      setNotice(`修改字典项失败：${getErrorMessage(error)}`);
    }
  });

  const deleteDictDataMutation = useMutation({
    mutationFn: (dictDataId: number) => getAdminApi().deleteDictData(dictDataId),
    onSuccess: async (result) => {
      setNotice(`已删除字典项 #${result.dictDataId}`);
      setActiveDictDataId(null);
      await queryClient.invalidateQueries({ queryKey: [...DICT_DATA_QUERY_KEY, activeDictType] });
    },
    onError: (error) => {
      setNotice(`删除字典项失败：${getErrorMessage(error)}`);
    }
  });

  useEffect(() => {
    if (!activeDictType && (dictTypesQuery.data?.length ?? 0) > 0) {
      setActiveDictType(dictTypesQuery.data?.[0]?.dictType ?? null);
      return;
    }

    if (
      activeDictType &&
      dictTypesQuery.data &&
      dictTypesQuery.data.every((item) => item.dictType !== activeDictType)
    ) {
      setActiveDictType(dictTypesQuery.data[0]?.dictType ?? null);
    }
  }, [activeDictType, dictTypesQuery.data]);

  useEffect(() => {
    setActiveDictDataId(null);
  }, [activeDictType]);

  useEffect(() => {
    if (!activeDictDataId) {
      return;
    }
    const exists = dictDataQuery.data?.some((item) => item.dictDataId === activeDictDataId);
    if (!exists) {
      setActiveDictDataId(null);
    }
  }, [activeDictDataId, dictDataQuery.data]);

  const activeTypeMeta = useMemo(
    () => dictTypesQuery.data?.find((item) => item.dictType === activeDictType),
    [activeDictType, dictTypesQuery.data]
  );

  const activeDictData = useMemo(
    () => dictDataQuery.data?.find((item) => item.dictDataId === activeDictDataId),
    [activeDictDataId, dictDataQuery.data]
  );

  const nextSort = useMemo(() => {
    if (!dictDataQuery.data || dictDataQuery.data.length === 0) {
      return 1;
    }
    return Math.max(...dictDataQuery.data.map((item) => item.dictSort)) + 1;
  }, [dictDataQuery.data]);

  const isOperating =
    createDictTypeMutation.isPending ||
    updateDictTypeMutation.isPending ||
    deleteDictTypeMutation.isPending ||
    createDictDataMutation.isPending ||
    updateDictDataMutation.isPending ||
    deleteDictDataMutation.isPending;

  function openCreateDictTypeDialog() {
    setDictTypeForm(buildDictTypeForm());
    setDictTypeDialogMode("create");
  }

  function openEditDictTypeDialog() {
    if (!activeTypeMeta) {
      setNotice("请先选择左侧要修改的字典类型。");
      return;
    }
    setDictTypeForm(buildDictTypeForm(activeTypeMeta));
    setDictTypeDialogMode("edit");
  }

  function handleDeleteDictType() {
    if (!activeTypeMeta) {
      setNotice("请先选择左侧要删除的字典类型。");
      return;
    }

    const confirmed = window.confirm(
      `确认删除字典类型「${activeTypeMeta.dictName}」吗？如果该类型下有字典项将无法删除。`
    );
    if (!confirmed) {
      return;
    }

    deleteDictTypeMutation.mutate(activeTypeMeta.dictId);
  }

  function submitDictType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const dictName = dictTypeForm.dictName.trim();
    const dictType = dictTypeForm.dictType.trim();

    if (!dictName || !dictType) {
      setNotice("dict_name / dict_type 不能为空。");
      return;
    }

    const payload: UpsertDictTypeDto = {
      dictName,
      dictType,
      status: dictTypeForm.status,
      remark: dictTypeForm.remark.trim() ? dictTypeForm.remark.trim() : undefined
    };

    if (dictTypeDialogMode === "create") {
      createDictTypeMutation.mutate(payload);
      return;
    }

    if (dictTypeDialogMode === "edit" && activeTypeMeta) {
      updateDictTypeMutation.mutate({ dictId: activeTypeMeta.dictId, payload });
    }
  }

  function openCreateDictDataDialog() {
    if (!activeDictType) {
      setNotice("请先在左侧选择字典类型。");
      return;
    }

    setDictDataForm(buildDictDataForm(undefined, nextSort));
    setDictDataDialogMode("create");
  }

  function openEditDictDataDialog() {
    if (!activeDictData) {
      setNotice("请先选择右侧要修改的字典项。");
      return;
    }

    setDictDataForm(buildDictDataForm(activeDictData));
    setDictDataDialogMode("edit");
  }

  function handleDeleteDictData() {
    if (!activeDictData) {
      setNotice("请先选择右侧要删除的字典项。");
      return;
    }

    const confirmed = window.confirm(`确认删除字典项「${activeDictData.dictLabel}」吗？`);
    if (!confirmed) {
      return;
    }

    deleteDictDataMutation.mutate(activeDictData.dictDataId);
  }

  function submitDictData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeDictType) {
      setNotice("请先在左侧选择字典类型。");
      return;
    }

    const dictCode = dictDataForm.dictCode.trim();
    const dictLabel = dictDataForm.dictLabel.trim();
    const dictValue = dictDataForm.dictValue.trim();
    const dictSort = parseDictSort(dictDataForm.dictSort);

    if (!dictCode || !dictLabel || !dictValue) {
      setNotice("dict_code / dict_label / dict_value 不能为空。");
      return;
    }

    if (dictSort === null) {
      setNotice("dict_sort 必须是整数。");
      return;
    }

    const payload: UpsertDictDataDto = {
      dictCode,
      dictLabel,
      dictValue,
      dictSort,
      status: dictDataForm.status,
      remark: dictDataForm.remark.trim() ? dictDataForm.remark.trim() : undefined
    };

    if (dictDataDialogMode === "create") {
      createDictDataMutation.mutate({
        dictType: activeDictType,
        ...payload
      });
      return;
    }

    if (dictDataDialogMode === "edit" && activeDictData) {
      updateDictDataMutation.mutate({
        dictDataId: activeDictData.dictDataId,
        payload
      });
    }
  }

  return (
    <main className={styles.page}>
      <section className={`${styles.panel} ${styles.leftPanel}`}>
        <header className={styles.panelHeader}>
          <div>
            <h1 className={styles.panelTitle}>字典类型</h1>
            <p className={styles.panelSubtitle}>DICT TYPE INDEX</p>
          </div>

          <div className={styles.actionGroup}>
            <button
              type="button"
              className={styles.ghostBtn}
              disabled={isOperating}
              onClick={openCreateDictTypeDialog}
            >
              新增
            </button>
            <button
              type="button"
              className={styles.ghostBtn}
              disabled={!activeTypeMeta || isOperating}
              onClick={openEditDictTypeDialog}
            >
              修改
            </button>
            <button
              type="button"
              className={styles.ghostBtn}
              disabled={!activeTypeMeta || isOperating}
              onClick={handleDeleteDictType}
            >
              删除
            </button>
          </div>
        </header>

        {dictTypesQuery.isLoading ? <DictTypeSkeleton /> : null}
        {!dictTypesQuery.isLoading && dictTypesQuery.isError ? (
          <p className={styles.errorText}>
            加载字典类型失败：{getErrorMessage(dictTypesQuery.error)}
          </p>
        ) : null}

        {!dictTypesQuery.isLoading &&
        !dictTypesQuery.isError &&
        (dictTypesQuery.data?.length ?? 0) === 0 ? (
          <p className={styles.emptyText}>暂无可用字典类型。</p>
        ) : null}

        {!dictTypesQuery.isLoading &&
        !dictTypesQuery.isError &&
        (dictTypesQuery.data?.length ?? 0) > 0 ? (
          <ul className={styles.typeList}>
            {dictTypesQuery.data?.map((item) => {
              const isActive = item.dictType === activeDictType;
              const statusText = item.status === "normal" ? "NORMAL" : "DISABLED";
              return (
                <li key={item.dictId}>
                  <button
                    type="button"
                    className={`${styles.typeItem} ${isActive ? styles.typeItemActive : ""}`}
                    onClick={() => setActiveDictType(item.dictType)}
                  >
                    <span>
                      <span className={styles.typeName}>{item.dictName}</span>
                      <span className={styles.typeCode}>{item.dictType}</span>
                    </span>
                    <span
                      className={`${styles.typeStatus} ${item.status === "normal" ? styles.typeStatusEnabled : ""}`}
                    >
                      {statusText}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className={styles.neonEdge} />
      </section>

      <section className={`${styles.panel} ${styles.rightPanel}`}>
        <header className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>数据矩阵</h2>
            <p className={styles.panelSubtitle}>
              {activeTypeMeta
                ? `${activeTypeMeta.dictName} / ${activeTypeMeta.dictType}`
                : "DICT DATA MATRIX"}
            </p>
          </div>

          <div className={styles.actionGroup}>
            <button
              type="button"
              className={styles.ghostBtn}
              disabled={!activeDictType || isOperating}
              onClick={openCreateDictDataDialog}
            >
              新增
            </button>
            <button
              type="button"
              className={styles.ghostBtn}
              disabled={!activeDictData || isOperating}
              onClick={openEditDictDataDialog}
            >
              修改
            </button>
            <button
              type="button"
              className={styles.ghostBtn}
              disabled={!activeDictData || isOperating}
              onClick={handleDeleteDictData}
            >
              删除
            </button>
          </div>
        </header>

        <div className={styles.rightBody}>
          {notice ? <p className={styles.noticeText}>{notice}</p> : null}

          {!activeDictType ? (
            <p className={styles.awaiting}>SYSTEM AWAITING: 请在左侧节点选择字典类型</p>
          ) : null}

          {activeDictType && dictDataQuery.isLoading ? <DictDataSkeleton /> : null}
          {activeDictType && !dictDataQuery.isLoading && dictDataQuery.isError ? (
            <p className={styles.errorText}>
              加载字典数据失败：{getErrorMessage(dictDataQuery.error)}
            </p>
          ) : null}

          {activeDictType &&
          !dictDataQuery.isLoading &&
          !dictDataQuery.isError &&
          (dictDataQuery.data?.length ?? 0) === 0 ? (
            <p className={styles.emptyText}>当前字典类型暂无数据项。</p>
          ) : null}

          {activeDictType &&
          !dictDataQuery.isLoading &&
          !dictDataQuery.isError &&
          (dictDataQuery.data?.length ?? 0) > 0 ? (
            <div className={styles.dataList}>
              {dictDataQuery.data?.map((item) => {
                const isNormal = item.status === "normal";
                const isActive = item.dictDataId === activeDictDataId;
                return (
                  <button
                    type="button"
                    key={item.dictDataId}
                    className={`${styles.dataCardButton} ${isActive ? styles.dataCardSelected : ""}`}
                    onClick={() => setActiveDictDataId(item.dictDataId)}
                  >
                    <article className={styles.dataCard}>
                      <div className={styles.dataPrimary}>
                        <p className={styles.dataLabel}>{item.dictLabel}</p>
                        <p className={styles.dataCode}>{item.dictCode}</p>
                        {item.remark ? <p className={styles.dataRemark}>{item.remark}</p> : null}
                      </div>
                      <div>
                        <div className={styles.kvLabel}>DICT_VALUE</div>
                        <div className={styles.kvValue}>{item.dictValue}</div>
                      </div>
                      <div>
                        <div className={styles.kvLabel}>SORT</div>
                        <div className={styles.kvValue}>{item.dictSort}</div>
                      </div>
                      <span
                        className={`${styles.statusBadge} ${isNormal ? styles.statusNormal : styles.statusDisabled}`}
                      >
                        {isNormal ? "NORMAL" : "DISABLED"}
                      </span>
                    </article>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className={styles.neonEdge} />
      </section>

      {dictTypeDialogMode ? (
        <EditorDialog
          title={dictTypeDialogMode === "create" ? "新增字典类型" : "修改字典类型"}
          submitLabel={dictTypeDialogMode === "create" ? "创建" : "保存"}
          submitting={createDictTypeMutation.isPending || updateDictTypeMutation.isPending}
          onClose={() => setDictTypeDialogMode(null)}
          onSubmit={submitDictType}
        >
          <div className={styles.formGrid}>
            <label className={styles.formField}>
              <span>类型名称（dict_name）</span>
              <input
                value={dictTypeForm.dictName}
                onChange={(event) =>
                  setDictTypeForm((prev) => ({
                    ...prev,
                    dictName: event.target.value
                  }))
                }
                placeholder="例如：用户状态"
                maxLength={100}
              />
            </label>
            <label className={styles.formField}>
              <span>类型编码（dict_type）</span>
              <input
                value={dictTypeForm.dictType}
                onChange={(event) =>
                  setDictTypeForm((prev) => ({
                    ...prev,
                    dictType: event.target.value
                  }))
                }
                placeholder="例如：user_status"
                maxLength={64}
              />
            </label>
            <label className={styles.formField}>
              <span>状态（status）</span>
              <select
                value={dictTypeForm.status}
                onChange={(event) =>
                  setDictTypeForm((prev) => ({
                    ...prev,
                    status: event.target.value as DictStatus
                  }))
                }
              >
                {DICT_STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${styles.formField} ${styles.formFieldFull}`}>
              <span>备注（remark）</span>
              <textarea
                value={dictTypeForm.remark}
                onChange={(event) =>
                  setDictTypeForm((prev) => ({
                    ...prev,
                    remark: event.target.value
                  }))
                }
                placeholder="可选"
                maxLength={255}
                rows={3}
              />
            </label>
          </div>
        </EditorDialog>
      ) : null}

      {dictDataDialogMode ? (
        <EditorDialog
          title={dictDataDialogMode === "create" ? "新增字典项" : "修改字典项"}
          submitLabel={dictDataDialogMode === "create" ? "创建" : "保存"}
          submitting={createDictDataMutation.isPending || updateDictDataMutation.isPending}
          onClose={() => setDictDataDialogMode(null)}
          onSubmit={submitDictData}
        >
          <div className={styles.formGrid}>
            <label className={styles.formField}>
              <span>所属类型（dict_type）</span>
              <input value={activeDictType ?? ""} readOnly />
            </label>
            <label className={styles.formField}>
              <span>显示名称（dict_label）</span>
              <input
                value={dictDataForm.dictLabel}
                onChange={(event) =>
                  setDictDataForm((prev) => ({
                    ...prev,
                    dictLabel: event.target.value
                  }))
                }
                maxLength={100}
              />
            </label>
            <label className={styles.formField}>
              <span>编码（dict_code）</span>
              <input
                value={dictDataForm.dictCode}
                onChange={(event) =>
                  setDictDataForm((prev) => ({
                    ...prev,
                    dictCode: event.target.value
                  }))
                }
                maxLength={64}
              />
            </label>
            <label className={styles.formField}>
              <span>键值（dict_value）</span>
              <input
                value={dictDataForm.dictValue}
                onChange={(event) =>
                  setDictDataForm((prev) => ({
                    ...prev,
                    dictValue: event.target.value
                  }))
                }
                maxLength={100}
              />
            </label>
            <label className={styles.formField}>
              <span>排序（dict_sort）</span>
              <input
                value={dictDataForm.dictSort}
                onChange={(event) =>
                  setDictDataForm((prev) => ({
                    ...prev,
                    dictSort: event.target.value
                  }))
                }
                inputMode="numeric"
              />
            </label>
            <label className={styles.formField}>
              <span>状态（status）</span>
              <select
                value={dictDataForm.status}
                onChange={(event) =>
                  setDictDataForm((prev) => ({
                    ...prev,
                    status: event.target.value as DictStatus
                  }))
                }
              >
                {DICT_STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${styles.formField} ${styles.formFieldFull}`}>
              <span>备注（remark）</span>
              <textarea
                value={dictDataForm.remark}
                onChange={(event) =>
                  setDictDataForm((prev) => ({
                    ...prev,
                    remark: event.target.value
                  }))
                }
                placeholder="可选"
                maxLength={255}
                rows={3}
              />
            </label>
          </div>
        </EditorDialog>
      ) : null}
    </main>
  );
}
