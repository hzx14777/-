/**
 * 统一数据表格（约束规范 §5.1 表格分页/排序/筛选基础行为、§10.2 分页规范）
 *
 * - 服务端分页：传 `page` / `pageSize` / `total` / `onPageChange`，统一「共 N 条」文案；
 * - 客户端分页：不传 total，默认每页 10 条、可切换页容量；
 * - 空态统一走 PageEmpty，不再逐页写 locale.emptyText。
 */
import React from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import PageEmpty from './PageEmpty';

export interface DataTableProps<T> extends TableProps<T> {
  /** 服务端分页参数（§10.2） */
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number, pageSize: number) => void;
  /** 空态说明与引导操作 */
  emptyText?: React.ReactNode;
  emptyAction?: React.ReactNode;
  /** 是否自动撑开行高，默认紧凑 */
  size?: 'small' | 'middle' | 'large';
}

export default function DataTable<T extends object = Record<string, unknown>>({
  page,
  pageSize,
  total,
  onPageChange,
  emptyText = '暂无数据',
  emptyAction,
  size = 'small',
  pagination,
  locale,
  ...rest
}: DataTableProps<T>) {
  const isServerPaged = typeof total === 'number' && typeof page === 'number' && !!onPageChange;

  const paginationConfig =
    pagination === false
      ? false
      : isServerPaged
        ? {
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t: number) => `共 ${t} 条`,
            onChange: onPageChange,
            ...(typeof pagination === 'object' ? pagination : {})
          }
        : {
            defaultPageSize: 10,
            showSizeChanger: true,
            showTotal: (t: number) => `共 ${t} 条`,
            ...(typeof pagination === 'object' ? pagination : {})
          };

  return (
    <Table<T>
      size={size}
      rowKey="id"
      pagination={paginationConfig}
      locale={{ emptyText: <PageEmpty description={emptyText} action={emptyAction} />, ...locale }}
      {...rest}
    />
  );
}
