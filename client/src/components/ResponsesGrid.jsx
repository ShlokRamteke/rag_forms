import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Lock, Globe, X } from 'lucide-react';

/**
 * ResponsesGrid
 *
 * A high-performance, virtualised responses table that does NOT depend on
 * @tanstack/react-table (avoiding the fragile v9 API surface).
 *
 * Props:
 *   fields        – array of form field definitions (with key, label, type)
 *   responses     – array of { responseId, mode, data, submittedAt }
 *   total         – total count from server
 *   page          – current server page (1-indexed)
 *   totalPages    – total number of server pages
 *   onPageChange  – (newPage: number) => void
 *   loading       – boolean
 *   formId        – string (for share link)
 */
export default function ResponsesGrid({
    fields,
    responses,
    total,
    page,
    totalPages,
    onPageChange,
    loading,
    formId,
}) {
    const [globalFilter, setGlobalFilter] = useState('');
    const [sortKey, setSortKey] = useState(null);   // column id string | null
    const [sortDir, setSortDir] = useState('asc');  // 'asc' | 'desc'

    const tableContainerRef = useRef(null);

    // ── Column definitions ──────────────────────────────────────────────────
    const dataFields = useMemo(
        () => fields.filter(f => f.type !== 'section'),
        [fields]
    );

    const columns = useMemo(() => {
        const meta = [
            {
                id: 'index',
                header: '#',
                size: 52,
                sortable: false,
                getValue: (_row, idx) => (page - 1) * 200 + idx + 1,
                render: (val) => <span className="text-[11px] text-[#737373]">{val}</span>,
            },
            {
                id: 'submittedAt',
                header: 'Submitted',
                size: 148,
                sortable: true,
                getValue: (row) => row.submittedAt,
                render: (val) => {
                    if (!val) return '—';
                    return new Date(val).toLocaleString('en-IN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                    });
                },
            },
            {
                id: 'mode',
                header: 'Mode',
                size: 80,
                sortable: false,
                getValue: (row) => row.mode,
                render: (val) => (
                    <span className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.8px] ${val === 'encrypted' ? 'text-[#4a4a4a]' : 'text-[#737373]'}`}>
                        {val === 'encrypted'
                            ? <><Lock className="h-2.5 w-2.5" />Enc</>
                            : <><Globe className="h-2.5 w-2.5" />Plain</>}
                    </span>
                ),
            },
        ];

        const fieldCols = dataFields.map(field => ({
            id: field.key,
            header: field.label || field.key,
            size: field.type === 'textarea' ? 260 : field.type === 'email' ? 200 : 160,
            sortable: true,
            getValue: (row) => {
                const val = row.data?.[field.key];
                if (val === null || val === undefined) return '';
                if (typeof val === 'boolean') return val ? 'Yes' : 'No';
                return String(val);
            },
            render: (val) => {
                if (!val) return <span className="text-[#c0c0c0]">—</span>;
                return (
                    <span className="block max-w-full truncate text-[13px]" title={val}>
                        {val}
                    </span>
                );
            },
        }));

        return [...meta, ...fieldCols];
    }, [dataFields, page]);

    // ── Filter & sort ────────────────────────────────────────────────────────
    const processedRows = useMemo(() => {
        let rows = responses.map((row, idx) => ({ row, idx }));

        // Global filter — search stringified values of all field columns
        if (globalFilter.trim()) {
            const q = globalFilter.trim().toLowerCase();
            rows = rows.filter(({ row }) => {
                return dataFields.some(field => {
                    const v = row.data?.[field.key];
                    return v !== null && v !== undefined && String(v).toLowerCase().includes(q);
                }) || (row.submittedAt && String(row.submittedAt).toLowerCase().includes(q));
            });
        }

        // Sort
        if (sortKey) {
            const col = columns.find(c => c.id === sortKey);
            if (col && col.sortable) {
                rows = [...rows].sort((a, b) => {
                    const av = col.getValue(a.row, a.idx) ?? '';
                    const bv = col.getValue(b.row, b.idx) ?? '';
                    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
                    return sortDir === 'asc' ? cmp : -cmp;
                });
            }
        }

        return rows;
    }, [responses, globalFilter, sortKey, sortDir, columns, dataFields]);

    const filteredCount = processedRows.length;

    // ── Virtualiser ──────────────────────────────────────────────────────────
    const rowVirtualizer = useVirtualizer({
        count: filteredCount,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 44,
        overscan: 10,
    });

    const virtualRows = rowVirtualizer.getVirtualItems();
    const totalRowSize = rowVirtualizer.getTotalSize();
    const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
    const paddingBottom = virtualRows.length > 0
        ? totalRowSize - (virtualRows[virtualRows.length - 1].end ?? 0)
        : 0;

    // ── Sort toggle ─────────────────────────────────────────────────────────
    function handleSort(colId) {
        if (sortKey === colId) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(colId);
            setSortDir('asc');
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div>
                    <div className="font-crimson text-[24px] italic leading-none">Submissions</div>
                    <div className="mt-1 text-[9px] uppercase tracking-[1px] text-[#4a4a4a]">
                        {total} total
                        {globalFilter ? ` · ${filteredCount} matching "${globalFilter}"` : ''}
                        {` · page ${page} of ${Math.max(1, totalPages)}`}
                    </div>
                </div>

                {/* Global search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#737373]" />
                    <input
                        type="text"
                        value={globalFilter}
                        onChange={e => setGlobalFilter(e.target.value)}
                        placeholder="Filter this page..."
                        className="h-9 w-60 border border-[#1a1a1a] bg-transparent pl-9 pr-9 text-[12px] outline-none placeholder:text-[#aaa]"
                    />
                    {globalFilter && (
                        <button
                            type="button"
                            onClick={() => setGlobalFilter('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#1a1a1a]"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex-1 flex items-center justify-center text-[11px] uppercase tracking-[2px] text-[#4a4a4a] animate-pulse">
                    Loading responses...
                </div>
            )}

            {/* Empty state */}
            {!loading && responses.length === 0 && (
                <div className="flex-1 border border-[#1a1a1a] bg-white flex flex-col items-center justify-center py-20 text-center">
                    <div className="font-crimson text-[24px] italic">No submissions yet</div>
                    <p className="mt-3 text-[11px] uppercase tracking-[1px] text-[#4a4a4a]">
                        Share the form link to start collecting responses.
                    </p>
                    <code className="mt-4 border border-[#1a1a1a]/20 bg-[#f5f5f0] px-4 py-2 text-[11px] break-all">
                        {window.location.origin}/share/{formId}
                    </code>
                </div>
            )}

            {!loading && responses.length > 0 && (
                <>
                    {/* Virtualised table */}
                    <div
                        ref={tableContainerRef}
                        className="flex-1 min-h-0 overflow-auto border border-[#1a1a1a] bg-white"
                        style={{ contain: 'strict' }}
                    >
                        <table
                            className="border-collapse"
                            style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}
                        >
                            <colgroup>
                                {columns.map(col => (
                                    <col key={col.id} style={{ width: col.size }} />
                                ))}
                            </colgroup>

                            {/* Sticky header */}
                            <thead className="sticky top-0 z-10 bg-[#f5f5f0]">
                                <tr className="border-b border-[#1a1a1a]">
                                    {columns.map(col => {
                                        const isSorted = sortKey === col.id;
                                        return (
                                            <th
                                                key={col.id}
                                                className={`px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-[1.5px] select-none whitespace-nowrap border-r border-[#1a1a1a]/10 last:border-r-0 ${col.sortable ? 'cursor-pointer hover:bg-[#1a1a1a]/5' : ''}`}
                                                style={{ width: col.size }}
                                                onClick={col.sortable ? () => handleSort(col.id) : undefined}
                                            >
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="truncate">{col.header}</span>
                                                    {col.sortable && (
                                                        isSorted && sortDir === 'asc'  ? <ArrowUp   className="h-3 w-3 shrink-0" /> :
                                                        isSorted && sortDir === 'desc' ? <ArrowDown  className="h-3 w-3 shrink-0" /> :
                                                                                        <ArrowUpDown className="h-3 w-3 shrink-0 opacity-30" />
                                                    )}
                                                </span>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>

                            <tbody>
                                {paddingTop > 0 && (
                                    <tr><td colSpan={columns.length} style={{ height: paddingTop }} /></tr>
                                )}

                                {virtualRows.map(vRow => {
                                    const { row, idx } = processedRows[vRow.index];
                                    return (
                                        <tr
                                            key={row.responseId ?? vRow.index}
                                            className="border-b border-[#1a1a1a]/10 hover:bg-[#f9f9f4] transition-colors"
                                            style={{ height: 44 }}
                                        >
                                            {columns.map(col => (
                                                <td
                                                    key={col.id}
                                                    className="px-4 py-2 border-r border-[#1a1a1a]/5 last:border-r-0 overflow-hidden"
                                                    style={{ maxWidth: col.size }}
                                                >
                                                    {col.render(col.getValue(row, idx), row)}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}

                                {paddingBottom > 0 && (
                                    <tr><td colSpan={columns.length} style={{ height: paddingBottom }} /></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Server-side pagination */}
                    {totalPages > 1 && (
                        <div className="mt-4 shrink-0 flex items-center justify-between text-[10px] uppercase tracking-[1px]">
                            <span className="text-[#4a4a4a]">
                                Showing {responses.length} of {total} total
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={page <= 1}
                                    onClick={() => onPageChange(page - 1)}
                                    className="border border-[#1a1a1a] px-4 py-2 disabled:opacity-30 hover:bg-[#1a1a1a]/5 transition-colors"
                                >
                                    ← Prev
                                </button>
                                <span className="px-3 text-[#4a4a4a]">{page} / {totalPages}</span>
                                <button
                                    type="button"
                                    disabled={page >= totalPages}
                                    onClick={() => onPageChange(page + 1)}
                                    className="border border-[#1a1a1a] px-4 py-2 disabled:opacity-30 hover:bg-[#1a1a1a]/5 transition-colors"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
