/**
 * WhiteboardStorage - Shared storage infrastructure
 * Wraps localStorage for common whiteboard data operations.
 */
window.WhiteboardStorage = {
    /**
     * Reads a JSON value from localStorage
     * @param {string} key 
     * @param {*} fallback 
     */
    readJSON(key, fallback) {
        try {
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : fallback;
        } catch (e) {
            console.error('Error reading from localStorage:', key, e);
            return fallback;
        }
    },

    /**
     * Writes a JSON value to localStorage
     * @param {string} key 
     * @param {*} value 
     */
    writeJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Error writing to localStorage:', key, e);
        }
    },

    /**
     * Removes a key from localStorage
     * @param {string} key 
     */
    removeKey(key) {
        localStorage.removeItem(key);
    }
};
