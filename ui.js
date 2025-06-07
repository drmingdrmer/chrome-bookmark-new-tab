// UI-related constants

// Seed colors for directories (stronger pastel colors with better contrast on dark backgrounds)
const colorPalette = [
    'rgba(255, 179, 186, 0.15)', // Pink
    'rgba(255, 223, 186, 0.15)', // Peach
    'rgba(255, 255, 186, 0.15)', // Light Yellow
    'rgba(186, 255, 201, 0.15)', // Light Green
    'rgba(186, 225, 255, 0.15)', // Light Blue
    'rgba(186, 200, 255, 0.15)', // Lavender
    'rgba(228, 186, 255, 0.15)', // Light Purple
    'rgba(255, 186, 255, 0.15)', // Light Magenta
    'rgba(200, 255, 248, 0.15)', // Mint
    'rgba(255, 213, 145, 0.15)', // Light Orange
    'rgba(173, 216, 230, 0.15)', // Light Sky Blue
    'rgba(144, 238, 144, 0.15)',  // Light Green
];

/**
 * Helper function to create DOM elements with attributes and children
 * @param {string} tag - The HTML tag name
 * @param {Object} attributes - Object of attributes to set on the element
 * @param {Array} children - Array of child elements or text nodes
 * @returns {HTMLElement} The created element
 */
function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'textContent') {
            element.textContent = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else {
            element.setAttribute(key, value);
        }
    });

    // Add children
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(child);
        }
    });

    return element;
}

/**
 * Helper function to create a span element with text content
 * @param {string} className - CSS class name for the span
 * @param {string} text - Text content for the span
 * @param {Object} additionalAttributes - Additional attributes to set on the span
 * @returns {HTMLElement} The created span element
 */
function textSpan(className, text, additionalAttributes = {}) {
    return createElement('span', {
        className,
        textContent: text,
        ...additionalAttributes,
    });
}

/**
 * Helper function to create a div element with attributes and children
 * @param {string} className - CSS class name for the div
 * @param {Object} additionalAttributes - Additional attributes to set on the div
 * @param {Array} children - Array of child elements or text nodes
 * @returns {HTMLElement} The created div element
 */
function div(className, additionalAttributes = {}, children = []) {
    return createElement('div', {
        className,
        ...additionalAttributes,
    }, children);
}

/**
 * Helper function to create a div element with text content
 * @param {string} className - CSS class name for the div
 * @param {string} text - Text content for the div
 * @param {Object} additionalAttributes - Additional attributes to set on the div
 * @returns {HTMLElement} The created div element
 */
function textDiv(className, text, additionalAttributes = {}) {
    return createElement('div', {
        className,
        textContent: text,
        ...additionalAttributes,
    });
}

// Export the colorPalette and helper functions for use in other files
export { colorPalette, createElement, div, textDiv, textSpan }; 