/**
 * Debug Agent for Visual Event Tracking
 * Provides a toolbar and element inspection mode for creating event trackers
 */

export interface DebugAgentConfig {
  debug?: boolean;
}

export interface Tracker {
  track(eventName: string, properties?: Record<string, unknown>): void | Promise<void>;
  log(...args: unknown[]): void;
}

export interface ExistingTracker {
  trackerId: string;
  name: string;
  type: string;
  selector: string;
  urlScope: string;
  urlPattern?: string;
  isEnabled: boolean;
}

export class DebugAgent {
  private tracker: Tracker;
  private sessionId: string;
  private tenantId: string;
  private apiUrl: string;
  private config: DebugAgentConfig;
  private isDestroyed = false;
  
  // UI state
  private isInspectMode = false;
  private showTrackers = false;
  private selectedElement: Element | null = null;
  private toolbarElement: HTMLElement | null = null;
  private panelElement: HTMLElement | null = null;
  private highlightElement: HTMLElement | null = null;
  private existingTrackers: ExistingTracker[] = [];
  private trackerHighlights: HTMLElement[] = [];
  
  // Dragging state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private toolbarStartX = 0;
  private toolbarStartY = 0;
  
  // Event listeners
  private mouseMoveListener: ((e: MouseEvent) => void) | null = null;
  private clickListener: ((e: MouseEvent) => void) | null = null;
  private dragMoveListener: ((e: MouseEvent) => void) | null = null;
  private dragEndListener: ((e: MouseEvent) => void) | null = null;

  constructor(
    tracker: Tracker,
    sessionId: string,
    tenantId: string,
    apiUrl: string,
    config: DebugAgentConfig = {}
  ) {
    this.tracker = tracker;
    this.sessionId = sessionId;
    this.tenantId = tenantId;
    this.apiUrl = apiUrl;
    this.config = {
      debug: config.debug ?? false,
    };

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * Initialize the debug agent
   */
  private async initialize(): Promise<void> {
    this.log('Initializing debug agent');
    await this.loadExistingTrackers();
    this.showToolbar();
    this.createHighlightElement();
    
    // Show trackers by default
    this.showTrackers = true;
    this.showTrackerHighlights();
    this.showTrackersList();
  }

  /**
   * Load existing trackers from API
   */
  private async loadExistingTrackers(): Promise<void> {
    try {
      const url = `${this.apiUrl}/v1/tenant/${encodeURIComponent(this.tenantId)}/trackers`;
      const response = await fetch(url);

      if (response.ok) {
        this.existingTrackers = await response.json();
        this.log('Loaded trackers:', this.existingTrackers);
      }
    } catch (error) {
      this.log('Failed to load trackers:', error);
      this.existingTrackers = [];
    }
  }

  /**
   * Show the debug toolbar
   */
  private showToolbar(): void {
    if (this.toolbarElement) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'grain-debug-toolbar';
    toolbar.innerHTML = `
      <style>
        #grain-debug-toolbar {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: repeating-linear-gradient(
            45deg,
            #fbbf24,
            #fbbf24 10px,
            #1e293b 10px,
            #1e293b 20px
          );
          border: 2px solid #1e293b;
          border-radius: 12px;
          padding: 6px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1);
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
        }
        
        .grain-toolbar-inner {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          border-radius: 6px;
          padding: 8px 12px;
        }
        
        #grain-debug-toolbar.dragging {
          cursor: move;
          user-select: none;
        }
        
        .grain-toolbar-header {
          display: flex;
          align-items: center;
          cursor: move;
          user-select: none;
          padding: 6px 10px;
          background: #1e293b;
          border-radius: 4px;
          margin-right: 4px;
        }
        
        .grain-toolbar-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #fbbf24;
        }
        
        .grain-toolbar-body {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }
        
        .grain-toolbar-stats {
          display: flex;
          gap: 12px;
          padding: 6px 10px;
          background: #f8fafc;
          border-radius: 4px;
          margin-right: 4px;
        }
        
        .grain-stat {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        
        .grain-stat-value {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
        }
        
        .grain-stat-label {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
        }
        
        .grain-toolbar-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        #grain-debug-toolbar button {
          background: white;
          border: 1.5px solid #e2e8f0;
          color: #475569;
          padding: 8px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
        }
        
        #grain-debug-toolbar button:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        
        #grain-debug-toolbar button.active {
          background: #fbbf24;
          color: #1e293b;
          border-color: #fbbf24;
          box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
        }
        
        #grain-debug-toolbar button.danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border-color: #ef4444;
          color: white;
        }
        
        #grain-debug-toolbar button.danger:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
        }
        
        .grain-debug-highlight {
          position: absolute;
          pointer-events: none;
          border: 2px solid #10b981;
          background: rgba(16, 185, 129, 0.1);
          z-index: 999998;
          transition: all 0.1s;
        }
        
        .grain-tracker-highlight {
          position: absolute;
          pointer-events: none;
          border: 2px solid #6366f1;
          background: rgba(99, 102, 241, 0.08);
          z-index: 999997;
          transition: opacity 0.2s;
        }
        
        .grain-tracker-label {
          position: absolute;
          top: -28px;
          left: 0;
          background: #6366f1;
          color: white;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          pointer-events: none;
        }
        
        .grain-tracker-label::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 10px;
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 4px solid #6366f1;
        }
        
        .grain-trackers-list {
          position: fixed;
          bottom: 80px;
          right: 20px;
          background: white;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px;
          max-height: 400px;
          width: 320px;
          overflow-y: auto;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06);
          z-index: 999998;
        }
        
        .grain-tracker-item {
          padding: 10px;
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .grain-tracker-item:hover {
          background: #f1f5f9;
          transform: translateX(4px);
        }
        
        .grain-tracker-item:last-child {
          margin-bottom: 0;
        }
        
        .grain-tracker-name {
          font-weight: 600;
          color: #1e293b;
          font-size: 13px;
          margin-bottom: 4px;
        }
        
        .grain-tracker-details {
          font-size: 11px;
          color: #64748b;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .grain-tracker-type {
          background: #dbeafe;
          color: #1e40af;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.5px;
        }
      </style>
      <div class="grain-toolbar-inner">
        <div class="grain-toolbar-header" id="grain-toolbar-handle">
          <div class="grain-toolbar-title">Grain Debug</div>
        </div>
        <div class="grain-toolbar-body">
          <div class="grain-toolbar-stats">
            <div class="grain-stat">
              <div class="grain-stat-value">${this.existingTrackers.length}</div>
              <div class="grain-stat-label">trackers</div>
            </div>
            <div class="grain-stat">
              <div class="grain-stat-value">${this.existingTrackers.filter(t => t.isEnabled).length}</div>
              <div class="grain-stat-label">active</div>
            </div>
          </div>
          <div class="grain-toolbar-actions">
            <button id="grain-debug-inspect" type="button">
              + New
            </button>
            <button id="grain-debug-trackers" class="active" type="button">
              Hide
            </button>
            <button id="grain-debug-end" class="danger" type="button">
              End Session
            </button>
          </div>
        </div>
      </div>
      <div id="grain-trackers-list-container"></div>
    `;

    document.body.appendChild(toolbar);
    this.toolbarElement = toolbar;

    // Setup dragging
    const handle = toolbar.querySelector('#grain-toolbar-handle') as HTMLElement;
    if (handle) {
      handle.addEventListener('mousedown', (e) => this.startDrag(e));
    }

    // Add event listeners
    const inspectBtn = toolbar.querySelector('#grain-debug-inspect');
    const trackersBtn = toolbar.querySelector('#grain-debug-trackers');
    const endBtn = toolbar.querySelector('#grain-debug-end');

    if (inspectBtn) {
      inspectBtn.addEventListener('click', () => this.toggleInspectMode());
    }

    if (trackersBtn) {
      trackersBtn.addEventListener('click', () => this.toggleTrackerView());
    }

    if (endBtn) {
      endBtn.addEventListener('click', () => this.endDebug());
    }

    this.log('Toolbar shown');
  }

  /**
   * Create highlight element for hovering
   */
  private createHighlightElement(): void {
    if (this.highlightElement) return;

    const highlight = document.createElement('div');
    highlight.className = 'grain-debug-highlight';
    highlight.style.display = 'none';
    document.body.appendChild(highlight);
    this.highlightElement = highlight;
  }

  /**
   * Start dragging the toolbar
   */
  private startDrag(e: MouseEvent): void {
    if (!this.toolbarElement) return;
    
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    
    const rect = this.toolbarElement.getBoundingClientRect();
    this.toolbarStartX = rect.left;
    this.toolbarStartY = rect.top;
    
    this.toolbarElement.classList.add('dragging');
    
    this.dragMoveListener = (e: MouseEvent) => this.onDrag(e);
    this.dragEndListener = () => this.endDrag();
    
    document.addEventListener('mousemove', this.dragMoveListener);
    document.addEventListener('mouseup', this.dragEndListener);
  }

  /**
   * Handle drag movement
   */
  private onDrag(e: MouseEvent): void {
    if (!this.isDragging || !this.toolbarElement) return;
    
    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;
    
    const newX = this.toolbarStartX + deltaX;
    const newY = this.toolbarStartY + deltaY;
    
    // Keep toolbar within viewport
    const maxX = window.innerWidth - this.toolbarElement.offsetWidth;
    const maxY = window.innerHeight - this.toolbarElement.offsetHeight;
    
    const clampedX = Math.max(0, Math.min(newX, maxX));
    const clampedY = Math.max(0, Math.min(newY, maxY));
    
    this.toolbarElement.style.left = `${clampedX}px`;
    this.toolbarElement.style.top = `${clampedY}px`;
    this.toolbarElement.style.right = 'auto';
    this.toolbarElement.style.bottom = 'auto';
  }

  /**
   * End dragging
   */
  private endDrag(): void {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    
    if (this.toolbarElement) {
      this.toolbarElement.classList.remove('dragging');
    }
    
    if (this.dragMoveListener) {
      document.removeEventListener('mousemove', this.dragMoveListener);
      this.dragMoveListener = null;
    }
    
    if (this.dragEndListener) {
      document.removeEventListener('mouseup', this.dragEndListener);
      this.dragEndListener = null;
    }
  }

  /**
   * Toggle tracker view
   */
  private toggleTrackerView(): void {
    this.showTrackers = !this.showTrackers;
    
    const trackersBtn = document.querySelector('#grain-debug-trackers');
    if (trackersBtn) {
      trackersBtn.textContent = this.showTrackers ? 'Hide' : 'View';
      trackersBtn.classList.toggle('active', this.showTrackers);
    }
    
    if (this.showTrackers) {
      this.showTrackerHighlights();
      this.showTrackersList();
    } else {
      this.hideTrackerHighlights();
      this.hideTrackersList();
    }
  }

  /**
   * Show tracker highlights on page
   */
  private showTrackerHighlights(): void {
    this.hideTrackerHighlights();
    
    for (const tracker of this.existingTrackers) {
      if (!tracker.isEnabled) continue;
      
      try {
        const element = this.findElementBySelector(tracker.selector);
        if (!element) continue;
        
        const rect = element.getBoundingClientRect();
        const highlight = document.createElement('div');
        highlight.className = 'grain-tracker-highlight';
        
        const label = document.createElement('div');
        label.className = 'grain-tracker-label';
        label.textContent = tracker.name;
        
        highlight.style.top = `${rect.top + window.scrollY}px`;
        highlight.style.left = `${rect.left + window.scrollX}px`;
        highlight.style.width = `${rect.width}px`;
        highlight.style.height = `${rect.height}px`;
        
        highlight.appendChild(label);
        document.body.appendChild(highlight);
        this.trackerHighlights.push(highlight);
      } catch (error) {
        this.log('Failed to highlight tracker:', tracker.name, error);
      }
    }
  }

  /**
   * Hide tracker highlights
   */
  private hideTrackerHighlights(): void {
    for (const highlight of this.trackerHighlights) {
      highlight.remove();
    }
    this.trackerHighlights = [];
  }

  /**
   * Show trackers list
   */
  private showTrackersList(): void {
    // Check if list already exists
    let list = document.querySelector('.grain-trackers-list') as HTMLElement;
    
    if (this.existingTrackers.length === 0) {
      if (list) list.remove();
      return;
    }
    
    if (!list) {
      list = document.createElement('div');
      list.className = 'grain-trackers-list';
      document.body.appendChild(list);
    }
    
    list.innerHTML = `
      ${this.existingTrackers.map(tracker => `
        <div class="grain-tracker-item" data-tracker-id="${tracker.trackerId}">
          <div class="grain-tracker-name">${tracker.name}</div>
          <div class="grain-tracker-details">
            <span class="grain-tracker-type">${tracker.type}</span>
            <span>${tracker.urlScope}</span>
            ${!tracker.isEnabled ? '<span style="color: #ef4444;">• Disabled</span>' : ''}
          </div>
        </div>
      `).join('')}
    `;
    
    // Add click handlers to scroll to elements
    list.querySelectorAll('.grain-tracker-item').forEach(item => {
      item.addEventListener('click', () => {
        const trackerId = item.getAttribute('data-tracker-id');
        const tracker = this.existingTrackers.find(t => t.trackerId === trackerId);
        if (tracker) {
          this.scrollToTracker(tracker);
        }
      });
    });
  }

  /**
   * Hide trackers list
   */
  private hideTrackersList(): void {
    const list = document.querySelector('.grain-trackers-list');
    if (list) {
      list.remove();
    }
  }

  /**
   * Scroll to and highlight a tracker element
   */
  private scrollToTracker(tracker: ExistingTracker): void {
    try {
      const element = this.findElementBySelector(tracker.selector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Flash the highlight
        const highlight = this.trackerHighlights.find(h => {
          const rect = element.getBoundingClientRect();
          const hRect = h.getBoundingClientRect();
          return Math.abs(hRect.top - rect.top) < 5;
        });
        
        if (highlight) {
          highlight.style.opacity = '0';
          setTimeout(() => {
            highlight.style.opacity = '1';
          }, 100);
          setTimeout(() => {
            highlight.style.opacity = '0';
          }, 300);
          setTimeout(() => {
            highlight.style.opacity = '1';
          }, 500);
        }
      }
    } catch (error) {
      this.log('Failed to scroll to tracker:', error);
    }
  }

  /**
   * Find element by XPath selector
   */
  private findElementBySelector(selector: string): Element | null {
    try {
      const result = document.evaluate(
        selector,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      return result.singleNodeValue as Element | null;
    } catch (error) {
      this.log('Failed to find element:', error);
      return null;
    }
  }

  /**
   * Toggle inspect mode
   */
  private toggleInspectMode(): void {
    if (this.isInspectMode) {
      this.disableInspectMode();
    } else {
      this.enableInspectMode();
    }
  }

  /**
   * Enable element inspection mode
   */
  private enableInspectMode(): void {
    if (this.isInspectMode) return;

    this.log('Enabling inspect mode');
    this.isInspectMode = true;

    // Update button state
    const inspectBtn = document.querySelector('#grain-debug-inspect');
    if (inspectBtn) {
      inspectBtn.classList.add('active');
      inspectBtn.textContent = 'Click Element';
    }

    // Add event listeners
    this.mouseMoveListener = (e: MouseEvent) => this.handleMouseMove(e);
    this.clickListener = (e: MouseEvent) => this.handleElementClick(e);

    document.addEventListener('mousemove', this.mouseMoveListener, true);
    document.addEventListener('click', this.clickListener, true);
    
    // Add ESC key listener to exit inspect mode
    document.addEventListener('keydown', this.handleEscapeKey);
  }

  /**
   * Handle ESC key to exit inspect mode
   */
  private handleEscapeKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.isInspectMode) {
      this.disableInspectMode();
    }
  };

  /**
   * Disable element inspection mode
   */
  private disableInspectMode(): void {
    if (!this.isInspectMode) return;

    this.log('Disabling inspect mode');
    this.isInspectMode = false;

    // Update button state
    const inspectBtn = document.querySelector('#grain-debug-inspect');
    if (inspectBtn) {
      inspectBtn.classList.remove('active');
      inspectBtn.textContent = '+ New';
    }

    // Remove event listeners
    if (this.mouseMoveListener) {
      document.removeEventListener('mousemove', this.mouseMoveListener, true);
      this.mouseMoveListener = null;
    }

    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener, true);
      this.clickListener = null;
    }

    document.removeEventListener('keydown', this.handleEscapeKey);

    // Hide highlight
    if (this.highlightElement) {
      this.highlightElement.style.display = 'none';
    }
  }

  /**
   * Handle mouse move to highlight hovered element
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.isInspectMode || !this.highlightElement) return;

    // Ignore if hovering over toolbar, panel, or tracker list
    const target = e.target as HTMLElement;
    if (target.closest('#grain-debug-toolbar') || 
        target.closest('#grain-debug-panel') ||
        target.closest('.grain-trackers-list')) {
      this.highlightElement.style.display = 'none';
      return;
    }

    // Get element rect
    const element = e.target as HTMLElement;
    const rect = element.getBoundingClientRect();

    // Position highlight
    this.highlightElement.style.display = 'block';
    this.highlightElement.style.top = `${rect.top + window.scrollY}px`;
    this.highlightElement.style.left = `${rect.left + window.scrollX}px`;
    this.highlightElement.style.width = `${rect.width}px`;
    this.highlightElement.style.height = `${rect.height}px`;
  }

  /**
   * Handle element click to show creation panel
   */
  private handleElementClick(e: MouseEvent): void {
    if (!this.isInspectMode) return;

    const target = e.target as HTMLElement;
    
    // If clicking toolbar or tracker list, exit inspect mode and allow normal click
    if (target.closest('#grain-debug-toolbar') || target.closest('.grain-trackers-list')) {
      this.disableInspectMode();
      return;
    }

    // If clicking panel, prevent default but don't do anything
    if (target.closest('#grain-debug-panel')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Otherwise, select the element
    e.preventDefault();
    e.stopPropagation();

    this.selectedElement = target;
    this.disableInspectMode();
    this.showCreationPanel(target);
  }

  /**
   * Show tracker creation panel
   */
  private showCreationPanel(element: Element): void {
    // Remove existing panel if any
    if (this.panelElement) {
      this.panelElement.remove();
    }

    const panel = document.createElement('div');
    panel.id = 'grain-debug-panel';
    
    // Extract element info
    const tagName = element.tagName.toLowerCase();
    const elementId = element.id;
    const elementText = element.textContent?.trim().substring(0, 50) || '';
    const xpath = this.getXPathForElement(element);
    
    panel.innerHTML = `
      <style>
        #grain-debug-panel {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: repeating-linear-gradient(
            45deg,
            #fbbf24,
            #fbbf24 10px,
            #1e293b 10px,
            #1e293b 20px
          );
          border: 2px solid #1e293b;
          border-radius: 16px;
          padding: 6px;
          width: 420px;
          max-width: 90vw;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25), 0 8px 24px rgba(0, 0, 0, 0.15);
          z-index: 1000000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .grain-panel-inner {
          background: white;
          border-radius: 10px;
          overflow: hidden;
        }
        
        .grain-panel-header {
          background: #1e293b;
          padding: 14px 18px;
          color: white;
        }
        
        .grain-panel-header h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: #fbbf24;
          text-transform: uppercase;
        }
        
        .grain-panel-header p {
          margin: 0;
          font-size: 12px;
          opacity: 0.85;
          color: white;
        }
        
        .grain-panel-body {
          padding: 18px;
        }
        
        #grain-debug-panel .element-preview {
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 16px;
          font-size: 11px;
          color: #475569;
        }
        
        #grain-debug-panel .element-preview div {
          margin-bottom: 4px;
        }
        
        #grain-debug-panel .element-preview div:last-child {
          margin-bottom: 0;
        }
        
        #grain-debug-panel .element-preview strong {
          color: #1e293b;
          font-weight: 600;
        }
        
        #grain-debug-panel label {
          display: block;
          color: #1e293b;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 6px;
        }
        
        #grain-debug-panel input,
        #grain-debug-panel select {
          width: 100%;
          background: white;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          padding: 9px 12px;
          color: #1e293b;
          font-size: 13px;
          margin-bottom: 14px;
          box-sizing: border-box;
          transition: all 0.2s;
        }
        
        #grain-debug-panel input:focus,
        #grain-debug-panel select:focus {
          outline: none;
          border-color: #fbbf24;
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
        }
        
        #grain-debug-panel .button-group {
          display: flex;
          gap: 8px;
          margin-top: 18px;
        }
        
        #grain-debug-panel button {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        #grain-debug-panel button.primary {
          background: #fbbf24;
          color: #1e293b;
          box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
        }
        
        #grain-debug-panel button.primary:hover {
          background: #f59e0b;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
        }
        
        #grain-debug-panel button.secondary {
          background: white;
          border: 1.5px solid #e2e8f0;
          color: #475569;
        }
        
        #grain-debug-panel button.secondary:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        
        #grain-debug-panel .url-pattern-input {
          display: none;
        }
        
        #grain-debug-panel .url-pattern-input.visible {
          display: block;
        }
      </style>
      <div class="grain-panel-inner">
        <div class="grain-panel-header">
          <h3>Create Tracker</h3>
          <p>Set up automatic tracking for this element</p>
        </div>
        <div class="grain-panel-body">
          <div class="element-preview">
            <div><strong>Element:</strong> ${tagName}${elementId ? `#${elementId}` : ''}</div>
            ${elementText ? `<div><strong>Text:</strong> ${elementText}</div>` : ''}
          </div>
          <div>
            <label>Event Name</label>
            <input type="text" id="grain-event-name" placeholder="e.g., signup_button_click" value="" />
          </div>
          <div>
            <label>Type</label>
            <select id="grain-event-type">
              <option value="metric">Metric</option>
              <option value="conversion">Conversion</option>
            </select>
          </div>
          <div>
            <label>URL Scope</label>
            <select id="grain-url-scope">
              <option value="all">All Pages</option>
              <option value="contains" selected>This Page</option>
              <option value="equals">Exact URL</option>
            </select>
          </div>
          <div class="url-pattern-input visible" id="grain-url-pattern-container">
            <label>URL Pattern</label>
            <input type="text" id="grain-url-pattern" placeholder="e.g., /pricing" value="${window.location.pathname}" />
          </div>
          <div class="button-group">
            <button type="button" class="secondary" id="grain-cancel">Cancel</button>
            <button type="button" class="primary" id="grain-create">✓ Create</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.panelElement = panel;

    // Auto-generate event name suggestion
    const eventNameInput = panel.querySelector('#grain-event-name') as HTMLInputElement;
    if (eventNameInput) {
      const suggestedName = this.generateEventName(element);
      eventNameInput.value = suggestedName;
      eventNameInput.select();
    }

    // Handle URL scope change
    const urlScopeSelect = panel.querySelector('#grain-url-scope') as HTMLSelectElement;
    const urlPatternContainer = panel.querySelector('#grain-url-pattern-container');
    const urlPatternInput = panel.querySelector('#grain-url-pattern') as HTMLInputElement;
    
    if (urlScopeSelect && urlPatternContainer) {
      urlScopeSelect.addEventListener('change', () => {
        if (urlScopeSelect.value === 'all') {
          urlPatternContainer.classList.remove('visible');
        } else {
          urlPatternContainer.classList.add('visible');
          if (urlPatternInput && !urlPatternInput.value) {
            urlPatternInput.value = window.location.pathname;
          }
        }
      });
    }

    // Handle buttons
    const cancelBtn = panel.querySelector('#grain-cancel');
    const createBtn = panel.querySelector('#grain-create');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hideCreationPanel());
    }

    if (createBtn) {
      createBtn.addEventListener('click', () => this.handleCreateTracker(xpath));
    }
  }

  /**
   * Generate suggested event name from element
   */
  private generateEventName(element: Element): string {
    const tagName = element.tagName.toLowerCase();
    const elementId = element.id;
    const elementText = element.textContent?.trim().toLowerCase().replace(/\s+/g, '_').substring(0, 30) || '';
    
    // Try to generate meaningful name
    if (elementId) {
      return `${elementId}_click`;
    } else if (elementText) {
      return `${elementText}_click`;
    } else if (tagName === 'button') {
      return 'button_click';
    } else if (tagName === 'a') {
      return 'link_click';
    } else {
      return `${tagName}_click`;
    }
  }

  /**
   * Handle tracker creation
   */
  private async handleCreateTracker(selector: string): Promise<void> {
    if (!this.panelElement) return;

    const eventNameInput = this.panelElement.querySelector('#grain-event-name') as HTMLInputElement;
    const eventTypeSelect = this.panelElement.querySelector('#grain-event-type') as HTMLSelectElement;
    const urlScopeSelect = this.panelElement.querySelector('#grain-url-scope') as HTMLSelectElement;
    const urlPatternInput = this.panelElement.querySelector('#grain-url-pattern') as HTMLInputElement;

    if (!eventNameInput || !eventTypeSelect || !urlScopeSelect) return;

    const eventName = eventNameInput.value.trim();
    const eventType = eventTypeSelect.value;
    const urlScope = urlScopeSelect.value;
    const urlPattern = urlPatternInput?.value.trim() || undefined;

    // Validate
    if (!eventName) {
      alert('Please enter an event name');
      return;
    }

    if (!eventName.match(/^[a-zA-Z0-9_-]+$/)) {
      alert('Event name can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    if ((urlScope === 'contains' || urlScope === 'equals') && !urlPattern) {
      alert('Please enter a URL pattern');
      return;
    }

    try {
      // Show loading state
      const createBtn = this.panelElement.querySelector('#grain-create') as HTMLButtonElement;
      if (createBtn) {
        createBtn.textContent = 'Creating...';
        createBtn.disabled = true;
      }

      // Create tracker
      await this.createTracker(eventName, eventType, selector, urlScope, urlPattern);

      // Success
      this.hideCreationPanel();
      this.showSuccessMessage(`Tracker "${eventName}" created successfully!`);
      
      // Reload trackers and update UI
      await this.loadExistingTrackers();
      this.updateToolbarStats();
      if (this.showTrackers) {
        this.showTrackerHighlights();
        this.showTrackersList();
      }
      
      this.log('Tracker created:', eventName);
    } catch (error) {
      alert('Failed to create tracker. Please try again.');
      this.log('Failed to create tracker:', error);
      
      // Reset button
      const createBtn = this.panelElement.querySelector('#grain-create') as HTMLButtonElement;
      if (createBtn) {
        createBtn.textContent = 'Create Tracker';
        createBtn.disabled = false;
      }
    }
  }

  /**
   * Create tracker via API
   */
  private async createTracker(
    name: string,
    type: string,
    selector: string,
    urlScope: string,
    urlPattern?: string
  ): Promise<void> {
    const url = `${this.apiUrl}/v1/tenant/${encodeURIComponent(this.tenantId)}/debug-sessions/${this.sessionId}/trackers`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        type,
        selector,
        urlScope,
        urlPattern,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create tracker: ${response.status}`);
    }
  }

  /**
   * Hide creation panel
   */
  private hideCreationPanel(): void {
    if (this.panelElement) {
      this.panelElement.remove();
      this.panelElement = null;
    }
    this.selectedElement = null;
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 14px 24px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 12px 32px rgba(16, 185, 129, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000000;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideDown 0.3s ease-out forwards;
    `;
    toast.innerHTML = `
      <style>
        @keyframes slideDown {
          to {
            transform: translateX(-50%) translateY(0);
          }
        }
      </style>
      <span style="font-size: 18px;">✓</span>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease-in reverse';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 2700);
  }

  /**
   * End debug session
   */
  private async endDebug(): Promise<void> {
    try {
      // Call end session API
      const url = `${this.apiUrl}/v1/tenant/${encodeURIComponent(this.tenantId)}/debug-sessions/${this.sessionId}/end`;
      
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      this.log('Failed to end debug session:', error);
    }

    // Clean up and reload page
    this.destroy();
    
    // Remove debug params from URL and reload
    const url = new URL(window.location.href);
    url.searchParams.delete('grain_debug');
    url.searchParams.delete('grain_session');
    window.location.href = url.toString();
  }

  /**
   * Get XPath for element
   */
  private getXPathForElement(element: Element): string {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    const parts: string[] = [];
    let current: Element | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 0;
      let sibling: Element | null = current;

      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }

      const tagName = current.tagName.toLowerCase();
      const pathIndex = index > 1 ? `[${index}]` : '';
      parts.unshift(`${tagName}${pathIndex}`);

      current = current.parentElement;
    }

    return parts.length ? `/${parts.join('/')}` : '';
  }

  /**
   * Log debug messages
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[DebugAgent]', ...args);
    }
  }

  /**
   * Update toolbar stats
   */
  private updateToolbarStats(): void {
    if (!this.toolbarElement) return;
    
    const totalStat = this.toolbarElement.querySelector('.grain-stat:nth-child(1) .grain-stat-value');
    const activeStat = this.toolbarElement.querySelector('.grain-stat:nth-child(2) .grain-stat-value');
    
    if (totalStat) {
      totalStat.textContent = String(this.existingTrackers.length);
    }
    if (activeStat) {
      activeStat.textContent = String(this.existingTrackers.filter(t => t.isEnabled).length);
    }
  }

  /**
   * Destroy the debug agent
   */
  destroy(): void {
    if (this.isDestroyed) return;

    this.log('Destroying debug agent');
    this.isDestroyed = true;

    this.disableInspectMode();
    this.hideTrackerHighlights();
    this.endDrag();

    if (this.toolbarElement) {
      this.toolbarElement.remove();
      this.toolbarElement = null;
    }

    if (this.panelElement) {
      this.panelElement.remove();
      this.panelElement = null;
    }

    if (this.highlightElement) {
      this.highlightElement.remove();
      this.highlightElement = null;
    }
  }
}
