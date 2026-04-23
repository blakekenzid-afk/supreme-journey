/**
 * WhiteboardCore - Global application infrastructure and shared helpers.
 * This file establishes the base environment for all whiteboard features.
 */
window.WhiteboardApp = {
    modalZ: 1000,
    widgetZ: 100,

    /**
     * Helper to get CSS variable values
     * @param {string} name 
     * @param {string} fallback 
     */
    getVar(name, fallback) {
        const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return val || fallback;
    },

    /**
     * Opens a modal by ID and manages z-index
     * @param {string} id 
     */
    openModal(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('hidden');
        this.modalZ++;
        el.style.zIndex = this.modalZ;
    },

    /**
     * Closes a modal by ID
     * @param {string} id 
     */
    closeModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    },

    /**
     * Makes an element draggable
     * @param {HTMLElement} el The element to make draggable
     * @param {HTMLElement} handle The handle to drag from (optional)
     * @param {Function} onDrag Callback on drag move (optional)
     */
    makeDraggable(el, handle, onDrag) {
        const app = this;
        let isDragging = false;
        let offsetX, offsetY;
        let docListenersBound = false;
        const dragHandle = handle || el;

        if (typeof el._dragCleanup === 'function') el._dragCleanup();

        const addDocumentListeners = () => {
            if (docListenersBound) return;
            document.addEventListener('mousemove', move);
            document.addEventListener('touchmove', move, {passive: false});
            document.addEventListener('mouseup', stop);
            document.addEventListener('touchend', stop);
            docListenersBound = true;
        };

        const removeDocumentListeners = () => {
            if (!docListenersBound) return;
            document.removeEventListener('mousemove', move);
            document.removeEventListener('touchmove', move);
            document.removeEventListener('mouseup', stop);
            document.removeEventListener('touchend', stop);
            docListenersBound = false;
        };

        const start = (e) => {
            const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : null);
            const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : null);
            if (clientX === null) return;

            const rect = el.getBoundingClientRect();
            offsetX = clientX - rect.left;
            offsetY = clientY - rect.top;
            isDragging = true;
            
            // Bring to front based on layering strategy
            if (el.classList.contains('modal-box') || el.closest('.modal-overlay')) {
                app.modalZ++;
                const target = el.closest('.modal-overlay') || el;
                target.style.zIndex = app.modalZ;
            } else {
                app.widgetZ++;
                el.style.zIndex = app.widgetZ;
            }

            addDocumentListeners();
            if (e.cancelable) e.preventDefault();
        };

        const move = (e) => {
            if (!isDragging) return;
            const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : null);
            const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : null);
            if (clientX === null) return;
            
            const parentRect = el.parentElement.getBoundingClientRect();
            let x = clientX - parentRect.left - offsetX;
            let y = clientY - parentRect.top - offsetY;
            
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            if (onDrag) onDrag(x, y);
        };

        const stop = () => {
            isDragging = false;
            removeDocumentListeners();
        };

        dragHandle.addEventListener('mousedown', start);
        dragHandle.addEventListener('touchstart', start, {passive: false});
        el._dragCleanup = () => {
            removeDocumentListeners();
            dragHandle.removeEventListener('mousedown', start);
            dragHandle.removeEventListener('touchstart', start);
        };
    },

    /**
     * Initializes core app behavior
     */
    init() {
        // Initialize z-indexes from CSS if possible
        this.modalZ = parseInt(this.getVar('--z-modal', '1000'));
        this.widgetZ = parseInt(this.getVar('--z-widget', '100'));

        // Global Modal Management
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            // Bring modal to front when clicked anywhere in its overlay/box
            overlay.addEventListener('mousedown', () => {
                this.modalZ++;
                overlay.style.zIndex = this.modalZ;
            });

            // Close on overlay background click
            overlay.addEventListener('click', e => {
                if (e.target === overlay) this.closeModal(overlay.id);
            });
        });

        // Setup close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.getAttribute('data-modal');
                this.closeModal(modalId);
            });
        });
    }
};

// Bootstrap the application shell
document.addEventListener('DOMContentLoaded', () => {
    WhiteboardApp.init();
});
