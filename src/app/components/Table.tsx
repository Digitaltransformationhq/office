import React, { createContext, useContext, useEffect, useState } from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}
interface CellProps extends TableProps {
  colSpan?: number;
  /** injected by TableRow so mobile cards can show a field label */
  __colIndex?: number;
}

const HeaderContext = createContext<{ headers: string[]; setHeaders: (h: string[]) => void }>({
  headers: [],
  setHeaders: () => {},
});

/**
 * On desktop this is a normal scrollable table. Under `md` the CSS in
 * index.css (`.responsive-table`) restyles each row as a stacked card, and
 * every cell shows its column label (captured automatically from the header).
 */
export function Table({ children, className = '' }: TableProps) {
  const [headers, setHeaders] = useState<string[]>([]);
  return (
    <HeaderContext.Provider value={{ headers, setHeaders }}>
      <div className="w-full overflow-x-auto md:overflow-x-auto">
        <table className={`responsive-table w-full border-collapse ${className}`}>
          {children}
        </table>
      </div>
    </HeaderContext.Provider>
  );
}

export function TableHeader({ children, className = '' }: TableProps) {
  const { setHeaders } = useContext(HeaderContext);

  useEffect(() => {
    const labels: string[] = [];
    React.Children.forEach(children, (row) => {
      if (React.isValidElement(row)) {
        React.Children.forEach((row.props as any).children, (cell) => {
          if (React.isValidElement(cell)) {
            const c = (cell.props as any).children;
            labels.push(typeof c === 'string' || typeof c === 'number' ? String(c) : '');
          }
        });
      }
    });
    setHeaders(prev => (prev.join('') === labels.join('') ? prev : labels));
  }, [children, setHeaders]);

  return <thead className={`bg-muted ${className}`}>{children}</thead>;
}

export function TableBody({ children, className = '' }: TableProps) {
  return <tbody className={className}>{children}</tbody>;
}

export function TableRow({ children, className = '' }: TableProps) {
  // Tag each cell with its column index so TableCell can look up its label.
  let i = 0;
  const mapped = React.Children.map(children, (child) =>
    React.isValidElement(child) ? React.cloneElement(child as any, { __colIndex: i++ }) : child
  );
  return <tr className={`border-b border-border hover:bg-muted/50 ${className}`}>{mapped}</tr>;
}

export function TableHead({ children, className = '' }: CellProps) {
  return (
    <th className={`text-left px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-muted-foreground whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', colSpan, __colIndex }: CellProps) {
  const { headers } = useContext(HeaderContext);
  // Full-width cells (e.g. empty-state messages) opt out of the label layout.
  if (colSpan) {
    return (
      <td colSpan={colSpan} className={`rt-full px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm ${className}`}>
        {children}
      </td>
    );
  }
  const label = typeof __colIndex === 'number' ? headers[__colIndex] : undefined;
  return (
    <td data-label={label || undefined} className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm ${className}`}>
      {children}
    </td>
  );
}
