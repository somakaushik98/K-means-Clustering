<!-- Scatterplot.svelte -->
<script>
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
  
    onMount(async () => {
      try {
        // set the dimensions and margins of the graph
        const margin = { top: 10, right: 30, bottom: 60, left: 60 };
        const width = 460 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;
  
        const svg = d3.select("#my_chart")
          .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
          .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
        // Fetch the local JSON data
        const response = await fetch('Mall_Customers_gen.json');
        const jsonData = await response.json();
  
        // Extract necessary data attributes
        const incomeData = jsonData.map(d => d['Annual Income (k$)']);
        const spendingScoreData = jsonData.map(d => d['Spending Score (1-100)']);
  
        // Add X axis
        const x = d3.scaleLinear()
          .domain([d3.min(incomeData), d3.max(incomeData)]) // Adjust domain based on data
          .range([0, width]);
  
        svg.append("g")
          .attr("class", "myXaxis")
          .attr("transform", "translate(0," + height + ")")
          .call(d3.axisBottom(x));
  
        // Add Y axis
        const y = d3.scaleLinear()
          .domain([d3.min(spendingScoreData), d3.max(spendingScoreData)]) // Adjust domain based on data
          .range([height, 0]);
  
        svg.append("g")
          .call(d3.axisLeft(y));
  
        // Add X axis label
        svg.append("text")
          .attr("class", "x label")
          .attr("text-anchor", "middle")
          .attr("x", width / 2)
          .attr("y", height + margin.top + 30) // Adjusted position
          .style("font-size", "14px") // Reduced font size
          .text("Annual Income (k$)");
  
        // Add Y axis label
        svg.append("text")
          .attr("class", "y label")
          .attr("text-anchor", "middle")
          .attr("y", -margin.left + 20) // Adjusted position
          .attr("x", -margin.top - height / 2)
          .attr("dy", ".75em")
          .attr("transform", "rotate(-90)")
          .style("font-size", "14px") // Reduced font size
          .text("Spending Score (1-100)");
  
        // Add dots
        svg.selectAll("dot")
          .data(jsonData)
          .enter()
          .append("circle")
            .attr("cx", 0) // Initial x position at the y-axis
            .attr("cy", d => y(d['Spending Score (1-100)']))
            .attr("r", 3) // Increased radius for better visibility
            .style("fill", "#69b3a2")
          .transition() // Add transition to circles
            .duration(2000)
            .attr("cx", d => x(d['Annual Income (k$)'])); // Final x position based on annual income
  
      } catch (error) {
        console.error('Error:', error);
      }
    });
  </script>
  
  <style>
    /* Add any necessary styles here */
  </style>
  
  <div id="my_chart"></div>
  