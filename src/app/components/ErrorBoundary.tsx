import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Catches a render-time crash so it costs one panel instead of the whole app.
 *
 * React unmounts the entire tree when a component throws during render and
 * nothing above it catches — which is what a white screen is. There was no
 * boundary anywhere in this app, so a single bad expression in a single modal
 * (a helper deleted from BillDivision.tsx, in the case that prompted this) took
 * out the sidebar, the navbar and every dashboard along with it, with nothing on
 * screen to say what had happened or how to get back.
 *
 * A boundary cannot make broken code work. What it changes is the blast radius
 * and the report: the surrounding screen survives, the person sees a message
 * they can act on rather than an empty page, and the actual error reaches the
 * console with a component stack instead of vanishing with the tree.
 *
 * `resetKey` clears the error when it changes — navigating to another view is
 * the natural retry, and without it a crash would follow the user around the app
 * until they reloaded.
 */

const NAVY = '#1b365d';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Named in the message, so the person can say which screen failed. */
  label?: string;
  /** Changing this clears the error — pass the active view or a row id. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`Render failed${this.props.label ? ` in ${this.props.label}` : ''}:`, error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-[240px] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#f3c9c4] bg-[#FDECEC] p-6 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#c0392b]">
            <AlertTriangle size={20} />
          </span>
          <p className="text-sm font-semibold" style={{ color: NAVY }}>
            {this.props.label ? `${this.props.label} could not be shown` : 'Something went wrong'}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Nothing you were doing has been lost — the rest of the app is still working.
            Try again, and if it keeps happening quote this message.
          </p>
          {/* The message itself, not a generic apology: it is the one thing that
              turns "it broke" into a report somebody can act on. */}
          <p className="mt-3 break-words rounded-lg bg-white/70 px-3 py-2 text-left text-[11px] font-mono text-[#c0392b]">
            {error.message || String(error)}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1b365d] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#142a4a]"
            >
              <RotateCcw size={13} /> Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full border border-[#E7EDF4] bg-white px-4 py-2 text-xs font-medium transition-colors hover:bg-[#F4F6F9]"
              style={{ color: NAVY }}
            >
              Reload the page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
