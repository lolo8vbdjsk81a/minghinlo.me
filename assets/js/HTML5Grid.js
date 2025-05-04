/**
 * 2D HTML5Grid Class 2.0
 * Desmos/GeoGebra-like Grid Class
 * 
 * The main reason for this update is that in 1.0, it was too complex to implement animations
 * This new version is redesigned to be more modular and extensible.
 * Hope to follow the SOLID principles
 */

/**
 * Creates an instance of Grid.
 *
 * Reference:
 * 1. https://usefulangle.com/post/19/html5-canvas-tutorial-how-to-draw-graphical-coordinate-system-with-grids-and-axis
 * 2. https://stackoverflow.com/questions/66736000/how-can-i-make-infinite-grid-with-canvas
 * 3. https://stackoverflow.com/questions/14880601/translating-between-cartesian-and-screen-coordinates
 * 4. https://stackoverflow.com/questions/43388716/the-correct-way-to-graph-of-a-function-on-html5-canvas
 * 5. https://stackoverflow.com/questions/127095/what-is-the-preferred-method-of-commenting-javascript-objects-and-methods
 * 6. https://stackoverflow.com/questions/13488957/interpolate-from-one-color-to-another
 * 7. https://ragingnexus.com/creative-code-lab/experiments/algorithms-marching-squares/
 */

/**
 * BaseCanvasManager class
 * Almost every other class composites this class
 * This class provides many shared fields and methods for other classes
 * We put the most common fields and helper methods here
 *
 */ 
class BaseCanvasManager {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error("Failed to get 2D rendering context.");
        }

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.offset = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
        this.scale = 80;
        this.left = 0;
        this.right = 0;
        this.top = 0;
        this.bottom = 0;
        this.interval = 1;
        
        // Grid specific fields
        this.decimalPlaces = 0;
        this.digits = 0;

        // Background color
        this.backgroundColor = "#ffffff"; // Default white
    }

    // color in string
    setCanvasBackground(color) {
        this.backgroundColor = color;
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Converts screen coordinates to world (Cartesian) coordinates.
     * f: screen(x, y) -> world(x, y), where x, y ∈ R
     * We also have to calculate the transformed coordinates if user has applied a linear transformation
     *
     * @protected
     * @param {number} x - The x-coordinate on the screen (pixels).
     * @param {number} y - The y-coordinate on the screen (pixels).
     * @returns {{x: number, y: number}} The corresponding world coordinates.
     */
    _screenToWorld(x, y) {
        return {
            x: (x - this.offset.x) / this.scale,
            y: (this.offset.y - y) / this.scale,
        };
    }

    /**
     * Converts world (Cartesian) coordinates to screen coordinates.
     * f: world(x, y) -> screen(x, y), where x, y ∈ R
     *
     * @protected
     * @param {number} x - The x-coordinate in the world.
     * @param {number} y - The y-coordinate in the world.
     * @returns {{x: number, y: number}} The corresponding world coordinates.
     */
    _worldToScreen(x, y) {
        return {
            x: x * this.scale + this.offset.x,
            y: this.offset.y - y * this.scale,
        };
    }

    /**
     * Snap a real number to the nearest multiple of the interval.
     * f: R -> Q
     * 
     * @protected
     * @param {number} real - The real number to snap.
     * @returns {number} The snapped number.
     */ 
    _snapToNum(real) {
        if (real === 0) return 0;

        const sign = Math.sign(real); // Get the sign of the input
        const absReal = Math.abs(real); // Get the absolute value of the input
        const snapped = Math.round(absReal / this.interval) * this.interval;

        return snapped * sign;
    }

    /**
     * Updates the grid's interval and the decimal places needed (when zooming in) based on the current scale.
     * Logarithmic approach to find "nice" intervals.
     *
     * @protected
     */
    _updateIntervalAndDecimal() {
        if (this.scale <= 0) { return 1; } // scale must be positive

        const k = 400;  // reference value (change this value to draw more/less grid lines)
        const rawInterval = k / this.scale;

        const exponent = Math.floor(Math.log10(rawInterval));
        const magnitude = Math.pow(10, exponent);
        const normalizedStep = rawInterval / magnitude; // Normalize scale to [1, 10)

        // Notice: normalizedStep is not linear
        let multiplier;
        if (normalizedStep < 1.5) {
            multiplier = 1;
        } else if (normalizedStep < 4.8) {
            multiplier = 2;
        } else {
            multiplier = 5;
        }
        
        let interval = multiplier * magnitude;
        
        // Rounding Mechanism to Prevent Long Decimals Labels
        // Determine decimal places based on magnitude
        let decimalPlaces = 0;
        let digits = 0;

        if (magnitude < 1) {
            decimalPlaces = Math.abs(Math.floor(Math.log10(magnitude)));
            interval = parseFloat(interval.toFixed(decimalPlaces));
        }
        if (magnitude >= 1) {
            digits = Math.floor(Math.log10(magnitude)) + 1;
        }
        
        this.interval = interval;
        this.decimalPlaces = decimalPlaces;
        this.digits = digits;
    }

    /**
     * Function to update the four boundary variables (real numbers) when panning or zooming.
     *
     * @protected
     */
    _updateAndReturnBoundaries() {
        // Using screenToWorld() to get the cartesian coordinates on top-left and bottom-right
        const topLeft = this._screenToWorld(0, 0);
        const bottomRight = this._screenToWorld(this.canvas.width, this.canvas.height);
        // Boundaries in cartesian coordinates
        this.left = topLeft.x;
        this.right = bottomRight.x;
        this.top = topLeft.y;
        this.bottom = bottomRight.y;
    }

    ////////// Public Methods //////////
    resetOffsetAndScale() {
        this.offset = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
        this.scale = 80;
    }
}


class CanvasGridManager{
    constructor(base) {
        // Composition: BaseCanvasManager
        this.canvasBase = base
    }

    /**
     * Draw secondary grid lines, which are 1/5 of the primary grid lines.
     * Drawn in light gray color.
     *
     * @private
     */
    _drawSecondaryGrid(color) {
        this.canvasBase.ctx.beginPath();
        this.canvasBase.ctx.lineWidth = 2;
        this.canvasBase.ctx.strokeStyle = color;

        // The interval/3 is just a offset
        let left = this.canvasBase._snapToNum(this.canvasBase.left - this.canvasBase.interval / 3);
        let bottom = this.canvasBase._snapToNum(this.canvasBase.bottom - this.canvasBase.interval / 3);

        // Secondary horizontal grid lines
        for (let y = bottom; y <= this.canvasBase.top; y += this.canvasBase.interval / 5) {
            const screenY = this.canvasBase._worldToScreen(0, y).y;
            this.canvasBase.ctx.moveTo(0, screenY);
            this.canvasBase.ctx.lineTo(this.canvasBase.canvas.width, screenY);
        }

        // Secondary vertical grid lines
        for (let x = left; x <= this.canvasBase.right; x += this.canvasBase.interval / 5) {
            const screenX = this.canvasBase._worldToScreen(x, 0).x;
            this.canvasBase.ctx.moveTo(screenX, 0);
            this.canvasBase.ctx.lineTo(screenX, this.canvasBase.canvas.height);
        }
        this.canvasBase.ctx.stroke();
    }

    /**
     * Draw primary grid lines, which are multiples of the label interval.
     * Drawn in darker color.
     * It also draws the transformed grid in a contrasting color if user has applied a linear transformation.
     *
     * @private
     */
    _drawPrimaryGrid(color) {
        this.canvasBase.ctx.beginPath();
        this.canvasBase.ctx.lineWidth = 2;
        this.canvasBase.ctx.strokeStyle = color;

        let left = this.canvasBase._snapToNum(this.canvasBase.left);
        let bottom = this.canvasBase._snapToNum(this.canvasBase.bottom);

        // Primary horizontal grid lines
        for (let y = bottom; y <= this.canvasBase.top; y += this.canvasBase.interval) {
            // Drawing standard grid lines
            const screenY = this.canvasBase._worldToScreen(0, y).y;
            this.canvasBase.ctx.moveTo(0, screenY);
            this.canvasBase.ctx.lineTo(this.canvasBase.canvas.width, screenY);
        }

        // Primary vertical grid lines
        for (let x = left; x <= this.canvasBase.right; x += this.canvasBase.interval) {
            // Drawing standard grid lines
            const screenX = this.canvasBase._worldToScreen(x, 0).x;
            this.canvasBase.ctx.moveTo(screenX, 0);
            this.canvasBase.ctx.lineTo(screenX, this.canvasBase.canvas.height);
        }
        this.canvasBase.ctx.stroke();
    }

    /**
     * Draw the x and y axes.
     * Drawn in black color.
     *
     * @private
     */
    _drawAxes(color) {
        this.canvasBase.ctx.beginPath();
        this.canvasBase.ctx.lineWidth = 3;
        this.canvasBase.ctx.strokeStyle = color;
        // x-axis
        this.canvasBase.ctx.moveTo(0, this.canvasBase.offset.y);
        this.canvasBase.ctx.lineTo(this.canvasBase.canvas.width, this.canvasBase.offset.y);
        // y-axis
        this.canvasBase.ctx.moveTo(this.canvasBase.offset.x, 0);
        this.canvasBase.ctx.lineTo(this.canvasBase.offset.x, this.canvasBase.canvas.height);
        this.canvasBase.ctx.stroke();
    }

    /**
     * Draw the labels on the x and y axes.
     * Drawn in black color.
     * 
     * @private
     */
    _drawLabels(color) {
        this.canvasBase.ctx.fillStyle = color;
        this.canvasBase.ctx.font = '30px Arial';
        this.canvasBase.ctx.lineWidth = 1;
        
        // Draw 0
        this.canvasBase.ctx.textAlign = 'right';
        this.canvasBase.ctx.fillText(0, this.canvasBase.offset.x - 5, this.canvasBase.offset.y + 25);

        let niceLeft = this.canvasBase._snapToNum(this.canvasBase.left);
        let niceBottom = this.canvasBase._snapToNum(this.canvasBase.bottom);
        
        // Notice: if you scroll too far in one axis, the labels on that axis will not change
        // this is a safety mechanism to prevent crashing from too many decimal places

        // Draw x-axis labels
        for (let x = niceLeft; x <= this.canvasBase.right; x += this.canvasBase.interval) {
            // Fix JS floating point error
            x = parseFloat(x.toFixed(this.canvasBase.decimalPlaces));
            // Convert x to engineering notation if too large or too small
            let labelX = (this.canvasBase.digits >= 7 || this.canvasBase.decimalPlaces >= 7) ? x.toExponential(2) : x;
            if (x === 0) continue;
            this.canvasBase.ctx.textAlign = 'center';
            // Draw x-axis labels on the side if not in the view
            const xAxisLabelPos = this.canvasBase._worldToScreen(x,0);
            if (this.canvasBase.top < 0) {
                this.canvasBase.ctx.fillText(labelX, xAxisLabelPos.x, 25);
            } else if (this.canvasBase.bottom > 0) {
                this.canvasBase.ctx.fillText(labelX, xAxisLabelPos.x, this.canvasBase.canvas.height - 5);
            } else {
                this.canvasBase.ctx.fillText(labelX, xAxisLabelPos.x, xAxisLabelPos.y + 25);
            }
        }

        // Draw y-axis labels
        for (let y = niceBottom; y <= this.canvasBase.top; y += this.canvasBase.interval) {
            // Fix JS floating point error
            y = parseFloat(y.toFixed(this.canvasBase.decimalPlaces));
            // Convert x to engineering notation if too large or too small
            let labelY = (this.canvasBase.digits >= 7 || this.canvasBase.decimalPlaces >= 7) ? y.toExponential(2) : y;
            if (y === 0) continue;
            this.canvasBase.ctx.textAlign = 'right';
            // Draw y-axis labels on the side if not in the view
            const yAxisLabelPos = this.canvasBase._worldToScreen(0, y);
            if (this.canvasBase.left > 0) {
                this.canvasBase.ctx.textAlign = 'left';
                this.canvasBase.ctx.fillText(labelY, 3, yAxisLabelPos.y + 3);
            } else if (this.canvasBase.right < 0) {
                this.canvasBase.ctx.fillText(labelY, this.canvasBase.canvas.width - 5, yAxisLabelPos.y + 3);
            } else {
                this.canvasBase.ctx.fillText(labelY, yAxisLabelPos.x - 3, yAxisLabelPos.y + 10);
            }
        }
    }
}


class CanvasAnimationManager {
    constructor(base) {
        // Composition: BaseCanvasManager
        this.canvasBase = base;

        // Animation Fields
        this.T = {
            a: 1, b: 0,
            c: 0, d: 1,
        };
        this.isTransformedFlag = false;
        this.time = 0;
        this.isIntegral = false;
        this.deltaX = 1;
        this.int_a = null;
        this.int_b = null;

        // A separate canvas dedicated to animations
        this.animationCanvas = document.createElement('canvas');
        this.animationCtx = this.animationCanvas.getContext('2d');
        // Match the size of the base canvas
        this.animationCanvas.width = this.canvasBase.canvas.width;
        this.animationCanvas.height = this.canvasBase.canvas.height;
        // Style the animation canvas to layer above the base canvas
        this.animationCanvas.style.position = 'absolute';
        this.animationCanvas.style.top = '0';
        this.animationCanvas.style.left = '0';
        this.animationCanvas.style.zIndex = '10';
        this.animationCanvas.style.pointerEvents = 'none'; // Prevent events on this canvas

        // Append the animation canvas to the same parent as the base canvas
        this.canvasBase.canvas.parentNode.appendChild(this.animationCanvas);

        // Animation Fields for Animation that requires clearing the canvas
        this.isAnimating = false;
        this.animationFrameId = null;
        this.onAnimate = null;
        this.animationRan = false;
    }

    applyWorldTransformation(x, y) {
        return {
            x: this.T.a * x + this.T.b * y,
            y: this.T.c * x + this.T.d * y,
        };
    }

    /**
     * Linear transformation of the grid using a 2x2 matrix.
     * 
     * @public
     */
    setTransformation(a, b, c, d) {
        // Validation
        if ([a, b, c, d].some(val => typeof val !== 'number' || !isFinite(val))) {
            console.warn("Invalid transformation matrix values.");
            return;
        }
        this.isTransformedFlag = true;
        this.T = { a, b, c, d };
    }

    setInterpolationTime(time) {
        this.time = time;
    }

    setDrawRectanglesForIntegral(bool) {
        this.isIntegral = bool;
    }

    setDeltaX(deltaX) {
        this.deltaX = deltaX;
    }

    setLimits(a, b) {
        this.int_a = a;
        this.int_b = b;
    }

    // This is a wrapper function for animation that requires clearing the canvas every frame
    startFrameAnimation(callback) {
        // Prevent multiple animations
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.onAnimate = callback;
        
        const loop = () => {
            if (!this.isAnimating) { return; }
            // Clear only the animation canvas
            this.animationCtx.clearRect(0, 0, this.canvasBase.canvas.width, this.canvasBase.canvas.height);
            if (this.onAnimate) { this.onAnimate(this.animationCtx); }
            // Request next frame
            this.animationFrameId = requestAnimationFrame(loop);
        };

        loop();
    }

    stopFrameAnimation() {
        this.isAnimating = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.animationFrameId = null;
        this.animationCtx.clearRect(0, 0, this.animationCanvas.width, this.animationCanvas.height);
    }

    resetAnimation() {
        this.animationRan = false;
    }
}


class CanvasPlotManager {
    constructor(base, animation) {
        // Composition: BaseCanvasManager, CanvasAnimationManager
        this.canvasBase = base;
        this.animationManager = animation;

        // Plot fields
        this.functions = [];
        this.implicitFunctions = [];
        this.vectorCurves = [];
        this.scalarField = null;
        this.vectors = [];
        this.vectorField = null;
        this.dots = [];
    }

    /**
     * Checks if a function is evaluable.
     * 
     * @param {Function} func - The function to evaluate.
     * @returns {boolean} - True if the function is evaluable; otherwise false.
     */
    _isFunctionEvaluable(func) {
        try {
            const sampleInputs = Array.from({ length: func.length }, () => Math.random());
            const result = func(...sampleInputs);
            return typeof result === 'number' && isFinite(result);
        } catch (e) {
            console.error('Function evaluation error:', e);
            return false;
        }
    }

    /**
     * Help from AI and Reference
     * 
     * Logic for plotting a function on the grid.
     * While making this, I learned that desmos and geogebra are so optimised
     * I still don't know how they can plot multiple asymptotic trig functions with no lag
     * 
     * @private
     */
    _plotFunction(func, options = {}) {
        const {
            strokeStyle ="#c20000",
            lineWidth = 4,
            resolution = 30000,
            // This is our base pixel threshold. It will be scaled dynamically.
            discontinuityThreshold = 50,
            dotted = false,
            dashPattern,
            domain = null // [a, b], an array of two numbers, a and b are real numbers
        } = options;
    
        this.canvasBase.ctx.strokeStyle = strokeStyle;
        this.canvasBase.ctx.lineWidth = lineWidth;

        // This part is for dashed lines
        if (dotted) {
            // default pattern [5, 5].
            this.canvasBase.ctx.setLineDash(dashPattern ? dashPattern : [5, 5]);
        } else {
            // No dash pattern if dotted is false.
            this.canvasBase.ctx.setLineDash([]);
        }

        // Determine the world X range
        // If domain is not provided, use the screen width
        let worldStartX, worldEndX;
        if (domain && Array.isArray(domain) && domain.length === 2) {
            [worldStartX, worldEndX] = domain;
        } else {
            worldStartX = this.canvasBase._screenToWorld(0, 0).x;
            worldEndX = this.canvasBase._screenToWorld(this.canvasBase.canvas.width, 0).x;
        }

        // This implementation is much faster than the previous one
        // Old: we were evaluating the function at each pixel (or each predefined step)
        // the number of points sampled is proportional to the canvas width
        // each time the function is evaluated, it immediately draws on the canvas
        // which was the main reason for slow performance

        // This second approach samples points in Cartesian coordinates
        // New: Using a fixed resolution, the number of points sampled is constant
        // func precomputes all the points in Cartesian coordinates, then store them in an array

        // Array to store the points we will plot
        // The length of this array = resolution
        const points = [];
    
        // Calculate step size in world coordinates based on resolution
        const step = (worldEndX - worldStartX) / resolution;

        // Evaluation
        for (let worldX = worldStartX; worldX <= worldEndX; worldX += step) {
            let worldY;
            try {
                worldY = func(worldX); // Evaluate the function here !!!!
                if (typeof worldY !== "number" || !isFinite(worldY)) {
                    continue; // Skip if not valid
                }
            } catch (e) {
                continue;
            }
            const screenPoint = this.canvasBase._worldToScreen(worldX, worldY);
            if (screenPoint) {
                points.push(screenPoint);
            }
        }

        // At this point, we have all the points we want to plot
    
        // Draw the curve by connecting the points
        this.canvasBase.ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
            const { x, y } = points[i];
    
            if (i === 0) {
                this.canvasBase.ctx.moveTo(x, y); // Move to the first point
            } else {
                const prevPoint = points[i - 1];
                const distance = Math.sqrt((x - prevPoint.x) ** 2 + (y - prevPoint.y) ** 2);
    
                // Check for discontinuity
                // If distance between two points > discontinuityThreshold, start a new path
                if (distance > discontinuityThreshold) {
                    this.canvasBase.ctx.moveTo(x, y); // Start a new path
                } else {
                    this.canvasBase.ctx.lineTo(x, y); // Draw a line to the current point
                }
            }
        }
        this.canvasBase.ctx.stroke();
        // Reset the line dash (back to solid lines)
        this.canvasBase.ctx.setLineDash([]);
    }

    /**
     * Help from AI
     *
     * This is used to plot any xy-expression in the form of F(x, y) = 0
     * For example, F(x, y) = x^2 + y^2 - 1
     * Plots an implicit function F(x, y) = 0 using the Marching Squares algorithm used in contour plotting.
     *
     * @param {Function} F - The implicit function taking (x, y) and returning a number.
     */
    _plotImplicit(func, options = {}) {
        const { strokeStyle = "#c20000", lineWidth = 4, resolution = 200, discontinuityThreshold = 50 } = options;
        // If plotFunction uses resolution = 30000
        // Then, I assume plotImplicit should use resolution = sqrt(30000) = 170
    
        this.canvasBase.ctx.strokeStyle = strokeStyle;
        this.canvasBase.ctx.lineWidth = lineWidth;
    
        ////////// Marching Squares Algorithm //////////
    
        // Create a hidden grid so we can evaluate the function at each grid point
    
        // Calculate grid dimensions in world space
        const width = this.canvasBase.right - this.canvasBase.left;
        const height = this.canvasBase.top - this.canvasBase.bottom;
    
        // Determine the cell size based on the smaller dimension to ensure square cells
        const cellSize = Math.min(width, height) / resolution;
    
        const cellWidth = cellSize;
        const cellHeight = cellSize;
    
        // Calculate the number of cells needed to cover the entire canvas
        const cols = Math.ceil(width / cellWidth);
        const rows = Math.ceil(height / cellHeight);
    
        // Helper function to evaluate the scalar field at a point
        const evaluateScalarField = (x, y) => {
            try {
                const value = func(x, y);
                return isNaN(value) || !isFinite(value) ? Infinity : value;
            } catch (e) {
                return Infinity;
            }
        };
    
        // Evaluate the function at each grid point
        // Same as plotFunction, we want to evaluate the function first and store the points
        // The only difference is that we are using a 2D array to store the values
        const grid = [];
        for (let i = 0; i <= rows; i++) {
            const row = [];
            const y = this.canvasBase.top - i * cellHeight;
            for (let j = 0; j <= cols; j++) {
                const x = this.canvasBase.left + j * cellWidth;
                row.push(evaluateScalarField(x, y));
            }
            grid.push(row);
        }
    
        // Now, grid[i][j] contains the value returned by the function at the point (x, y)
    
        // Marching Squares Case: Contour line Lookup Table
        // The no. of cases to connect 4 corners of a cell is 2^4 = 16
        const lookup = {
            0: [],
            1: [[0, 3]],
            2: [[1, 0]],
            3: [[1, 3]],
            4: [[2, 1]],
            5: [[2, 1], [0, 3]],
            6: [[2, 0]],
            7: [[2, 3]],
            8: [[3, 2]],
            9: [[0, 2]],
            10: [[3, 2], [1, 0]],
            11: [[1, 2]],
            12: [[3, 1]],
            13: [[0, 1]],
            14: [[3, 0]],
            15: []
        };
    
        /**
         * Interpolate helper function
         * Input two points and their values, return the interpolated point
         */
        const interpolate = (p1, p2, v1, v2) => {
            // If v1 and v2 is the same, then it means it does not cross the contour line
            if (v1 === v2) {
                // If values are equal, return the midpoint
                return {
                  x: p1.x + (p2.x - p1.x) * 0.5,
                  y: p1.y + (p2.y - p1.y) * 0.5
                };
            }
            
            // Check for possible discontinuity
            if (Math.abs(v1 - v2) > discontinuityThreshold) {
                // Use midpoint for extreme value differences to avoid visual artifacts
                return {
                    x: p1.x + (p2.x - p1.x) * 0.5,
                    y: p1.y + (p2.y - p1.y) * 0.5
                };
            }
            
            // t is the relative position of the contour line
            const t = v1 / (v1 - v2);
            
            // Clamp t to avoid extreme interpolation that can create visual artifacts
            const clampedT = Math.max(0, Math.min(1, t));
            
            // Interpolate between the two points using t
            return {
                x: p1.x + clampedT * (p2.x - p1.x),
                y: p1.y + clampedT * (p2.y - p1.y)
            };
        };
    
        // Helper function to check if a cell has discontinuities
        const hasDiscontinuity = (i, j) => {
            // Get the values at the four corners of the cell
            const v1 = grid[i][j];         // Top-left
            const v2 = grid[i][j + 1];     // Top-right
            const v3 = grid[i + 1][j + 1]; // Bottom-right
            const v4 = grid[i + 1][j];     // Bottom-left
            
            // Check for infinite or very large values
            if (!isFinite(v1) || !isFinite(v2) || !isFinite(v3) || !isFinite(v4)) {
                return true;
            }
            
            // Check for discontinuities between adjacent corners
            if (Math.abs(v1 - v2) > discontinuityThreshold ||
                Math.abs(v2 - v3) > discontinuityThreshold ||
                Math.abs(v3 - v4) > discontinuityThreshold ||
                Math.abs(v4 - v1) > discontinuityThreshold) {
                return true;
            }
            
            return false;
        };
    
        // Iterate through each cell in the grid
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                // Skip cells with discontinuities
                if (hasDiscontinuity(i, j)) {
                    continue;
                }
                
                // This part is the core of the Marching Squares algorithm
                // Every square cell has 4 corners
                // Each corner of a cell has a value, either positive or negative
                // index is a 4-bit number, its value is determined by the 4 corners
                // bitwise OR operation is used here (interesting)
                let index = 0;  // (0000) in binary
                if (grid[i][j] > 0) { index |= 1; }           // Top-left corner (First bit: 0001)
                if (grid[i][j + 1] > 0) { index |= 2; }       // Top-right corner (Second bit: 0010)
                if (grid[i + 1][j + 1] > 0) { index |= 4; }   // Bottom-right corner (Third bit: 0100)
                if (grid[i + 1][j] > 0) { index |= 8; }       // Bottom-left corner (Fourth bit: 1000)
    
                // Retrieve the line segments for this cell
                const segments = lookup[index];
                if (!segments || segments.length === 0) continue;
    
                // Cartesian coordinates (x,y) of square cell four corners
                const x = this.canvasBase.left + j * cellWidth;
                const y = this.canvasBase.top - i * cellHeight;
    
                const topLeft = { x: x, y: y };
                const topRight = { x: x + cellWidth, y: y };
                const bottomRight = { x: x + cellWidth, y: y - cellHeight };
                const bottomLeft = { x: x, y: y - cellHeight };
    
                // Define the interpolated points on each edge
                // Any two interpolated points will form a line segment, which separates the cell into two parts
                // The line segment separates the corner with positive value and the corner with negative value
                // The line segment is the contour line
                const edges = {
                    0: interpolate(topLeft, topRight, grid[i][j], grid[i][j + 1]),
                    1: interpolate(topRight, bottomRight, grid[i][j + 1], grid[i + 1][j + 1]),
                    2: interpolate(bottomRight, bottomLeft, grid[i + 1][j + 1], grid[i + 1][j]),
                    3: interpolate(bottomLeft, topLeft, grid[i + 1][j], grid[i][j])
                };
    
                // Draw the line segment
                segments.forEach(segment => {
                    const [start, end] = segment;
                    const pStart = this.canvasBase._worldToScreen(edges[start].x, edges[start].y);
                    const pEnd = this.canvasBase._worldToScreen(edges[end].x, edges[end].y);
                    if (!pStart || !pEnd) { return; } // Skip if points are invalid
    
                    this.canvasBase.ctx.beginPath();
                    this.canvasBase.ctx.moveTo(pStart.x, pStart.y);
                    this.canvasBase.ctx.lineTo(pEnd.x, pEnd.y);
                    this.canvasBase.ctx.stroke();
                });
            }
        }
    }

    // Help from AI
    // Draw the scalar field as a heatmap
    _plotScalarField(func) {
        const left = this.canvasBase._snapToNum(this.canvasBase.left - this.canvasBase.interval);
        const bottom = this.canvasBase._snapToNum(this.canvasBase.bottom - this.canvasBase.interval);
    
        const scalarValues = [];
        const minScalar = -20; // Define fixed range
        const maxScalar = 20;  // Define fixed range
    
        const cellSizeX = this.canvasBase.interval / 15;
        const cellSizeY = this.canvasBase.interval / 15;
    
        for (let i = bottom; i <= this.canvasBase.top; i += cellSizeY) {
            const row = [];
            for (let j = left; j <= this.canvasBase.right; j += cellSizeX) {
                const x = j;
                const y = i;
                const value = func(x, y);
                row.push(value);
            }
            scalarValues.push(row);
        }
    
        function scalarToColor(value, minScalar, maxScalar) {
            const normalized = Math.max(0, Math.min(1, (value - minScalar) / (maxScalar - minScalar))); // Clamp [0, 1]
            const hue = (1 - normalized) * 255;
            return `hsl(${hue}, 65%, 65%)`;
        }
    
        for (let i = bottom; i < this.canvasBase.top; i += cellSizeY) {
            for (let j = left; j < this.canvasBase.right; j += cellSizeX) {
                const x = j;
                const y = i;
    
                const rowIndex = Math.ceil((y - bottom) / cellSizeY);
                const colIndex = Math.ceil((x - left) / cellSizeX);
    
                if (rowIndex >= 0 && rowIndex < scalarValues.length && colIndex >= 0 && colIndex < scalarValues[rowIndex].length) {
                    const value = scalarValues[rowIndex][colIndex];
                    const color = scalarToColor(value, minScalar, maxScalar);
    
                    const { x: screenX, y: screenY } = this.canvasBase._worldToScreen(x, y);
                    const { x: screenX2, y: screenY2 } = this.canvasBase._worldToScreen(
                        x + cellSizeX,
                        y + cellSizeY
                    );
    
                    this.canvasBase.ctx.fillStyle = color;
                    this.canvasBase.ctx.fillRect(screenX, screenY, screenX2 - screenX, screenY2 - screenY);
                }
            }
        }
    }

    /**
     * Function to plot a single 2D vector on the grid.
     * Takes a custom ctx so you can plot on animation canvas or main canvas.
     * 
     * @private
     */
    _plotVector(vec, ctx, options = {}) {
        const { strokeStyle = "#DC143C", lineWidth = 4 } = options;
    
        // Convert input world coordinates to screen coordinates
        const { x: x1, y: y1 } = this.canvasBase._worldToScreen(vec.x1, vec.y1);
        const { x: x2, y: y2 } = this.canvasBase._worldToScreen(vec.x2, vec.y2);
    
        // Draw the line
        ctx.beginPath();
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.lineCap = "round";
        ctx.moveTo(x1, y1); // Start point
        ctx.lineTo(x2, y2); // End point
        ctx.stroke();
    
        // Draw the arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x2, y2); // Move to the end point
        ctx.lineTo(
            x2 - Math.cos(angle - Math.PI / 6) * 10,
            y2 - Math.sin(angle - Math.PI / 6) * 10
        );
        ctx.moveTo(x2, y2); // Move to the end point again
        ctx.lineTo(
            x2 - Math.cos(angle + Math.PI / 6) * 10,
            y2 - Math.sin(angle + Math.PI / 6) * 10
        );
        ctx.stroke();
    }

    /**
     * Function to plot an interpolated 2D position vector on the grid over time.
     * endVec is the interpolated (or transformed) vector.
     * 
     * @private
     */
    _plotInterpolatePositionVector(startVec, endVec, options = {}) {
        const { strokeStyle = "#c20000", lineWidth = 4 } = options;
    
        // Interpolation factor (0 to 1) from animation manager.
        const t = this.animationManager.time;
        const interpolatedX = startVec.x + (endVec.x - startVec.x) * t;
        const interpolatedY = startVec.y + (endVec.y - startVec.y) * t;
    
        // draw interpolated vector
        this._plotVector(
            { x1: 0, y1: 0, x2: interpolatedX, y2: interpolatedY },
            this.canvasBase.ctx,
            { strokeStyle, lineWidth }
        );
    }

    /**
     * Help from AI
     * Plot a vector field on the grid.
     * Notice: each vector on vector field is not a object, the whole field is a function of x and y
     * 
     * @private
     * @param {Function} vectorFunction - Input two functions of f(x,y) = { x: f1(x,y), y: f2(x,y) }
     * @param {Object} options - Options includes: { minMagnitude, maxMagnitude, lineWidth }
     */
    _plotVectorField(vectorFunction, options = {}) {
        const { minMagnitude = 0.1, maxMagnitude = 20000, lineWidth = 5 } = options;
        this.canvasBase.ctx.lineWidth = lineWidth;
        this.canvasBase.ctx.lineCap = 'round';

        // Private function only used in plotting vector field
        // It is used to interpolate between two colors, making a gradient effect
        // Each color is an array of 3 numbers representing RGB values
        // color1 is the start, color2 is the end
        // Here we are following the interpolation formula from the reference above
        // fraction is a number between 0 and 1

        const interpolateColor = (color1, color2, fraction) => {
            const color1Copy = color1.slice();  // Copy the start color rgb array
            for (let i = 0; i < 3; i++) {
                // Linear interpolation between two colors
                color1Copy[i] = Math.round(color1Copy[i] + fraction * (color2[i] - color1Copy[i]));
            }
            return `rgb(${color1Copy[0]}, ${color1Copy[1]}, ${color1Copy[2]})`;
        };
        
        // Colors for the gradient
        const colorStart = [25, 255, 255]; // Light Blue
        const colorEnd = [255, 0, 0];     // Dark Red

        // Same thing as drawing grid lines, we want to draw vectors at each grid point
        const left = this.canvasBase._snapToNum(this.canvasBase.left - this.canvasBase.interval / 3);
        const bottom = this.canvasBase._snapToNum(this.canvasBase.bottom - this.canvasBase.interval / 3);
        const right = this.canvasBase._snapToNum(this.canvasBase.right + this.canvasBase.interval / 3);
        const top = this.canvasBase._snapToNum(this.canvasBase.top + this.canvasBase.interval / 3);

        const step = this.canvasBase.interval / 5; // 5 grid lines per interval

        // Loop through the visible grid from left to right and bottom to top
        // +1 is just to make sure we draw the last grid line
        for (let x = left; x <= right; x += step) {
            for (let y = bottom; y <= top; y += step) {

                // Similar to plotting function which we evaluate y = f(x)
                // vector = { x: number, y: number }
                // vectorFunction = { x: f1(x, y), y: f2(x, y) }
                // Mathematically, we should name the input as (i, j) instead of (x, y)
                // But whatever
                const vector = vectorFunction(x, y);

                // Check if the vector is valid
                if (vector && vector.x !== undefined && vector.y !== undefined) {
                    // Magnitude of the vector ||v||
                    const magnitude = Math.sqrt(vector.x ** 2 + vector.y ** 2);

                    if (magnitude === 0) {
                        // Draw a grey dot for zero magnitude
                        const { x: screenX, y: screenY } = this.canvasBase._worldToScreen(x, y);
                        this.canvasBase.ctx.fillStyle = 'rgb(50, 255, 255)';
                        this.canvasBase.ctx.beginPath();
                        this.canvasBase.ctx.arc(screenX, screenY, 5, 0, 2 * Math.PI); // Radius of 5
                        this.canvasBase.ctx.fill();
                        continue; // Skip the rest of the loop for this point
                    }

                    // Normalize, or find the unit vector
                    // v_hat = v / ||v||
                    const xHat = magnitude !== 0 ? (vector.x / magnitude) : 0;
                    const yHat = magnitude !== 0 ? (vector.y / magnitude) : 0;

                    // Scale the normalized vector to a fixed length
                    // div by scale makes the vector length be always the same when zooming
                    const xHatScaled = xHat / this.canvasBase.scale * 35;
                    const yHatScaled = yHat / this.canvasBase.scale * 35;

                    // Calculate the end point of the vector
                    const endX = x + xHatScaled;
                    const endY = y + yHatScaled;

                    // Convert to screen coordinates for plotting as usual
                    const { x: screenX, y: screenY } = this.canvasBase._worldToScreen(x, y);
                    const { x: endScreenX, y: endScreenY } = this.canvasBase._worldToScreen(endX, endY);

                    // For gradient color effect
                    // Ensure we don't take the log(0) by adding a small number
                    const safeMagnitude = magnitude + 1;
                    const safeMin = minMagnitude + 1;
                    const safeMax = maxMagnitude + 1;

                    // Logarithmic interpolation factor, it makes the color change more smoothly when zoom
                    const logFactor = (Math.log(safeMagnitude) - Math.log(safeMin)) / (Math.log(safeMax) - Math.log(safeMin));
                    const clampedFactor = Math.max(0, Math.min(1, logFactor)); // Clamp the factor in [0, 1]

                    // Dynamic color based on the magnitude of the vector
                    this.canvasBase.ctx.strokeStyle = interpolateColor(colorStart, colorEnd, clampedFactor);

                    // Draw the vector
                    // Notice: we put both beginPath() and stroke() inside the loop
                    // This is because we want to change the color of each vector
                    this.canvasBase.ctx.beginPath();
                    // Draw the line
                    this.canvasBase.ctx.moveTo(screenX, screenY);
                    this.canvasBase.ctx.lineTo(endScreenX, endScreenY);
                    // Draw the arrowhead (same logic as plotVector())
                    const angle = Math.atan2(endScreenY - screenY, endScreenX - screenX);
                    this.canvasBase.ctx.moveTo(endScreenX, endScreenY);
                    this.canvasBase.ctx.lineTo(
                        endScreenX - Math.cos(angle - Math.PI / 6) * 10,
                        endScreenY - Math.sin(angle - Math.PI / 6) * 10
                    );
                    this.canvasBase.ctx.moveTo(endScreenX, endScreenY);
                    this.canvasBase.ctx.lineTo(
                        endScreenX - Math.cos(angle + Math.PI / 6) * 10,
                        endScreenY - Math.sin(angle + Math.PI / 6) * 10
                    );
                    this.canvasBase.ctx.stroke();
                }
            }
        }
    }

    /**
     * Draw a curve defined by a vector function.
     * Used in line integrals and vector calculus.
     * This is so much simpler than plotImplicit() omg.
     * Input a vector curve: r(t) = { x: f1(t), y: f2(t) }
     * Input the range of t: { start: number, end: number }
     * Example Usage: drawVectorCurve({ x: t => Math.cos(t), y: t => Math.sin(t) }, { start: 0, end: 2 * Math.PI })
     * 
     * @private
     */
    _plotVectorCurve(vectorFunction, tRange, options = {}) {
        const { 
            strokeStyle = "red", 
            lineWidth = 4, 
            resolution = 15000, 
            discontinuityThreshold = 15000, 
            animationSpeed = 100 
        } = options;
    
        const points = [];
        const tStep = (tRange.end - tRange.start) / resolution;
    
        // Generate points along the curve
        for (let t = tRange.start; t <= tRange.end; t += tStep) {
            const x = vectorFunction.x(t);
            const y = vectorFunction.y(t);
            points.push({ x, y });
        }
    
        this.canvasBase.ctx.beginPath();
        this.canvasBase.ctx.strokeStyle = strokeStyle;
        this.canvasBase.ctx.lineWidth = lineWidth;
    
        for (let i = 0; i < points.length; i++) {
            const { x, y } = points[i];
            const { x: screenX, y: screenY } = this.canvasBase._worldToScreen(x, y);
    
            if (i === 0) {
                this.canvasBase.ctx.moveTo(screenX, screenY); // Start the path
            } else {
                const prevPoint = points[i - 1];
                const { x: prevScreenX, y: prevScreenY } = this.canvasBase._worldToScreen(prevPoint.x, prevPoint.y);
    
                const distance = Math.sqrt((screenX - prevScreenX) ** 2 + (screenY - prevScreenY) ** 2);
    
                // Handle discontinuities
                if (distance > discontinuityThreshold) {
                    this.canvasBase.ctx.moveTo(screenX, screenY); // Start a new subpath
                } else {
                    this.canvasBase.ctx.lineTo(screenX, screenY); // Continue the path
                }
            }
        }
        this.canvasBase.ctx.stroke();
    
        this.animationManager.animationCtx.clearRect(0, 0, this.animationManager.animationCanvas.width, this.animationManager.animationCanvas.height);

        // Animate the follow vector on the animation canvas (only if it hasn't been animated yet)
        try {
            if (!this.animationManager.animationRan) {
                this.animationManager.animationRan = true;
                let currentPointIndex = 0;
                let followVector = { x1: 0, y1: 0, x2: 0, y2: 0 };
    
                this.animationManager.startFrameAnimation(() => {
                    this.animationManager.animationCtx.beginPath();
                    this.animationManager.animationCtx.strokeStyle = strokeStyle;
                    this.animationManager.animationCtx.lineWidth = lineWidth;
    
                    // Draw points incrementally
                    for (let i = 0; i < animationSpeed && currentPointIndex < points.length; i++, currentPointIndex++) {
                        const { x, y } = points[currentPointIndex];
                        const { x: screenX, y: screenY } = this.canvasBase._worldToScreen(x, y);
    
                        if (currentPointIndex === 0) {
                            this.animationManager.animationCtx.moveTo(screenX, screenY);
                        } else {
                            const prevPoint = points[currentPointIndex - 1];
                            const { x: prevScreenX, y: prevScreenY } = this.canvasBase._worldToScreen(prevPoint.x, prevPoint.y);
    
                            const distance = Math.sqrt((screenX - prevScreenX) ** 2 + (screenY - prevScreenY) ** 2);
    
                            if (distance > discontinuityThreshold) {
                                this.animationManager.animationCtx.moveTo(screenX, screenY);
                            } else {
                                this.animationManager.animationCtx.lineTo(screenX, screenY);
                            }
                        }
    
                        // Update follow vector
                        followVector.x2 = x;
                        followVector.y2 = y;
                    }
    
                    // Stroke the current frame on the animation canvas
                    this.animationManager.animationCtx.stroke();
    
                    // Optionally draw the follow vector
                    this._plotVector(followVector, this.animationManager.animationCtx);
    
                    // Stop the animation if all points are drawn
                    if (currentPointIndex >= points.length) {
                        this.animationManager.stopFrameAnimation();
                    }
                });
            }
        } catch (e) {
            console.error("Error in _plotVectorCurve Animation:", e);
        }
    }

    _plotDot(x, y, options = {}) {
        const { fillStyle = "red", radius = 10 } = options;
        const { x: screenX, y: screenY } = this.canvasBase._worldToScreen(x, y);
        this.canvasBase.ctx.fillStyle = fillStyle;
        this.canvasBase.ctx.beginPath();
        this.canvasBase.ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI);
        this.canvasBase.ctx.fill();
    }

    /**
     * Simple function to run plot() on every function in the functions array.
     * 
     * @private
     */ 
    _drawFunctions() {
        if (this.functions.length === 0) return;
        this.functions.forEach(({ func, options }) => {
            this._plotFunction(func, options);
        });
    }

    _drawImplicitFunctions() {
        if (this.implicitFunctions.length === 0) return;
        this.implicitFunctions.forEach(({ func, options }) => {
            this._plotImplicit(func, options);
        });
    }

    _drawScalarField() {
        if (this.scalarField === null) return;
        this._plotScalarField(this.scalarField.func);
    }

    // Vector can be a single vector (static)
    // Or a pair of vectors from start to end (interpolated)
    _drawVectors(ctx = this.canvasBase.ctx) {
        if (this.vectors.length === 0) return;
    
        this.vectors.forEach(({ vec, options }) => {
            if (options.interpolate) {
                // Handle interpolated vector
                const { start, end } = vec;
                this._plotInterpolatePositionVector(start, end, options);
            } else {
                // Handle single vector
                const { x1, y1, x2, y2 } = vec;
                this._plotVector({ x1, y1, x2, y2 }, ctx, options);
            }
        });
    }

    _drawVectorField() {
        if (this.vectorField === null) return;
        this._plotVectorField(this.vectorField.func, this.vectorField.options);
    }

    _drawVectorCurves() {
        if (this.vectorCurves.length === 0) return;
        this.vectorCurves.forEach(({ vectorFunction, tRange, options }) => {
            this._plotVectorCurve(vectorFunction, tRange, options);
        });
    }

    /**
     * Draw the basis vectors of the transformation matrix T.
     * Does not create any new vectors object in the vectors array.
     * Used with matrix transformation
     * Controlled by slider which changes the time variable
     * 
     * @private
     */
    _drawBasisVectorsAndTransformation() {
        // Basis vectors
        const basis1 = { x1: 0, y1: 0, x2: 1, y2: 0 }; // Unit vector along the x-axis
        const basis2 = { x1: 0, y1: 0, x2: 0, y2: 1 }; // Unit vector along the y-axis

        // Transformed basis
        const transformedBasis1 = { x1: 0, y1: 0, x2: this.animationManager.T.a, y2: this.animationManager.T.c };
        const transformedBasis2 = { x1: 0, y1: 0, x2: this.animationManager.T.b, y2: this.animationManager.T.d };

        // Interpolate the basis vectors to transformed basis vectors
        const interpolateVector1 = {
            x1: 0,
            y1: 0,
            x2: basis1.x2 + (transformedBasis1.x2 - basis1.x2) * this.animationManager.time,
            y2: basis1.y2 + (transformedBasis1.y2 - basis1.y2) * this.animationManager.time
        };
        const interpolateVector2 = {
            x1: 0,
            y1: 0,
            x2: basis2.x2 + (transformedBasis2.x2 - basis2.x2) * this.animationManager.time,
            y2: basis2.y2 + (transformedBasis2.y2 - basis2.y2) * this.animationManager.time
        };

        // Plot the interpolated basis vectors
        this._plotVector(interpolateVector1, this.canvasBase.ctx, { strokeStyle: "#00BFFF", lineWidth: 4 });
        this._plotVector(interpolateVector2, this.canvasBase.ctx, { strokeStyle: "#00BFFF", lineWidth: 4 });
    }

    /**
     * Determinant is the area of the parallelogram formed by the basis vectors
     * So we draw the area of the parallelogram
     * 
     */
    _drawDeterminant() {
        // Same thing as drawBasisVectorsAndTransformation()
        // Interpolate the basis vectors to transformed basis vectors
        const basis1 = { x: 1, y: 0 }; // Unit vector along the x-axis (i-hat)
        const basis2 = { x: 0, y: 1 }; // Unit vector along the y-axis (j-hat)
        const transformedBasis1 = { x: this.animationManager.T.a, y: this.animationManager.T.c }; // Transformed i-hat
        const transformedBasis2 = { x: this.animationManager.T.b, y: this.animationManager.T.d }; // Transformed j-hat
        const interpolatedBasis1 = {
            x: basis1.x + (transformedBasis1.x - basis1.x) * this.animationManager.time,
            y: basis1.y + (transformedBasis1.y - basis1.y) * this.animationManager.time
        };
        const interpolatedBasis2 = {
            x: basis2.x + (transformedBasis2.x - basis2.x) * this.animationManager.time,
            y: basis2.y + (transformedBasis2.y - basis2.y) * this.animationManager.time
        };
    
        // Calculate Parallelogram Points Based on Interpolated Vectors
        const p0 = this.canvasBase._worldToScreen(0, 0); // Origin
        const p1 = this.canvasBase._worldToScreen(interpolatedBasis1.x, interpolatedBasis1.y);
        const p2 = this.canvasBase._worldToScreen(
            interpolatedBasis1.x + interpolatedBasis2.x,
            interpolatedBasis1.y + interpolatedBasis2.y
        );
        const p3 = this.canvasBase._worldToScreen(interpolatedBasis2.x, interpolatedBasis2.y);
    
        // Step 5: Draw and Fill the Parallelogram
        this.canvasBase.ctx.beginPath();
        this.canvasBase.ctx.moveTo(p0.x, p0.y);
        this.canvasBase.ctx.lineTo(p1.x, p1.y);
        this.canvasBase.ctx.lineTo(p2.x, p2.y);
        this.canvasBase.ctx.lineTo(p3.x, p3.y);
        this.canvasBase.ctx.closePath();
    
        // Set Styles
        this.canvasBase.ctx.fillStyle = "rgba(0, 0, 255, 0.3)"; // Semi-transparent blue
        this.canvasBase.ctx.strokeStyle = "rgba(0, 0, 255, 0.8)"; // Slightly more opaque blue
        this.canvasBase.ctx.lineWidth = 2;
    
        // Draw the outline and fill the parallelogram
        this.canvasBase.ctx.stroke();
        this.canvasBase.ctx.fill();
    }

    /**
     * Draw rectangles for numerical integration of the first function in the functions array.
     * Visualize Riemann sums -> Integral of f(x) dx from a to b
     * default values for a and b are the visible boundaries
     * 
     * @private
     */
    _drawRectanglesForIntegral() {
        // Width of each rectangle
        const step = this.animationManager.deltaX;
        const a = this.animationManager.int_a !== null ? this.animationManager.int_a : this.canvasBase._snapToNum(this.canvasBase.left - this.canvasBase.interval);
        const b = this.animationManager.int_b !== null ? this.animationManager.int_b : this.canvasBase._snapToNum(this.canvasBase.right + this.canvasBase.interval);

        // If deltaX is zero, fill the area under the curve
        if (step === 0) {
            // The first function in the functions array will be used
            const func = this.functions[0].func;

            // Set colors similar to those used in drawDeterminant (Semi-transparent blue)
            const fillColor = "rgba(0, 0, 255, 0.3)";
            this.canvasBase.ctx.fillStyle = fillColor;

            // Draw the filled area under the curve from left to right
            this.canvasBase.ctx.beginPath();

            // Find the first evaluable point (So it is correct for functions like ln(x) where x <= 0 is not real)
            let firstEvaluableX = null;
            for (let x = a; x <= b; x += 1 / this.canvasBase.scale) {
                const y = func(x);
                if (!isNaN(y) && isFinite(y)) {
                    firstEvaluableX = x;
                    break; // Found the first valid point
                }
            }

            // If no valid point was found, exit early
            if (firstEvaluableX === null) {
                return; // No valid points to draw
            }

            // Move to the x-axis at the first evaluable point
            const startPoint = this.canvasBase._worldToScreen(firstEvaluableX, 0);
            this.canvasBase.ctx.moveTo(startPoint.x, startPoint.y);

            let n = 0;
            // Draw along the curve
            for (let x = a; x <= b; x += 1 / this.canvasBase.scale) { // increments proportional to scale
                const y = func(x);

                if (isNaN(y) || !isFinite(y)) {
                    continue; // Skip this iteration if the value is invalid
                }

                const { x: screenX, y: screenY } = this.canvasBase._worldToScreen(x, y);
                // Check if the y-coordinate is within the canvas
                if (screenY >= 0 && screenY <= this.canvasBase.canvas.height) {
                    this.canvasBase.ctx.lineTo(screenX, screenY);
                    n++;
                } else if (screenY > this.canvasBase.canvas.height) {
                    // If below the canvas, draw horizontally to the edge of the canvas
                    this.canvasBase.ctx.lineTo(screenX, this.canvasBase.canvas.height);
                    n++;
                } else if (screenY < 0) {
                    // If above the canvas, draw horizontally to the edge of the canvas
                    this.canvasBase.ctx.lineTo(screenX, 0);
                    n++;
                }
            }
            // console.log("Number of time sampled: ", n); // Debug
            n = 0;

            // Close the path back to the x-axis
            this.canvasBase.ctx.lineTo(this.canvasBase._worldToScreen(b, 0).x, this.canvasBase._worldToScreen(b, 0).y);
            this.canvasBase.ctx.lineTo(startPoint.x, startPoint.y); // returns to the start point
            this.canvasBase.ctx.closePath();
            this.canvasBase.ctx.fill();

            return;
        }
    
        // If deltaX is not zero, draw rectangles

        // The first function in the functions array will be used
        const func = this.functions[0].func;
    
        const fillColor = "rgba(0, 0, 255, 0.3)";
        const strokeColor = "rgba(0, 0, 255, 0.8)";
    
        this.canvasBase.ctx.fillStyle = fillColor;
        this.canvasBase.ctx.strokeStyle = strokeColor;
        this.canvasBase.ctx.lineWidth = 2;
    
        for (let x = a; x < b; x += step) {
            let y = func(x);
            
            // Check if the y-coordinate is within the canvas
            // If not, make y the top or bottom of the canvas
            // This is to prevent the rectangles from going out of the canvas

            if (this.canvasBase._worldToScreen(x, y).y < 0) {
                y = this.canvasBase._screenToWorld(x, 0).y;
            } else if (this.canvasBase._worldToScreen(x, y).y > this.canvasBase.canvas.height) {
                y = this.canvasBase._screenToWorld(x, this.canvasBase.canvas.height).y;
            }

            const height = y;
            // console.log("Height: ", height); // Debug
            const width = step;
            const { x: screenX, y: screenY } = this.canvasBase._worldToScreen(x, 0);
            const { x: screenX2, y: screenY2 } = this.canvasBase._worldToScreen(x + width, height);
    
            // Draw the rectangle
            this.canvasBase.ctx.fillRect(screenX, screenY, screenX2 - screenX, screenY2 - screenY);
            this.canvasBase.ctx.strokeRect(screenX, screenY, screenX2 - screenX, screenY2 - screenY);
        }
    }

    /**
     * Using the same logic as drawPrimaryGrid, but we apply the transformation to the grid lines
     * We draw the transformed grid in a contrasting color
     * Also we use the time variable for interpolation, making a animation effect
     * 
     * @private
     */
    _drawTransformedGrid() {
        this.canvasBase.ctx.lineWidth = 2;
        this.canvasBase.ctx.strokeStyle = "#ff0000";
        
        // We choose a big offset because some transformations can strink the grid
        let left = this.canvasBase._snapToNum(this.canvasBase.left - this.canvasBase.interval * 10);
        let bottom = this.canvasBase._snapToNum(this.canvasBase.bottom - this.canvasBase.interval * 10);
        let right = this.canvasBase._snapToNum(this.canvasBase.right + this.canvasBase.interval * 10);
        let top = this.canvasBase._snapToNum(this.canvasBase.top + this.canvasBase.interval * 10);
        
        // Draw the transformed grid (same as drawPrimaryGrid)

        // Transformed primary horizontal grid lines
        for (let y = bottom; y <= top; y += this.canvasBase.interval / 5) {
            // Define start and end points
            let point1 = { x: left, y: y };
            let point2 = { x: right, y: y };
            
            // Apply the transformation to the points with the matrix T field
            const transformedPoint1 = this.animationManager.applyWorldTransformation(point1.x, point1.y);
            const transformedPoint2 = this.animationManager.applyWorldTransformation(point2.x, point2.y);

            // Linear interpolation: p(t) = p0 + (p1 - p0) * t
            const interpolatedPoint1 = {
                x: point1.x + (transformedPoint1.x - point1.x) * this.animationManager.time,
                y: point1.y + (transformedPoint1.y - point1.y) * this.animationManager.time
            };
            const interpolatedPoint2 = {
                x: point2.x + (transformedPoint2.x - point2.x) * this.animationManager.time,
                y: point2.y + (transformedPoint2.y - point2.y) * this.animationManager.time
            };

            // Convert transformed world coordinates to screen coordinates
            const screenPoint1 = this.canvasBase._worldToScreen(interpolatedPoint1.x, interpolatedPoint1.y);
            const screenPoint2 = this.canvasBase._worldToScreen(interpolatedPoint2.x, interpolatedPoint2.y);

            this.canvasBase.ctx.moveTo(screenPoint1.x, screenPoint1.y);
            this.canvasBase.ctx.lineTo(screenPoint2.x, screenPoint2.y);
        }

        // Transformed primary vertical grid lines
        for (let x = left; x <= right; x += this.canvasBase.interval / 5) {
            // Define start and end points
            let point1 = { x: x, y: bottom };
            let point2 = { x: x, y: top };
            
            // Apply the transformation to the points with the matrix T field
            const transformedPoint1 = this.animationManager.applyWorldTransformation(point1.x, point1.y);
            const transformedPoint2 = this.animationManager.applyWorldTransformation(point2.x, point2.y);

            // Linear interpolation
            const interpolatedPoint1 = {
                x: point1.x + (transformedPoint1.x - point1.x) * this.animationManager.time,
                y: point1.y + (transformedPoint1.y - point1.y) * this.animationManager.time
            };
            const interpolatedPoint2 = {
                x: point2.x + (transformedPoint2.x - point2.x) * this.animationManager.time,
                y: point2.y + (transformedPoint2.y - point2.y) * this.animationManager.time
            };

            // Convert transformed world coordinates to screen coordinates
            const screenPoint1 = this.canvasBase._worldToScreen(interpolatedPoint1.x, interpolatedPoint1.y);
            const screenPoint2 = this.canvasBase._worldToScreen(interpolatedPoint2.x, interpolatedPoint2.y);

            this.canvasBase.ctx.moveTo(screenPoint1.x, screenPoint1.y);
            this.canvasBase.ctx.lineTo(screenPoint2.x, screenPoint2.y);
        }
        this.canvasBase.ctx.stroke();
    }

    /**
     * Draw the eigenvector of the transformation matrix T.
     *
     * @private
     */
    _drawEigenvector() {
        // Get the eigenvalue and eigenvector of the transformation matrix T
        const matrixT = this.animationManager.T;
        const a = matrixT.a, b = matrixT.b, c = matrixT.c, d = matrixT.d;
    
        // Step 1: Calculate the eigenvalues
        const trace = a + d;
        const determinant = a * d - b * c;
    
        // Eigenvalues from the characteristic polynomial
        const lambda1 = (trace + Math.sqrt(trace * trace - 4 * determinant)) / 2;
        const lambda2 = (trace - Math.sqrt(trace * trace - 4 * determinant)) / 2;
    
        // Step 2: Calculate the eigenvectors and normalize them to unit vectors
        const computeEigenvector = (lambda) => {
            let x, y;
            if (b !== 0) {
                y = -(a - lambda) / b;
                x = 1;
            } else if (c !== 0) {
                x = -(d - lambda) / c;
                y = 1;
            } else {
                x = 1;
                y = 0;
            }
            const magnitude = Math.sqrt(x * x + y * y);
            return { x: x / magnitude, y: y / magnitude };
        };
    
        const eigenvectors = [
            { lambda: lambda1, vector: computeEigenvector(lambda1) },
            { lambda: lambda2, vector: computeEigenvector(lambda2) }
        ];
    
        // Step 3: Draw the eigenvector and the spans
        eigenvectors.forEach(({ lambda, vector }) => {
            // Step 3.1: Draw the span of the eigenvector
            const spanLength = 5; // Length of the span in world coordinates
            const worldSpan = {
                x1: -spanLength * vector.x,
                y1: -spanLength * vector.y,
                x2: spanLength * vector.x,
                y2: spanLength * vector.y
            };

            // Transform world coordinates to screen coordinates
            const startScreen = this.canvasBase._worldToScreen(worldSpan.x1, worldSpan.y1);
            const endScreen = this.canvasBase._worldToScreen(worldSpan.x2, worldSpan.y2);

            // Special case: Handle vertical and horizontal lines
            const isVertical = Math.abs(worldSpan.x2 - worldSpan.x1) < 1e-10;
            const isHorizontal = Math.abs(worldSpan.y2 - worldSpan.y1) < 1e-10;

            const findBoundaryIntersections = (start, end) => {
                const boundaryPoints = [];
                const canvasWidth = this.canvasBase.ctx.canvas.width;
                const canvasHeight = this.canvasBase.ctx.canvas.height;

                if (isVertical) {
                    // Vertical line: x = constant
                    boundaryPoints.push({ x: start.x, y: 0 }); // Top
                    boundaryPoints.push({ x: start.x, y: canvasHeight }); // Bottom
                } else if (isHorizontal) {
                    // Horizontal line: y = constant
                    boundaryPoints.push({ x: 0, y: start.y }); // Left
                    boundaryPoints.push({ x: canvasWidth, y: start.y }); // Right
                } else {
                    // General case: Line equation y = mx + c
                    const m = (end.y - start.y) / (end.x - start.x);
                    const c = start.y - m * start.x;

                    // Check intersections with all four canvas boundaries
                    const boundaries = [
                        { x: 0, y: c }, // Left
                        { x: canvasWidth, y: m * canvasWidth + c }, // Right
                        { x: (0 - c) / m, y: 0 }, // Top
                        { x: (canvasHeight - c) / m, y: canvasHeight } // Bottom
                    ];

                    boundaries.forEach(point => {
                        if (point.x >= 0 && point.x <= canvasWidth && point.y >= 0 && point.y <= canvasHeight) {
                            boundaryPoints.push(point);
                        }
                    });
                }

                return boundaryPoints;
            };

            const intersections = findBoundaryIntersections(startScreen, endScreen);

            // If we have two intersection points, draw the span line
            if (intersections.length === 2) {
                this.canvasBase.ctx.beginPath();
                this.canvasBase.ctx.moveTo(intersections[0].x, intersections[0].y);
                this.canvasBase.ctx.lineTo(intersections[1].x, intersections[1].y);
                this.canvasBase.ctx.strokeStyle = "#ffa500";
                this.canvasBase.ctx.lineWidth = 2;
                this.canvasBase.ctx.setLineDash([5, 10]);
                this.canvasBase.ctx.stroke();
                this.canvasBase.ctx.setLineDash([]); // Reset to solid line
            }

            // Step 3.2: Draw the transformed eigenvector

            const normalizedVector = {
                x1: 0,
                y1: 0,
                x2: vector.x, // Already normalized to magnitude 1
                y2: vector.y
            };

            const scaledVector = {
                x1: 0,
                y1: 0,
                x2: vector.x * lambda, // Scaled by the eigenvalue
                y2: vector.y * lambda
            };

            const scale = 2; // Adjust as needed for visualization
            const scaledEigenvector = {
                x1: 0,
                y1: 0,
                x2: vector.x * scale,
                y2: vector.y * scale
            };

            // Interpolate between the normalized vector and the scaled vector
            const interpolatedX2 = normalizedVector.x2 + (scaledVector.x2 - normalizedVector.x2) * this.animationManager.time;
            const interpolatedY2 = normalizedVector.y2 + (scaledVector.y2 - normalizedVector.y2) * this.animationManager.time;
            
            // Create the interpolated vector
            const interpolatedVector = {
                x1: normalizedVector.x1,
                y1: normalizedVector.y1,
                x2: interpolatedX2,
                y2: interpolatedY2
            };

            this._plotVector(interpolatedVector, this.canvasBase.ctx, { strokeStyle: "#ffa500" });
        });
    }

    _drawDot() {
        if (this.dots.length === 0) return;

        this.dots.forEach(({ x, y, options }) => {
            this._plotDot(x, y, options);
        });
    }

    ////////// Public Methods //////////
    
    /**
     * Add a mathematical function to the grid to plot.
     * 
     * @public
     * @param {Function} func - The math function to plot.
     * @param {Object} [options={}] - Options includes: {key, color}
     */
    addFunction(func, options = {}) {
        // Validate the function before adding it
        // This is important to prevent lag when the function is not evaluable
        if (!this._isFunctionEvaluable(func)) {
            console.warn('Function is not evaluable, not adding to grid.');
            return;
        }
        // Give a unique key to each function in the functions array
        const functionKey = options.key || `function_${Date.now()}`;
        const strokeColor = options.color;
        const mergedOptions = { ...options, strokeStyle: strokeColor };

        this.functions.push({ func, options: mergedOptions });
    }

    addImplicitFunction(func, options = {}) {
        
        this.implicitFunctions.push({ func, options });
    }

    addScalarField(func, options = {}) {
        this.scalarField = { func, options };
    }

    addVector(vec, options = {}) {
        const vectorKey = options.key || `vector_${Date.now()}`;
        const strokeColor = options.color;
        const mergedOptions = { ...options, strokeStyle: strokeColor };

        // Check if the vector is for interpolation
        if (options.interpolate && vec.start && vec.end) {
            this.vectors.push({ vec: { start: vec.start, end: vec.end }, options: mergedOptions });
        } else if (vec.x1 !== undefined && vec.y1 !== undefined && vec.x2 !== undefined && vec.y2 !== undefined) {
            // Handle single vector case
            this.vectors.push({ vec: { x1: vec.x1, y1: vec.y1, x2: vec.x2, y2: vec.y2 }, options: mergedOptions });
        } else {
            throw new Error("Invalid vector structure. Please provide a valid vector or start/end points.");
        }
    }

    addVectorField(func, options = {}) {
        this.vectorField = { func, options };
    }

    addVectorCurve(vectorFunction, tRange, options = {}) {
        if (
            typeof vectorFunction !== 'object' ||
            typeof vectorFunction.x !== 'function' ||
            typeof vectorFunction.y !== 'function'
        ) { return; }
        this.vectorCurves.push({ vectorFunction, tRange, options });
    }

    addDot(x, y, options = {}) {
        this.dots.push({ x, y, options });
    } 

    deleteFunction(key) {
        this.functions = this.functions.filter(f => f.options.key !== key);
    }

    deleteVector(key) {
        this.vectors = this.vectors.filter(v => v.options.key !== key);
    }

    deleteDot(x, y) {
        this.dots = this.dots.filter(dot => dot.x !== x || dot.y !== y);
    }

    popFunction() {
        if (this.functions.length > 0) {
            this.functions.pop();
        }
    }

    clearFunctions() {
        this.functions = [];
    }

    clearImplicitFunctions() {
        this.implicitFunctions = [];
    }

    clearScalarField() {
        this.scalarField = null;
    }

    clearVectors() {
        this.vectors = [];
    }
    
    clearVectorField() {
        this.vectorField = null;
    }

    clearVectorCurves() {
        this.vectorCurves = [];
    }

    clearDots() {
        this.dots = [];
    }

    clearAll() {
        this.clearFunctions();
        this.clearImplicitFunctions();
        this.clearVectors();
        this.clearVectorField();
        this.clearScalarField();
        this.clearVectorCurves();
        this.clearDots();

        // Reset animation related fields
        this.animationManager.isTransformedFlag = false;
        this.animationManager.time = 0;
        this.animationManager.T = { a: 1, b: 0, c: 0, d: 1 };
        this.animationManager.isIntegral = false;
        this.animationManager.int_a = null;
        this.animationManager.int_b = null;
        this.animationManager.deltaX = 0;
        this.animationManager.animationRan = false;
    }
}

/**
 * @param {BaseCanvasManager} base - The base canvas manager
 * @param {Function} interactCallback - The callback function for interactions
 */
class CanvasInteractionManager {
    constructor(base, interactCallback, animationManager) {
        // Composition: BaseCanvasManager, AnimationManager
        this.canvasBase = base;
        this.animationManager = animationManager;

        // Callback function for interactions
        this.interactCallback = interactCallback;

        // Interaction fields
        this.isGestureDown = false;
        this.startPos = { x: 0, y: 0 };
        this.ZOOM_FACTOR = 1.05;
        this.maxScale = 10**15;   // Above this scale will cause unexpected behavior
        this.minScale = 10**-25;  // Below this scale will cause unexpected behavior
        this.prevPinchDistance = null;
        this.prevTouchCount = 0;
    }

    /**
     * Register event listeners for the grid.
     * 
     * @private
     */
    _bindEvents() {
        window.addEventListener('resize', this._resizeCanvas.bind(this));
        this.canvasBase.canvas.addEventListener('mousedown', this._onMouseDown.bind(this));
        this.canvasBase.canvas.addEventListener('mousemove', this._onMouseMove.bind(this));
        this.canvasBase.canvas.addEventListener('mouseup', this._onMouseUp.bind(this));
        this.canvasBase.canvas.addEventListener('mouseleave', this._onMouseLeave.bind(this));
        this.canvasBase.canvas.addEventListener('wheel', this._onMouseWheel.bind(this));
        this.canvasBase.canvas.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
        this.canvasBase.canvas.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
        this.canvasBase.canvas.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: false });
    }

    /**
     * Resize the canvas and redraw the grid when the window is resized.
     *
     * @private
     */
    _resizeCanvas() {
        this.canvasBase.canvas.width = window.innerWidth;
        this.canvasBase.canvas.height = window.innerHeight;

        // This part of the code is for the animation canvas
        // Although InteractionManager does not directly interact with the animation canvas
        // It is still responsible for resizing the animation canvas
        if (this.animationManager) {
            this.animationManager.animationCanvas.width = window.innerWidth;
            this.animationManager.animationCanvas.height = window.innerHeight;
        }

        if (this.onInteraction) {
            this.onInteraction(); // redraw
        }
    }

    /**
     * Mouse down event handler.
     * 
     * @private
     * @param {MouseEvent} e - The mouse event.
     */
    _onMouseDown(e) {
        e.preventDefault();
        this.isGestureDown = true;
        this.startPos = { x: e.clientX, y: e.clientY };

    }

    /**
     * Handles the mousemove event on the canvas.
     * Update offset by integrating the distance moved by the mouse.
     *
     * @private
     * @param {MouseEvent} e - The mouse event.
     */
    _onMouseMove(e) {
        e.preventDefault();

        if (this.isGestureDown) {
            // Calculate the distance moved by the mouse
            const dx = e.clientX - this.startPos.x;
            const dy = e.clientY - this.startPos.y;
            // Similar to integration in calculus but discrete
            this.canvasBase.offset.x += dx
            this.canvasBase.offset.y += dy;
            this.startPos = { x: e.clientX, y: e.clientY };

            if (this.onInteraction) {
                this.onInteraction(); // redraw
            }
        }
    }

    /**
     * Mouse up event handler.
     * Ends the panning action if release the mouse button.
     * 
     * @private
     */
    _onMouseUp() {
        this.isGestureDown = false;
    }

    /**
     * Mouse leave event handler.
     * Ends the panning action if the mouse leaves the canvas when dragging.
     * 
     * @private
     * @param {MouseEvent} e - The mouse event.
     */
    _onMouseLeave() {
        this.isGestureDown = false;
    }

    /**
     * Mouse wheel event handler.
     * Implement zooming centered around the mouse position.
     * 
     * @private
     * @param {WheelEvent} e - The wheel event.
     */
    _onMouseWheel(e) {
        e.preventDefault();
        
        // Get the mouse position in world coordinates
        let mousePos = this.canvasBase._screenToWorld(e.clientX, e.clientY);
        let newScale = (e.deltaY > 0) ? this.canvasBase.scale / this.ZOOM_FACTOR : this.canvasBase.scale * this.ZOOM_FACTOR;
        newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));  // Prevent zooming too far

        // Calculate the offset to keep the mouse position fixed ⭐
        this.canvasBase.offset.x = this.canvasBase.offset.x - mousePos.x * newScale + mousePos.x * this.canvasBase.scale;
        this.canvasBase.offset.y = this.canvasBase.offset.y - mousePos.y * this.canvasBase.scale + mousePos.y * newScale;
        this.canvasBase.scale = newScale;

        if (this.onInteraction) {
            this.onInteraction(); // redraw
        }
    }

    /**
     * Get the distance between two touch points.
     * Pythagorean theorem
     * 
     * @private
     */
    _getDistance(gesture1, gesture2) {
        const dx = gesture1.clientX - gesture2.clientX;
        const dy = gesture1.clientY - gesture2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Touch event handlers.
     * 
     * @private
     * @param {TouchEvent} e - The touch event.
     */
    _onTouchStart(e) {
        e.preventDefault();

        switch (e.touches.length) {
            case 1:
                this.isGestureDown = true;
                // initial touch position
                this.startPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                break;
            case 2:
                // Record the distance between two fingers
                this.prevPinchDistance = this._getDistance(e.touches[0], e.touches[1]);
                // Use the center of two fingers as the start position
                this.startPos = {
                    x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                    y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
                };
                break;
            default:
                return;
        }
    }

    /**
     * Touch move event handler.
     * Implement panning and zooming for touch devices.
     * 
     * @private
     * @param {TouchEvent} e - The touch event.
     */
    _onTouchMove(e) {
        e.preventDefault();
        
        switch (e.touches.length) {
            case 1:
                if (this.isGestureDown) {
                    // Panning
                    const dx = e.touches[0].clientX - this.startPos.x;
                    const dy = e.touches[0].clientY - this.startPos.y;
                    this.canvasBase.offset.x += dx;
                    this.canvasBase.offset.y += dy;
                    // Reset the start position
                    this.startPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };

                    if (this.onInteraction) {
                        this.onInteraction(); // redraw
                    }
            }
                break;
            case 2:
                // Two finger (Both pinch and pan)
                if (this.isGestureDown) {

                    // Pinch to zoom
                    const newDistance = this._getDistance(e.touches[0], e.touches[1]);
                    let newScale = this.canvasBase.scale * (newDistance / this.prevPinchDistance);
                    
                    // Get the center of the pinch
                    const center = {
                        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
                    };

                    // Get the center in world coordinates
                    let touchPos = this.canvasBase._screenToWorld(center.x, center.y);
                    // Calculate the offset to keep the pinch center fixed
                    this.canvasBase.offset.x = this.canvasBase.offset.x - touchPos.x * newScale + touchPos.x * this.canvasBase.scale;
                    this.canvasBase.offset.y = this.canvasBase.offset.y - touchPos.y * this.canvasBase.scale + touchPos.y * newScale;

                    // Update scale and last pinch distance
                    this.canvasBase.scale = newScale;
                    this.prevPinchDistance = newDistance;

                    // Panning at the same time for both fingers
                    const avgDx = center.x - this.startPos.x;
                    const avgDy = center.y - this.startPos.y;
                    this.canvasBase.offset.x += avgDx;
                    this.canvasBase.offset.y += avgDy;

                    this.startPos = center;

                    if (this.onInteraction) {
                        this.onInteraction(); // redraw
                    }
                }
                break;
            default:
                return;
        }
    }

    /**
     * Touch end event handler.
     *
     * @private 
     */ 
    _onTouchEnd(e) {
        switch (e.touches.length) {
            case 0:
                this.isGestureDown = false;
                break;
            case 1:
                this.isGestureDown = true;
                this.prevPinchDistance = null;  // Reset pinch distance
                // Update start position here to prevent jump when changing from 2 fingers to 1 finger
                this.startPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                break;
            case 2:
                this.isGestureDown = true;
                break;
            default:
                this.previousTouchCount = e.touches.length;
                break;
        }
    }
}


/**
 * CanvasGraph2D Class
 * This class acts as the High-Level API for the 2D Cartesian Graph.
 * Users can only interact with this class to plot functions, vectors, etc.
 *
 */
class CanvasGraph2D {
    constructor(canvas) {
        this.canvasBase = new BaseCanvasManager(canvas);
        this.gridManager = new CanvasGridManager(this.canvasBase);
        this.animationManager = new CanvasAnimationManager(this.canvasBase);
        this.plotManager = new CanvasPlotManager(this.canvasBase, this.animationManager);
        this.interaction = new CanvasInteractionManager(
            this.canvasBase,
            this.draw.bind(this),
            this.animationManager
        );

        // Local field
        this.isShowTransformedGrid = true;
        this.isShowDeterminant = false;
        this.isShowEigenvector = false;

        this.isShowScalarField = false;
        this.isShowVectorField = false;
        this.isShowImplicitCurve = false;

        // More properties
        this.mode = 'light'; // Default
        this.colorSchemes = {
            light: {
                background: '#ffffff',
                primaryGrid: '#bababa',
                secondaryGrid: '#eaeaea',
                axes: '#000000',
                text: '#000000',
                
            },
            dark: {
                background: '#000000',
                primaryGrid: '#2596be',
                secondaryGrid: '#163e4c',
                axes: '#ffffff',
                text: '#ffffff',
            },
        };
        this.plotLightColors = [
            '#8b0000', // Dark Red
            '#006400', // Dark Green
            '#00008b', // Dark Blue
            '#8b008b', // Dark Magenta
            '#008b8b', // Dark Cyan
            '#8b8000', // Olive
            '#a52a2a', // Brown
            '#800000', // Maroon
            '#228b22', // Forest Green
            '#2f4f4f', // Dark Slate Gray
            '#4b0082', // Indigo
            '#483d8b', // Dark Slate Blue
            '#6b8e23', // Olive Drab
            '#556b2f', // Dark Olive Green
            '#2e8b57', // Sea Green
            '#4682b4', // Steel Blue
            '#5f9ea0', // Cadet Blue
            '#696969', // Dim Gray
            '#708090', // Slate Gray
            '#8b4513', // Saddle Brown
            '#9932cc', // Dark Orchid
            '#8b0000', // Crimson
        ];
        this.plotDarkColors = [
            '#ff9999', // Light Red
            '#99ff99', // Light Green
            '#9999ff', // Light Blue
            '#ff99ff', // Light Magenta
            '#99ffff', // Light Cyan
            '#ffff99', // Light Yellow
            '#ffcc99', // Peach
            '#ff99cc', // Light Pink
            '#ccff99', // Pale Green
            '#99ffcc', // Aquamarine
            '#99ccff', // Light Sky Blue
            '#cc99ff', // Lavender
            '#ffd700', // Gold
            '#ffa07a', // Light Salmon
            '#ffdab9', // Peach Puff
            '#fafad2', // Light Goldenrod Yellow
            '#d8bfd8', // Thistle
            '#eee8aa', // Pale Goldenrod
            '#b0e0e6', // Powder Blue
            '#add8e6', // Light Blue
            '#f08080', // Light Coral
            '#e6e6fa', // Lavender
        ];

        // Callback for interaction
        this.interaction.onInteraction = this.draw.bind(this);
        this.interaction._resizeCanvas();
        this.interaction._bindEvents();

        // To react native
        this.initialize();
    }

    initialize() {
        // Check if the animation context is available
        if (this.animationManager.animationCtx) {
            // Notify that the graph is ready
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
            }
        } else {
            console.error("Animation context is not available.");
        }
    }

    // Callback method: triggered when interaction
    draw() {
        this.canvasBase.ctx.clearRect(0, 0, this.canvasBase.canvas.width, this.canvasBase.canvas.height);
        this.canvasBase.ctx.save();

        // Update fields
        this.canvasBase._updateIntervalAndDecimal();
        this.canvasBase._updateAndReturnBoundaries();

        // Set background color
        this.canvasBase.setCanvasBackground(this.colorSchemes[this.mode].background);

        // Draw scalar field
        if (this.isShowScalarField) {
            this.plotManager._drawScalarField();
        }

        ////////// Draw the grid in order //////////
        this.gridManager._drawSecondaryGrid(this.colorSchemes[this.mode].secondaryGrid);
        this.gridManager._drawPrimaryGrid(this.colorSchemes[this.mode].primaryGrid);
        this.gridManager._drawAxes(this.colorSchemes[this.mode].axes);

        // Draw rectangles for numerical integration
        if (this.plotManager.functions[0] && this.animationManager.isIntegral) {
            this.plotManager._drawRectanglesForIntegral();
        }

        // Draw Axes Labels
        this.gridManager._drawLabels(this.colorSchemes[this.mode].text);

        // Draw functions
        this.plotManager._drawFunctions();

        // Draw implicit functions
        if (this.isShowImplicitCurve) {
            this.plotManager._drawImplicitFunctions();
        }

        // Draw Vectors
        this.plotManager._drawVectors();

        // Draw Vector Field
        this.plotManager._drawVectorField();

        // Draw Vector Curves
        this.plotManager._drawVectorCurves();

        // Draw dots
        this.plotManager._drawDot();

        // Draw linear transformation
        if (this.animationManager.isTransformedFlag) {
            if (this.isShowTransformedGrid) {
                this.plotManager._drawTransformedGrid();
            }
            if (this.isShowDeterminant) {
                this.plotManager._drawDeterminant();
                this.plotManager._drawBasisVectorsAndTransformation();
            }
            if (this.isShowEigenvector) {
                this.plotManager._drawEigenvector();
            }
        }
    }

    // Helper method
    resetOffsetAndScale() {
        this.canvasBase.resetOffsetAndScale();
        this.draw();
    }

    setMode(mode) {
        if (mode !== 'light' && mode !== 'dark') {
            throw new Error('Invalid mode. Please choose either "light" or "dark".');
        }
        this.mode = mode;
        this.canvasBase.setCanvasBackground(this.colorSchemes[this.mode].background);
        this.draw();
    }

    isFunctionEvaluable(func) {
        return this.plotManager._isFunctionEvaluable(func);
    }

    ////////// Plotting //////////
    addFunction(func, options = {}) {
        const randomColor = this.mode === 'light' ? this.plotLightColors[Math.floor(Math.random() * this.plotLightColors.length)] : this.plotDarkColors[Math.floor(Math.random() * this.plotDarkColors.length)];
        // Add the random color to the options object
        options.color = randomColor;
        this.plotManager.addFunction(func, options);
        this.draw();
    }

    addImplicitFunction(func, options = {}) {
        this.plotManager.addImplicitFunction(func, options);
        this.draw();
    }

    addScalarField(func, options = {}) {
        this.plotManager.addScalarField(func, options);
        this.draw();
    }

    addVector(vec, options = {}) {
        this.plotManager.addVector(vec, options);
        this.draw();
    }

    addVectorField(func, options = {}) {
        this.plotManager.addVectorField(func, options);
        this.draw();
    }

    addVectorCurve(vectorFunction, tRange, options = {}) {
        this.plotManager.addVectorCurve(vectorFunction, tRange, options);
        this.draw();
    }

    addDot(x, y, options = {}) {
        this.plotManager.addDot(x, y, options);
        this.draw();
    }

    deleteFunction(key) {
        this.plotManager.deleteFunction(key);
        this.draw();
    }

    deleteVector(key) {
        this.plotManager.deleteVector(key);
        this.draw();
    }

    deleteDot(x, y) {
        this.plotManager.deleteDot(x, y);
        this.draw();
    }

    popFunction() {
        this.plotManager.popFunction();
        this.draw();
    }

    clearFunctions() {
        this.plotManager.clearFunctions();
        this.draw();
    }

    clearImplicitFunctions() {
        this.plotManager.clearImplicitFunctions();
        this.draw();
    }

    clearScalarField() {
        this.plotManager.clearScalarField();
        this.draw();
    }

    clearVectors() {
        this.plotManager.clearVectors();
        this.draw();
    }

    clearVectorField() {
        this.plotManager.clearVectorField();
        this.draw();
    }

    clearVectorCurves() {
        this.plotManager.clearVectorCurves();
        this.draw();
    }

    clearDots() {
        this.plotManager.clearDots();
        this.draw();
    }

    clearAll() {
        this.plotManager.clearAll();
        this.draw();
    }

    ////////// Animation //////////
    resetAnimation() {
        this.animationManager.resetAnimation();
        this.draw();
    }

    setTransformation(a, b, c, d) {
        this.animationManager.setTransformation(a, b, c, d);
        this.draw();
    }

    setInterpolationTime(time) {
        this.animationManager.setInterpolationTime(time);
        this.draw();
    }

    setDrawRectanglesForIntegral(bool) {
        this.animationManager.setDrawRectanglesForIntegral(bool);
        this.draw();
    }

    setDeltaX(deltaX) {
        this.animationManager.setDeltaX(deltaX);
        this.draw();
    }

    setLimits(a, b) {
        this.animationManager.setLimits(a, b);
        this.draw();
    }

    ////////// Local Fields //////////
    setShowTransformedGrid(bool) {
        this.isShowTransformedGrid = bool;
        this.draw();
    }

    setShowDeterminant(bool) {
        this.isShowDeterminant = bool;
        this.draw();
    }

    setShowEigenvector(bool) {
        this.isShowEigenvector = bool;
        this.draw();
    }

    setShowScalarField(bool) {
        this.isShowScalarField = bool;
        this.draw();
    }

    setShowImplicitFunctions(bool) {
        this.isShowImplicitCurve = bool;
        this.draw();
    }

    ////////// Getters //////////
    getFunctions() {
        return this.plotManager.functions;
    }

    getVectors() {
        return this.plotManager.vectors;
    }

    getVectorField() {
        return this.plotManager.vectorField;
    }

    getVectorCurves() {
        return this.plotManager.vectorCurves;
    }

    getScalarField() {
        return this.plotManager.scalarField;
    }

    getTransformationMatrix() {
        return this.animationManager.T;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById("2dCartesian");
    const graph2d = new CanvasGraph2D(canvas);
    
    graph2d.initialize();
    graph2d.draw();
});
