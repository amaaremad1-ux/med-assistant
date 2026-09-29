import { Component } from 'react';

/**
 * ErrorBoundary — keeps one broken widget from taking the whole application
 * down to a blank white screen.
 *
 * WHY THIS EXISTS
 *   The app shell renders a decorative canvas, a live ticker, the sidebar, the
 *   top bar and the routed page in one React tree. Before this boundary, a
 *   single thrown error anywhere in that tree unmounted everything, so the user
 *   saw an empty page with no explanation. Now the failure is contained: the
 *   rest of the shell keeps working and the broken part says what happened.
 *
 * `variant="silent"` is for purely decorative parts (the living background):
 * if the canvas cannot draw, the correct behaviour is to render nothing at all
 * rather than to put a red box behind the whole interface.
 *
 * The message shown is the real error text. Nothing is smoothed over or
 * replaced with a reassuring placeholder.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.handleReload = this.handleReload.bind(this);
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error, info) {
    // Keep the stack in the console for whoever is debugging; the UI shows the
    // message only, because a component stack is noise to an end user.
    console.error(`[ErrorBoundary:${this.props.label ?? 'unlabelled'}]`, error, info?.componentStack ?? '');
  }

  handleReload() {
    window.location.reload();
  }

  handleReset() {
    this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    const { children, label = 'this section', variant = 'panel', fallback = undefined } = this.props;

    if (!error) return children ?? null;

    if (variant === 'silent') return fallback ?? null;

    return (
      <div className="error-boundary" role="alert">
        <p className="error-boundary-title">
          {label} could not be displayed
        </p>
        <p className="error-boundary-message">
          {error.name}: {error.message}
        </p>
        <p className="error-boundary-note">
          The rest of the application is still running. This prototype keeps its records in this
          browser only, so reloading will not lose data you have already saved — but anything typed
          into a form that had not been submitted yet will be gone.
        </p>
        <div className="error-boundary-actions">
          <button type="button" className="action-button" onClick={this.handleReset}>
            Try rendering again
          </button>
          <button type="button" className="action-button secondary" onClick={this.handleReload}>
            Reload the page
          </button>
        </div>
      </div>
    );
  }
}
