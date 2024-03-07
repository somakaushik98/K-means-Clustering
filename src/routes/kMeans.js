import * as d3 from 'd3';

export function kMeans(elt, w, h, numPoints, numClusters, maxIter) {

    // the current iteration
    var iter = 1,
        centroids = [],
        points = [];
        
    var margin = {top: 30, right: 20, bottom: 20, left: 30},
        width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom;

    // Use d3.scaleOrdinal() to generate colors for the clusters
    var colors = d3.scaleOrdinal(d3.schemeCategory10);
    var centroidColors = d3.scaleOrdinal(d3.schemeCategory10); // Separate scale for centroid colors
    
    var svg = d3.select(elt).append("svg")
        .style("width", width + margin.left + margin.right)
        .style("height", height + margin.top + margin.bottom);
        
    var group = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    svg.append("g")
        .append("text")
        .attr("class", "label")
        .attr("transform", "translate(" + (width / 2) + "," + (height + margin.top + margin.bottom - 4) + ")") // Adjusted transformation
        .style("font-size", "12px") // Increase font size
        .style("fill", "black")     // Set text color to black
        .style("text-anchor", "middle") // Align text in the middle horizontally
        .text("");

    /**
     * Computes the euclidian distance between two points.
     */
    function getEuclideanDistance(a, b) {
        var dx = b.x - a.x,
            dy = b.y - a.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Returns a point with the specified type and fill color and with random 
     * x,y-coordinates.
     */
    function getRandomPoint(type, fill) {
        return { 
            x: Math.round(Math.random() * width), 
            y: Math.round(Math.random() * height),
            type: type,
            fill: fill 
        };
    }

    /** 
     * Generates a specified number of random points of the specified type.
     */
    function initializePoints(num, type) {
        var result = [];
        for (var i = 0; i < num; i++) {
            var color;
            if (type === "centroid") {
                color = centroidColors(i); // Use separate color scale for centroids
            } else {
                color = colors(i); // Use color scale for points
            }
            var point = getRandomPoint(type, color);
            point.id = point.type + "-" + i;
            result.push(point);
        }
        return result;
    }

    /**
     * Find the centroid that is closest to the specified point.
     */
    function findClosestCentroid(point) {
        var closest = {i: -1, distance: width * 2};
        centroids.forEach(function(d, i) {
            var distance = getEuclideanDistance(d, point);
            // Only update when the centroid is closer
            if (distance < closest.distance) {
                closest.i = i;
                closest.distance = distance;
            }
        });
        return centroids[closest.i]; 
    }
    
    /**
     * All points assume the color of the closest centroid.
     */
    function colorizePoints() {
        points.forEach(function(d) {
            var closest = findClosestCentroid(d);
            d.fill = closest.fill;
        });
    }

    /**
     * Computes the center of the cluster by taking the mean of the x and y 
     * coordinates.
     */
    function computeClusterCenter(cluster) {
        return [
            d3.mean(cluster, function(d) { return d.x; }), 
            d3.mean(cluster, function(d) { return d.y; })
        ];
    }
    
    /**
     * Moves the centroids to the center of their cluster.
     */
    function moveCentroids() {
        centroids.forEach(function(d) {
            // Get clusters based on their fill color
            var cluster = points.filter(function(e) {
                return e.fill === d.fill;
            });
            // Compute the cluster centers
            var center = computeClusterCenter(cluster);
            // Move the centroid
            d.x = center[0];
            d.y = center[1];
        });
    }

    /**
     * Updates the chart.
     */
    function update() {
        var data = points.concat(centroids);
        
        // The data join
        var circle = group.selectAll("circle")
            .data(data);
            
        // Create new elements as needed
        circle.enter().append("circle")
            .attr("id", function(d) { return d.id; })
            .attr("class", function(d) { return d.type; })
            .attr("r", 5);
            
        // Update old elements as needed
        circle.transition().duration(1000)
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .style("fill", function(d) { return d.fill; })
            .style("stroke", function(d) { return d.type === "centroid" ? "black" : "none"; }) // Apply black stroke only to centroid points
            .style("stroke-width", function(d) { return d.type === "centroid" ? 2 : 0; }); // Increase stroke width for centroid points
            
        // Remove old nodes
        circle.exit().remove();
    }

    /**
     * Updates the text in the label.
     */
    function setText(text) {
        svg.selectAll(".label").text(text);
    }
    
    /**
     * Executes one iteration of the algorithm:
     * - Fill the points with the color of the closest centroid (this makes it 
     *   part of its cluster)
     * - Move the centroids to the center of their cluster.
     */
    function iterate() {
        
        // Update label
        setText("Model Training: Iteration " + iter + " of " + maxIter);

        // Colorize the points
        colorizePoints();
        
        // Move the centroids
        moveCentroids();
        
        // Update the chart
        update();
    }

    /** 
     * The main function initializes the algorithm and calls an iteration every 
     * two seconds.
     */
    function initialize() {
        
        // Initialize random points and centroids
        centroids = initializePoints(numClusters, "centroid");
        points = initializePoints(numPoints, "point");
        
        // initial drawing
        update();
        
        var interval = setInterval(function() {
            if(iter < maxIter + 1) {
                iterate();
                iter++;
            } else {
                clearInterval(interval);
                setText("Done");
            }
        }, 2 * 1000);
    }

    // Call the main function
    initialize();
}