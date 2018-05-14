// Mô phỏng chạy tàu bắc nam
// Todo
// - Biểu diễn các ga
// - Biểu diễn lại đoạn Đà Nẵng - Thanh Khê
// - Biểu diễn lại đoạn Diêu Trì - Quy nhơn, Bình Thuận - Phan thiết

// Xây dựng mô phỏng
let builder = async function(dataFile) {
  let data = await d3.json(dataFile)

  // Xử lý dữ liệu
  let dataLines = [],
      dataStations = []
  for (let d in data.sections) {
      dataLines.push(data.sections[d])
  }

  for (let d in data.stations) {
      dataStations.push(data.stations[d])
  }

  // Khai báo thông số
  let lineLength = 1726,
      scaleRatio = 3,
      width = 1200,
      height = (lineLength + 20) * scaleRatio

  let svg = d3.select("#bieudo").append("svg")
      .attr("width", 250)
      .attr("height", height)

  let scaleStation = d3.scaleLinear().domain([0, 1726]).range([0, 1726 * scaleRatio])
  let scaleTime = d3.scaleTime()
      .domain([new Date(2016, 0, 15, 0), new Date(2016, 0, 16, 0)])
      .range([0, 24 * 43])

  // Cột KM
  let axisKM = d3.axisLeft(scaleStation).ticks(32)
  svg.append('g')
     .attr("transform", "translate(33,20)")
     .call(axisKM)


  let routeSvg = svg.append('g')
    .attr("class", "route")
    .attr("transform", "translate(200,20)")
    .attr("font-size", "12px")

  let lines = routeSvg.selectAll('.line').data(dataLines)
  let stations = routeSvg.selectAll('.station').data(dataStations)
  let stationLabels = routeSvg.selectAll('.station_label').data(dataStations)
  let stationTicks = routeSvg.selectAll('.station_tick').data(dataStations)

  lines.enter().append('line')
      .attr('class', 'line')
      .attr('x1', 0)
      .attr('y1', function (d) { return scaleStation(data.stations[d.station1].km) })
      .attr('x2', 0)
      .attr('y2', function (d) { return scaleStation(data.stations[d.station2].km) });

      stations.enter().append('circle')
          .attr('class', 'station')
          .attr("cx", 0)
          .attr("cy", function(d) { return scaleStation(d.km) })
          .attr("r", 2)

      stationLabels.enter().append('text')
          .attr('class', 'station_label')
          .attr("x", function (d, i) { return i % 2 === 0 ? '-75' : '-15'})
          .attr("y", function (d) { return scaleStation(d.km) })
          .attr("dy", "0.32em")
          .text(function (d) { return d.name })

      stationTicks.enter().append('line')
          .attr('class', 'station_tick')
          .attr("y2", function (d, i) { return scaleStation(d.km) })
          .attr("y1", function (d, i) { return scaleStation(d.km) })
          .attr("x1", function (d, i) { return i % 2 === 0 ? '-70' : '-10'})
          .attr("x2", "-3")
}
