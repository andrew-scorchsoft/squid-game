/**
 * Mermaid Chart Enhancements
 * Adds fullscreen functionality to Mermaid diagrams
 * Note: Zoom controls temporarily hidden due to compatibility issues
 */

// Track if Mermaid has been initialized globally
let mermaidInitialized = false;

// Mermaid configuration object - consistent theme settings
const MERMAID_CONFIG = {
  startOnLoad: false, // We'll control when to run
  theme: 'default',
  themeVariables: {
    primaryColor: '#FF6600',
    primaryTextColor: '#000',
    primaryBorderColor: '#C62828',
    lineColor: '#666',
    sectionBkgColor: '#f9f9f9',
    altSectionBkgColor: '#fff',
    gridColor: '#ddd',
    c0: '#FF6600',
    c1: '#C62828',
    c2: '#FF8A50',
    c3: '#E55100'
  }
};

// Initialize on both initial load and MkDocs navigation
document.addEventListener("DOMContentLoaded", initializeMermaid);

// Handle MkDocs Material instant navigation
document.addEventListener("DOMContentLoaded", function() {
  // Listen for MkDocs Material navigation events
  if (typeof app !== 'undefined' && app.location$) {
    // MkDocs Material v8+ uses location$ observable
    app.location$.subscribe(() => {
      // Longer timeout for navigation to let CSS settle
      setTimeout(() => {
        initializeMermaid();
      }, 300);
    });
  } else {
    // Fallback for older versions or manual navigation detection
    let currentPath = window.location.pathname;
    const observer = new MutationObserver(() => {
      if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname;
        // Longer timeout for navigation to let CSS settle
        setTimeout(() => {
          initializeMermaid();
        }, 300);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
});

function initializeMermaid() {
  if (typeof mermaid !== 'undefined') {
    // Always reinitialize Mermaid to reset theme state
    // This prevents theme corruption when navigating between pages
    try {
      mermaid.initialize(MERMAID_CONFIG);
      mermaidInitialized = true;
    } catch (error) {
      console.warn("Mermaid initialization failed:", error);
    }

    // Ensure CSS has settled before processing diagrams
    ensureCSSSettled(() => {
      processMermaidDiagrams();
    });
  }
}

function ensureCSSSettled(callback) {
  // Force style recalculation to ensure CSS variables are available
  document.body.offsetHeight; // Force reflow
  
  // Use requestAnimationFrame to ensure we're after the next paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // Double RAF to ensure styles are fully computed
      callback();
    });
  });
}

function processMermaidDiagrams() {
  // Find unprocessed Mermaid diagrams
  const unprocessedDiagrams = document.querySelectorAll('.mermaid:not([data-processed="true"])');
  
  if (unprocessedDiagrams.length > 0) {
    // Convert NodeList to Array and run Mermaid on them
    const diagramsArray = Array.from(unprocessedDiagrams);
    
    // Clear any existing content to ensure clean render
    diagramsArray.forEach(diagram => {
      // Reset any previous Mermaid processing
      diagram.removeAttribute('data-processed');
      // Clear any existing SVG to force re-render
      const existingSvg = diagram.querySelector('svg');
      if (existingSvg) {
        existingSvg.remove();
      }
      // Reset any inline styles that might interfere
      diagram.style.backgroundColor = '';
      diagram.style.background = '';
    });
    
    // Force theme reapplication before rendering
    try {
      mermaid.initialize(MERMAID_CONFIG);
    } catch (error) {
      console.warn("Theme reset failed:", error);
    }
    
    // Use mermaid.run() to process the diagrams
    mermaid.run({
      nodes: diagramsArray
    }).then(() => {
      // After Mermaid has processed the diagrams, add our enhancements
      setTimeout(() => {
        enhanceMermaidDiagrams();
      }, 100);
    }).catch(error => {
      console.warn("Mermaid processing failed:", error);
      // Fallback: try to enhance anyway
      setTimeout(() => {
        enhanceMermaidDiagrams();
      }, 500);
    });
  } else {
    // No new diagrams, just enhance existing ones
    enhanceMermaidDiagrams();
  }
}

function enhanceMermaidDiagrams() {
  document.querySelectorAll(".mermaid").forEach((container, index) => {
    const svg = container.querySelector("svg");
    if (!svg || container.dataset.enhanced) return;

    // Mark as enhanced to avoid double-processing
    container.dataset.enhanced = "true";

    try {
      // Create wrapper for positioning controls
      const wrapper = document.createElement("div");
      wrapper.className = "mermaid-wrapper";
      wrapper.style.cssText = `
        position: relative;
        overflow: hidden;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        background: white;
        margin: 1rem 0;
      `;

      // Replace original container with wrapper
      container.parentNode.insertBefore(wrapper, container);
      wrapper.appendChild(container);

      // Create controls container
      const controls = document.createElement("div");
      controls.className = "mermaid-controls";
      controls.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 999;
        display: flex;
        gap: 4px;
        opacity: 0.8;
        transition: opacity 0.3s ease;
      `;

      // Fullscreen button only
      const fullscreenBtn = createControlButton("⛶", "Fullscreen", () => {
        toggleFullscreen(wrapper);
      });

      // Add only fullscreen button to controls
      controls.appendChild(fullscreenBtn);
      wrapper.appendChild(controls);

      // Show controls on hover
      wrapper.addEventListener("mouseenter", () => {
        controls.style.opacity = "1";
      });

      wrapper.addEventListener("mouseleave", () => {
        controls.style.opacity = "0.8";
      });

      // Handle fullscreen changes
      document.addEventListener("fullscreenchange", () => {
        if (document.fullscreenElement === wrapper) {
          // Let CSS handle fullscreen styling, just ensure basic properties
          wrapper.style.cssText += `
            background: white;
            border: none;
            margin: 0;
            height: 100vh;
            width: 100vw;
            padding: 20px;
            box-sizing: border-box;
          `;
          // Remove restrictive styles from container and SVG
          container.style.cssText = `
            width: 100%;
            height: 100%;
            background: white;
            overflow: auto;
          `;
          // Let the SVG scale naturally, remove size constraints
          svg.style.cssText = `
            background: white;
            width: auto;
            height: auto;
            max-width: none;
            max-height: none;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          `;
        } else {
          // Reset styles when exiting fullscreen
          wrapper.style.cssText = `
            position: relative;
            overflow: hidden;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background: white;
            margin: 1rem 0;
          `;
          container.style.cssText = "";
          svg.style.cssText = "";
        }
      });

    } catch (error) {
      console.warn("Could not enhance Mermaid diagram:", error);
    }
  });
}

function createControlButton(text, title, onClick) {
  const button = document.createElement("button");
  button.innerHTML = text;
  button.title = title;
  button.className = "mermaid-control-btn";
  button.style.cssText = `
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    border-radius: 4px;
    width: 28px;
    height: 28px;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
    user-select: none;
  `;

  button.addEventListener("mouseenter", () => {
    button.style.background = "rgba(0, 0, 0, 0.9)";
  });

  button.addEventListener("mouseleave", () => {
    button.style.background = "rgba(0, 0, 0, 0.7)";
  });

  button.addEventListener("click", onClick);
  return button;
}

function toggleFullscreen(wrapper) {
  if (!document.fullscreenElement) {
    wrapper.requestFullscreen().catch(err => {
      console.error("Error entering fullscreen:", err);
    });
  } else {
    document.exitFullscreen();
  }
}

function downloadMermaidAsPNG(container, filename) {
  console.log('Download function called with:', container, filename);
  const svg = container.querySelector('svg');
  if (!svg) {
    console.error('No SVG found in Mermaid container');
    return;
  }
  console.log('SVG found:', svg);

  try {
    // Simple method first - try canvas toDataURL
    const svgRect = svg.getBoundingClientRect();
    console.log('SVG dimensions:', svgRect);
    
    if (svgRect.width === 0 || svgRect.height === 0) {
      console.error('SVG has zero dimensions');
      return;
    }

    // Clone and prepare SVG
    const svgClone = svg.cloneNode(true);
    svgClone.setAttribute('width', svgRect.width);
    svgClone.setAttribute('height', svgRect.height);
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = svgRect.width * 2; // 2x for quality
    canvas.height = svgRect.height * 2;
    ctx.scale(2, 2);

    // Serialize SVG
    const serializer = new XMLSerializer();
    const svgData = serializer.serializeToString(svgClone);
    console.log('SVG data length:', svgData.length);

    // Create image
    const img = new Image();
    
    img.onload = function() {
      console.log('Image loaded successfully');
      
      // Fill white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, svgRect.width, svgRect.height);
      
      // Draw image
      ctx.drawImage(img, 0, 0, svgRect.width, svgRect.height);
      
      try {
        // Try canvas.toBlob first
        canvas.toBlob(function(blob) {
          if (blob) {
            console.log('Blob created, size:', blob.size);
            downloadBlob(blob, filename + '.png');
          } else {
            console.error('Failed to create blob, trying fallback');
            // Fallback to dataURL
            const dataURL = canvas.toDataURL('image/png');
            downloadDataURL(dataURL, filename + '.png');
          }
        }, 'image/png');
      } catch (blobError) {
        console.error('toBlob failed, using dataURL fallback:', blobError);
        // Fallback to dataURL
        const dataURL = canvas.toDataURL('image/png');
        downloadDataURL(dataURL, filename + '.png');
      }
    };
    
    img.onerror = function(error) {
      console.error('Image load failed:', error);
      alert('Failed to load SVG for download. Please try again.');
    };
    
    // Convert SVG to data URL
    const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    console.log('Setting image source...');
    img.src = svgDataUrl;
    
  } catch (error) {
    console.error('Error in download function:', error);
    alert('Download failed: ' + error.message);
  }
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  console.log('Download triggered via blob');
}

function downloadDataURL(dataURL, filename) {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  console.log('Download triggered via dataURL');
}

// Re-enhance diagrams when content changes (for dynamic content)
if (window.MutationObserver) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        setTimeout(() => {
          enhanceMermaidDiagrams();
        }, 100);
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
} 