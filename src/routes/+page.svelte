<script>
	import { onMount, onDestroy } from 'svelte';
	import * as d3 from 'd3';
  import Scatterplot from './Scatterplot.svelte';
  import { kMeans } from './kMeans.js';

	let numClusters = 4;
	let svg;
	//let interval;
	let points = [];
	let centroids = [];
	let interval = null;
  let elt;
  //let hasFocused = false;
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

  function showTooltip(event, point) {
    // Show tooltip
    console.log(`x: ${point.x}, y: ${point.y}`);
  }

  function hideTooltip() {
    // Hide tooltip
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
      exit => exit.remove())
    .on("mouseover", function(event, d) {
      const colorHex = color(d.cluster); 
    d3.select(this)
      .transition()
      .duration(200) // Quick transition duration for responsiveness
      .attr("r", 8); // Increase radius size on hover
    
    d3.select("#tooltip")
      .style("opacity", 1)
      .html(`Annual Income (k$):${d.x}<br/>Spending Score (1-100):${d.y}<br/>Cluster Color: <span style='color:${colorHex};'>●</span>`)// Customize tooltip content
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 10) + "px");
      
  })
  .on("mouseout", function() {
    d3.select(this)
      .transition()
      .duration(200) // Return to normal size smoothly
      .attr("r", 4); // Return to normal radius size

    d3.select("#tooltip").style("opacity", 0); 
     // Hide tooltip on mouse out
      });


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
                                            .attr("cy", d => y(d.y))
                                            .style("fill", d => color(d.cluster))),
      exit => exit.remove())
    .attr("class", "centroid")
    .on("mouseover", function(event, d,i) {
      const colorHex1 = color(i);
    // Enlarge the centroid on hover
    d3.select(this)
      .transition()
      .duration(150) // Duration of the enlarging animation
      .attr("r", 10); // New, larger radius for the centroid circle

    // Show tooltip (if you're using a tooltip)
    d3.select("#tooltip")
      .style("opacity", 1)
      .html(`Cluster Centroid<br/>Annual Income (k$): ${d.x.toFixed(2)}<br/>Spending Score (1-100): ${d.y.toFixed(2)}`) // Customize tooltip content for centroids
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY + 10) + "px");
  })
  .on("mouseout", function(d) {
    // Revert the centroid to its original size
    d3.select(this)
      .transition()
      .duration(150) // Duration of the shrinking animation
      .attr("r", 6); // Original radius of the centroid circle

    // Hide tooltip
    d3.select("#tooltip").style("opacity", 0);// Hide tooltip on mouse out
    });
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
     
    svg.append("text")
    .attr("x", width / 2) // Center the title by setting x to half the width
    .attr("y", 8 - (margin.top / 2)) // Position y above the top margin
    .attr("text-anchor", "middle") // Ensure the text is centered at its x position
    .style("font-size", "24px") // Set the font size
    .style("font-family", "Arial, sans-serif") // Set the font family
    .text("K Means Clustering Visualization"); 

      svg.append("text")
      .attr("class", "x-axis-label")
      .attr("x", width / 2)
      .attr("y", height + margin.top + 25)
      .style("text-anchor", "middle")
      .text("Annual Income (k$)");

    // Append y axis label
    svg.append("text")
      .attr("class", "y-axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Spending Score (1-100)");
    
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

  onMount(() => {
    kMeans(elt, 500, 500, 1000, 5, 15);
  });
  let showInstructions = false; // Initially, don't show instructions
  let hasBeenFocused = false;
  function handleFocus() {
    if (!hasBeenFocused) {
      showInstructions = true; // Show instructions on first focus
      hasBeenFocused = true; // Mark as focused
    }
  }

  function handleInput() {
    setTimeout(() => {
      showInstructions = false;
    }, 4000); // Delay in milliseconds (e.g., 2000 milliseconds = 2 seconds)
  }

  let hasStarted = false; // Tracks if the Start button has been clicked at least once
  let showStartInstructions = false;

  function startClicked() {
    if (!hasStarted) {
      showStartInstructions = true; // Show instructions on first click
      hasStarted = true; // Prevent future instructions from showing

      // Hide instructions after a delay
      setTimeout(() => {
        showStartInstructions = false;
      }, 2000); // 2000 milliseconds = 2 seconds
    }
  }

  function handleClick() {
  if (interval) {
    stop();
  } else {
    start();
  }
  startClicked();
}
  </script>
  
  <div class="container">
	<nav class="shiny-navbar"> K Means Clustering </nav>
	
	
  <div class="text-content">
    <div class="intro-container">
      <img src="1588153086249.png" alt="Your Image" width="200" height="200">
    <div class="intro">
      <center><h4>About</h4></center>
    <p>
      K-means clustering is a popular unsupervised machine learning algorithm used for partitioning a dataset into distinct clusters. The goal of K-means is to group data points into K clusters, where each cluster is represented by its centroid. It iteratively assigns data points to the nearest centroid based on a distance metric, typically Euclidean distance, and then updates the centroids to the mean of the data points assigned to each cluster. This process continues until the centroids no longer change significantly, indicating convergence. K-means is widely utilized in various fields such as image segmentation, customer segmentation, and anomaly detection, offering a straightforward yet effective approach to discover patterns and structure within data. However, its performance can be sensitive to the initial choice of centroids and is limited by its assumption of spherical clusters and equal variance within clusters.</p> 
    </div>
    </div>
  </div>
  
  <div id="chart-container">
	  <div id="container">
    </div>
	</div>
	<div class="controls">
    <div id="tooltip" class="tooltip" style="opacity: 0"></div>
	  <label for="numClusters">Number of Clusters:</label>
	  <input id="numClusters" type="number" bind:value={numClusters} min="1" max="6" class="cluster-input" style="width: 300px;" on:focus={handleFocus} on:input={handleInput} on:click={handleInput} placeholder="Enter number of clusters...">
    {#if showInstructions}
<div class="instruction-box show">
  Reset the Cluster by clicking 'Reset' before clicking 'Start' after you change the value, and then click 'Start'
</div>
{/if}
    <button on:click={handleClick} >{interval ? 'Stop' : 'Start'}</button>
    {#if showStartInstructions}
<div class="instruction-box show">
  Hover the mouse over the points to view the tooltip
</div>
{/if}
	  <button on:click={reset}>Reset</button>
	</div>
 

    <div class="text-content">
    <div class="highlight-box">
      <h2>Implementation</h2>
    </div>
    <div class="intro-container">
      <Scatterplot />
    <div class="box">
      <h4>Dataset Preparation</h4>
      <p> Firstly import the dataset and ensuring its proper formatting, it's imperative to conduct exploratory data analysis to comprehend the distribution and characteristics of the variables. This involves checking for missing values and addressing them appropriately, along with selecting relevant features such as "Annual Income" and "Spending Score"  in our dataset. Further steps may include normalization or standardization of features to ensure equitable contribution to the clustering process. Once preprocessed, the dataset serves as input for the K-means clustering algorithm, facilitating the identification of distinct customer segments based on their annual income and spending scores, ultimately enabling targeted marketing strategies and enhanced customer understanding.</p>
    </div>
  </div>
  <div class="intro-container">
  <div class="box">
    <h4>Model Training</h4>
    <ul>
      <li>Randomly select K data points from the dataset as initial centroid positions, ensuring they represent a diverse spread across the feature space.</li>
      <li>Calculate the distance between each data point and each centroid using a distance metric such as Euclidean distance, Manhattan distance, or cosine similarity.</li>
      <li>Assign each data point to the cluster with the nearest centroid based on the calculated distances, effectively grouping data points together based on similarity.</li>
      <li>Update the centroids by recalculating their positions as the mean of all data points assigned to each cluster, ensuring they accurately represent the cluster's center.</li>
      <li>Repeat steps 2-4 iteratively until convergence, which occurs when the centroids stabilize and no longer change significantly between iterations, or when a predefined maximum number of iterations is reached to prevent infinite looping.</li>
    </ul>
    <center>
     <div bind:this={elt} class="kmeans-chart"></div></center>
  </div>
</div>




<div class="intro-container">
  <div class="box">
    <h4>Model Evaluation</h4>
    <p>
      Evaluating a K-means clustering model involves assessing its performance in effectively partitioning data points into clusters. Common methods include:</p>
    <ul>
      <li><b>Silhouette Analysis:</b> Silhouette analysis measures how similar each data point is to its assigned cluster compared to other clusters, with scores ranging from -1 to 1, where higher scores indicate better clustering.</li>
      <li><b>Elbow Method:</b> The elbow method involves plotting the within-cluster sum of squares (WCSS) for different cluster numbers and identifies the "elbow" point, suggesting the optimal number of clusters.</li>
      <li><b>Davies–Bouldin Index:</b> The Davies–Bouldin index computes the average similarity between clusters, considering both compactness and separation, where lower values indicate better clustering quality.</li>
      <li><b>Dunn Index:</b> The Dunn index measures the ratio of inter-cluster distance to intra-cluster distance, where higher values signify better clustering with larger inter-cluster separation and smaller cluster sizes.</li>
      <li><b>External Validation Measures:</b> External validation measures like the adjusted Rand index and Fowlkes-Mallows index compare clustering results to true labels when available, with higher scores indicating better agreement between the clustering and ground truth labels.</li>
    </ul>
    <center>
    <img src="sphx_glr_plot_kmeans_silhouette_analysis_002.png" alt="Image8" width="1000" height="300">
  </center>
  </div>
  
</div>

    </div>
    <div class="highlight-box">
      <center><h2>Applications</h2></center>
    </div>
    <div class="intro-container">
      <div class="box">
        <ul>
          <li><b>Customer Segmentation:</b> K-means clustering is employed to segment customers based on their purchasing behavior, demographic information, or other relevant features, facilitating tailored marketing strategies and offerings for specific customer segments.</li>
          <li><b>Image Segmentation:</b> In image processing, K-means clustering is utilized to segment an image into distinct regions based on pixel similarity, thereby aiding tasks such as object recognition, image compression, and enhancement.</li>
          <li><b>Anomaly Detection:</b> K-means clustering serves as a tool for identifying outliers or anomalies in datasets by clustering the data and singling out clusters with significantly fewer data points, thus detecting data points that do not fit into any cluster or belong to clusters with very few members.</li>
          <li><b>Text Clustering:</b> Within text mining and natural language processing, K-means clustering is applied to cluster documents based on their content, facilitating tasks such as document organization, topic modeling, and summarization.</li>
          <li><b>Recommendation Systems:</b> In recommendation systems, K-means clustering is utilized to group similar items or users based on their features or preferences, enabling personalized recommendations by suggesting items popular among similar users or items similar to those previously interacted with.</li>
        </ul>
        <div class="image-container">
          <div class="image-wrapper">
        <img src="1_8GEXSMN6FyVNBWNBXVAA7A.png" alt="Image1" width="600" height="300">
        <div class="caption">Image Segmentation</div>
        </div>
        <div class="image-wrapper">
        <img src="image-5.png" alt="Image2" width="800" height="300">
        <div class="caption">Text Clustering</div>
      </div>
      </div>
        </div>
      </div>
    <div class="highlight-box">
      <center><h2>Limitations</h2></center>
    </div>
    <div class="intro-container">
    <div class="box">
      <ul>
        <li><b>Sensitive to Initial Centroids:</b> K-means clustering is sensitive to the initial placement of cluster centroids. Different initializations can lead to different cluster assignments, affecting the quality and stability of the clustering solution.</li>
        <li><b>Sensitive to Outliers:</b> Outliers or noise in the dataset can significantly impact the clustering results. Since K-means aims to minimize the within-cluster variance, outliers can distort cluster boundaries and lead to incorrect cluster assignments</li>
        <li><b>May Converge to Local Optima:</b> K-means is prone to converging to local optima, especially in high-dimensional spaces or when dealing with complex data distributions. Multiple runs with different initializations are often required to mitigate this issue.</li>
        <li><b>Not Suitable for Categorical Data:</b> K-means is designed for numerical data and cannot directly handle categorical variables. Preprocessing techniques such as one-hot encoding may be required for datasets containing categorical features.</li>
        <li><b>Sensitive to Scaling and Features:</b> K-means clustering is sensitive to the scale and distribution of features. Features with larger scales or variances can dominate the clustering process, leading to biased cluster assignments.</li>
      </ul>
    </div>
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
  padding-top: inherit;
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
    margin-left: revert;
    margin-right: auto;
  }

  .text-content h2 {
    text-align: center;
    margin-bottom: 15px;
  }

  .highlight-box {
    width: 1000px; /* Set box width */
    padding: 20px;
    background-color: #ffffff; /* Change background color of the box */
    border-radius: 10px; /* Add rounded corners */
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); /* Add a subtle shadow effect */
    box-sizing: border-box; /* Include padding and border in the box's total width and height */
    margin-bottom: 20px; /* Add space between boxes */
    border: 2px;
  }

  .intro-container {
    width: 1000px; /* Adjust maximum width of the container */
    margin: 50px auto; /* Center the container horizontally */
    padding: 20px;
    background-color: #ffffff; /* Change background color of the container */
    border-radius: 10px; /* Add rounded corners */
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); /* Add a subtle shadow effect */
    display: flex; /* Use flexbox for layout */
    align-items: center; 
    
    /* Align items vertically */
  }

  .intro-container img {
    max-width: 800px; /* Adjust maximum width of the image */
    margin-right: 20px; /* Add space between the image and paragraph */
  }

  .intro {
    flex: 1; /* Fill remaining space */
    line-height: 1.6; /* Adjust line height for better readability */
    text-align: justify; /* Justify text */
  }

  .text-content ul {
    list-style-type: disc; /* Or other list style you prefer */
    padding-left: 20px; /* Standard indent for unordered lists */
  }

  .text-content li {
    margin-bottom: 10px;
    line-height: 1.6; /* Improved readability for list items */
  }

  .box {
    width: 1000px; /* Set box width */
    margin-top: 20px; /* Add space between boxes */
    padding: 20px;
    background-color: #ffffff; /* Change background color of the box */
    border-radius: 10px; /* Add rounded corners */
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); /* Add a subtle shadow effect */
    box-sizing: border-box; /* Include padding and border in the box's total width and height */
  }


  .text-left {
    display: flex; /* Use flexbox for layout */
    align-items: center; /* Align items vertically */
  }

  .text-left .text {
    flex: 1; /* Fill remaining space */
    line-height: 1.6; /* Adjust line height for better readability */
    text-align: justify; /* Justify text */
  }

  .text-left img {
    max-width: 200px; /* Adjust maximum width of the image */
    margin-right: 20px; /* Add space between the image and text */
  }

  .kmeans-chart {
    font-family: "Open Sans", Arial, Helvetica, sans-serif;
    font-size: 9px;
    fill: #ccc;
}

.kmeans-chart .centroid {
    stroke: #000;
    stroke-width: 2px;
}

.kmeans-chart text.label {
    font-size: 12px;
    fill: #333;
}

.kmeans-chart .axis line, .axis path {
    fill: none;
    stroke-width: 1px;
    stroke: #ccc;
    shape-rendering: crispEdges;
}

.image-container {
    display: flex;
    justify-content: center; /* Center items horizontally */
    align-items: center; /* Center items vertically */
}

.image-container figure {
    text-align: center; /* Center caption text */
    margin: 0 10px; /* Adjust margin as needed */
}

.image-container img {
    width: 900px; /* Increase the width to make images larger */
    height: auto; /* Maintain aspect ratio */
}

.image-container figcaption {
    margin-top: 10px; /* Adjust margin as needed */
}
.image-wrapper {
    text-align: center;
    margin: 0 10px; /* Adjust margin as needed */
}

.image-wrapper img {
    width: 80%; /* Adjust the width as needed */
    height: auto; /* Maintain aspect ratio */
}
.caption {
    margin-top: 5px; /* Adjust margin as needed */
    font-size: 14px; /* Adjust font size as needed */
    color: #888; /* Adjust color as needed */
}

.tooltip {
    position: absolute;
    text-align: center;
    width: auto;
    height: auto;
    padding: 2px;
    font: 12px sans-serif;
    background: white;
    border: 0px;
    border-radius: 8px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .instruction-box {
    display: none;
    background-color: lightcoral;
    border: 1px solid #ccc;
    padding: 10px;
    border-radius: 5px;
    position: absolute;
    width: 200px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    margin-top: 10px; /* Adjust spacing as needed */
  }

  .instruction-box.show {
    display: block; /* Only show when .show is added */
  }
  </style>
  