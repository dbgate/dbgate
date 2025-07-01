const getChartExport = (title, config, imageFile, plugins) => {
  const PLUGIN_TAGS = {
    zoom: '<script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-zoom/1.2.0/chartjs-plugin-zoom.min.js" integrity="sha512-TT0wAMqqtjXVzpc48sI0G84rBP+oTkBZPgeRYIOVRGUdwJsyS3WPipsNh///ay2LJ+onCM23tipnz6EvEy2/UA==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>',
    dataLabels:
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-datalabels/2.2.0/chartjs-plugin-datalabels.min.js" integrity="sha512-JPcRR8yFa8mmCsfrw4TNte1ZvF1e3+1SdGMslZvmrzDYxS69J7J49vkFL8u6u8PlPJK+H3voElBtUCzaXj+6ig==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>',
    outlabels:
      '<script src="https://cdn.jsdelivr.net/npm/@energiency/chartjs-plugin-piechart-outlabels@1.3.4/dist/chartjs-plugin-piechart-outlabels.min.js"></script>',
  };

  return `<html>
<meta charset='utf-8'>

<head>
    ${title ? `<title>${title}</title>` : ''}
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.6.0/chart.min.js" integrity="sha512-GMGzUEevhWh8Tc/njS0bDpwgxdCJLQBWG3Z2Ct+JGOpVnEmjvNx6ts4v6A2XJf1HOrtOsfhv3hBKpK9kE5z8AQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js" integrity="sha512-qTXRIMyZIFb8iQcfjXWCO8+M5Tbc38Qi5WzdPOYZHIlZpzBHG3L3by84BBBOiRGiEb7KKtAOAs5qYdUiZiQNNQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/chartjs-adapter-moment/1.0.0/chartjs-adapter-moment.min.js" integrity="sha512-oh5t+CdSBsaVVAvxcZKy3XJdP7ZbYUBSRCXDTVn0ODewMDDNnELsrG9eDm8rVZAQg7RsDD/8K3MjPAFB13o6eA==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js" integrity="sha512-UXumZrZNiOwnTcZSHLOfcTs0aos2MzBWHXOHOuB0J/R44QB0dwY5JgfbvljXcklVf65Gc4El6RjZ+lnwd2az2g==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    ${plugins.map(plugin => PLUGIN_TAGS[plugin] ?? '')}

    <style>
        a { text-decoration: none }

        .footer { 
            float: right;
            font-family: Arial;
            color: #888;
            margin-top: 10px;
            margin-right: 10px;
            font-size: 10pt;
        }
    </style>

    <script>
        const config = ${JSON.stringify(config)};

        function showChart() {
            document.getElementById('myImage').style.display = "none";

            const myChart = new Chart(
                document.getElementById('myChart'),
                config
            );
        }
    </script>
</head>

<body onload="showChart()">
    <img src="${imageFile}" id="myImage" />

    <div>
        <canvas id="myChart"></canvas>
    </div>

    <div class="footer">
        Exported from <a href='https://dbgate.io/' target='_blank'>DbGate</a>, powered by <a href='https://www.chartjs.org/' target='_blank'>Chart.js</a>
    </div>
</body>

</html>`;
};

module.exports = getChartExport;
