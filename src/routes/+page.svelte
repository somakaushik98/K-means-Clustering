<script>
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';
  
	let numClusters = 4;
	let svg;
	//let interval;
	let points = [];
	let centroids = [];
	let interval = null;
  
	const margin = { top: 10, right: 60, bottom: 40, left: 50 };
	const viewBox = { x: 0, y: 0, w: 1000, h: 604 };
	const width = viewBox.w - margin.left - margin.right;
	const height = viewBox.h - margin.top - margin.bottom;
  
	const xrange = [0, 150];
	const yrange = [0, 150];
  
	const x = d3.scaleLinear().domain(xrange).range([0, width]);
	const y = d3.scaleLinear().domain(yrange).range([height, 0]);
	const color = d3.scaleOrdinal(d3.schemeCategory10);
  
	async function generateDataPoints() {
	  try {
		const response = await fetch('Mall_Customers_gen.json');
		if (!response.ok) {
		  throw new Error('Network response was not ok');
		}
		const jsonData = await response.json();
  
		return jsonData.map(customer => ({
		  x: customer['Annual Income (k$)'],
		  y: customer['Spending Score (1-100)'],
		  cluster: null,
		}));
	  } catch (error) {
		console.error("Error fetching data:", error);
		return [];
	  }
	}
  
	function getRandomPoint() {
	  return {
		x: Math.random() * xrange[1],
		y: Math.random() * yrange[1],
		cluster: null,
	  };
	}
  
	function distance(a, b) {
	  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
	}
  
	function closestCentroid(point) {
	  const distances = centroids.map(centroid => distance(point, centroid));
	  return distances.indexOf(Math.min(...distances));
	}
  
	function updateVisualization() {
  // Update data points
  svg.selectAll(".point")
    .data(points, d => d.id)
    .join(
      enter => enter.append("circle")
                     .attr("class", "point")
                     .attr("cx", d => x(d.x))
                     .attr("cy", d => y(d.y))
                     .attr("r", 4)
                     .style("fill", d => color(d.cluster))
                     .call(enter => enter.transition().duration(500)),
      update => update.call(update => update.transition().duration(500)
                                            .attr("cx", d => x(d.x))
                                            .attr("cy", d => y(d.y))
                                            .style("fill", d => color(d.cluster))),
      exit => exit.remove()
    );

  // Make sure to remove any previous centroids before drawing new ones
  svg.selectAll(".centroid").remove();

  // Update centroids, ensuring they are on top
  svg.selectAll(".centroid")
    .data(centroids)
    .join(
      enter => enter.append("circle")
                     .attr("class", "centroid")
                     .attr("cx", d => x(d.x))
                     .attr("cy", d => y(d.y))
                     .attr("r", 6)
                     .style("fill", "#e6e8ea")
                     .attr("stroke", (d, i) => color(i))
                     .attr("stroke-width", 2)
                     .call(enter => enter.transition().duration(500)),
      update => update.call(update => update.transition().duration(500)
                                            .attr("cx", d => x(d.x))
                                            .attr("cy", d => y(d.y))),
      exit => exit.remove()
    );
}

  
	function updatePoints() {
	  points.forEach(point => {
		point.cluster = closestCentroid(point);
	  });
	}
  
	function updateCentroids() {
	  centroids = centroids.map((centroid, i) => {
		const clusterPoints = points.filter(point => point.cluster === i);
		if (clusterPoints.length > 0) {
		  return {
			...centroid,
			x: d3.mean(clusterPoints, d => d.x),
			y: d3.mean(clusterPoints, d => d.y),
		  };
		}
		return centroid;
	  });
	}
  
	function start() {
		updatePoints();
    updateVisualization();
    if (!interval) {
      interval = setInterval(() => {
        updateCentroids();
        updatePoints();
        updateVisualization();
      }, 1000);
    }
	}
  
	function stop() {
	  clearInterval(interval);
	  interval = null;
	}
  
	async function reset() {
	  stop();
	  points = await generateDataPoints();
	  centroids = Array.from({ length: numClusters }, getRandomPoint);
	  
	  x.domain(d3.extent(points, d => d.x)).nice();
      y.domain(d3.extent(points, d => d.y)).nice();

  // Then update the axes -- make sure you have already appended groups with 'x-axis' and 'y-axis' class to your SVG
  svg.select(".x-axis").call(d3.axisBottom(x));
  svg.select(".y-axis").call(d3.axisLeft(y));
  updateVisualization();
	  //start();
	}
  
	onMount(async () => {
    svg = d3.select("#container")
      .append("svg")
      .attr("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`)
      .attr("width", viewBox.w + 'px')
      .attr("height", viewBox.h + 'px')
      .style("background", "#D3D3D3") // Set to light gray
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Axes with white color
    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x))
      .selectAll("path, line") // Selecting the path and line elements of the axis
      .style("stroke", "black")
	  .style("stroke-width", "2px"); // Setting their color to white

    svg.append("g")
      .call(d3.axisLeft(y))
      .selectAll("path, line") // Selecting the path and line elements of the axis
      .style("stroke", "black")
	  .style("stroke-width", "2px"); // Setting their color to white

    // To change the tick text color to white
    svg.selectAll("text").style("fill", "black").style("font-size", "15px");

    await reset();
  });
  
	onDestroy(() => {
	  stop();
	});
  </script>
  
  <div class="container">
	<nav class="shiny-navbar"> K Means Clustering </nav>
	<div id="chart-container">
	  <div id="container"></div>
	</div>
	<div class="controls">
	  <label for="numClusters">Number of Clusters:</label>
	  <input id="numClusters" type="number" bind:value={numClusters} min="1" class="cluster-input">
	  <button on:click={interval ? stop : start}>{interval ? 'Stop' : 'Start'}</button>
	  <button on:click={reset}>Restart</button>
	</div>
	
  <div class="text-content">
    <h4>What have you done so far?</h4>
    <ul>
      <li>We prepared the dataset according to the requirements, initially creating a static visualization of the K-means algorithm.</li>
      <li>We enhanced interactivity by visualizing how centroids move to ideal locations, demonstrating the clustering process of the K-means algorithm.</li>
      <li>Subsequently, we introduced a feature allowing users to select the number of clusters, which dynamically changes the colors of points on the coordinate plane to represent different clusters.</li>
      <li>Then we incorporated start and stop buttons to control the K-means visualization, enhancing user engagement.</li>
    </ul>
	<h4>What will be the most challenging of your project to design and why?</h4>
  <ul>
    <li>Firstly, the algorithm itself is complex, involving steps such as centroid initialization, data point assignment, and centroid updating, all of which need to be translated into efficient JavaScript code.</li>
    <li>Secondly, JavaScript's limitations in handling data and performing mathematical operations on large datasets add another layer of complexity, requiring careful optimization of the algorithm.</li>
    <li>Additionally, integrating the algorithm with interactive visualization frameworks like D3.js and Svelte requires meticulous coordination to ensure smooth data flow and real-time updates</li>
    <li>Moreover, JavaScript's performance and numerical precision may not match those of other languages like Python, commonly used for such tasks, posing further challenges in ensuring accuracy and efficiency.</li>
  </ul>
  </div>
  </div>
  
  <style>

.container {
	padding-top: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: auto;
    width: fit-content;
  }

  #chart-container {
    border: 2px solid black; /* Adds a black border */
    padding: 0px; /* Optional: Adds some spacing around the SVG */
  }

  h1 {
    font-family: 'Comic Sans MS', 'Comic Sans', cursive;
    margin-bottom: 90px;
  }

  #container {
    margin-bottom: 0px;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 10px; 
	flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    align-content: flex-end;
    align-items: baseline;
	height: 50px;
  }

  .cluster-input, button {
    padding: 5px;
  }
  
  .shiny-navbar {
    background: linear-gradient(145deg, #555, #222);
    color: white;
    text-align: center;
    padding: 10px 0 10px 0;
    font-size: 24px;
    font-family: 'Arial', cursive, sans-serif;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    width: 100%;
    position: fixed; /* Fix the navbar at the top of the page */
    top: 0; /* Align to the top */
    left: 0; /* Align to the left */
    z-index: 1000; /* Ensure navbar is above other content */
  }
  button {
    background-color: #4CAF50; /* Example button color */
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    background-color: #45a049;
  }

  input[type="number"] {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 10px;
  }

  label {
    font-family: Arial, sans-serif;
	font-size:15;
  }

  .text-content {
    margin-top: 20px;
    padding: 15px;
    text-align: left;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

  .text-content h2 {
    text-align: center;
    margin-bottom: 15px;
  }

  .text-content ul {
    list-style-type: disc; /* Or other list style you prefer */
    padding-left: 20px; /* Standard indent for unordered lists */
  }

  .text-content li {
    margin-bottom: 10px;
    line-height: 1.6; /* Improved readability for list items */
  }
  </style>
  