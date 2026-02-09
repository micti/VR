var process = function (err, data) {
  if (err) throw err

  var se9Route = data[2].routes.se9
  var tn1Route = data[1].routes.tn1

  // Prepare data in section Quang Ngai - Phu Hiep
  var stations = []
  var se9 = []
  var tn1 = []
  for (var i = 99; i < 119; i++) {
    var codeSection = data[0][i]
    var stationSection = codeSection.split('-')
    // console.log(codeSection)
    // console.log('--SE9')
    // console.log('----' + se9Route.sections[codeSection].time1In)
    // console.log('----' + se9Route.sections[codeSection].time2Out)
    // console.log('--TN1')
    // console.log('----' + tn1Route.sections[codeSection].time1In)
    // console.log('----' + tn1Route.sections[codeSection].time2Out)

    stations.push(data[1].stations[stationSection[0]])
    se9.push({
      'km': data[1].stations[stationSection[0]].km,
      'in': se9Route.sections[codeSection].time1In,
      'out': se9Route.sections[codeSection].time1Out
    })
    tn1.push({
      'km': data[1].stations[stationSection[0]].km,
      'in': tn1Route.sections[codeSection].time1In,
      'out': tn1Route.sections[codeSection].time1Out
    })
  }

  var countStation = stations.length
  var sectionLength = stations[countStation - 1].km - stations[0].km
  console.log(sectionLength)

  // build svg
  var width = 500
  var height = sectionLength * 3 + 60
  var scale = d3.scaleLinear().domain([stations[0].km, stations[countStation - 1].km]).range([0, sectionLength * 3])

  var svg = d3.select('#main_svg').append('svg')
        .attr('width', width)
        .attr('height', height)
  var stationSvg = svg.append('g')
        .attr('transform', 'translate(0,50)')
  var train1Svg = svg.append('g')
        .attr('transform', 'translate(0,50)')
  var train2Svg = svg.append('g')
        .attr('transform', 'translate(0,50)')

  svg.append('text')
    .attr('class', 'train1_label')
    .attr('x', 125)
    .attr('y', 25)
    .text('SE9')

  svg.append('text')
    .attr('class', 'train1_label')
    .attr('x', 375)
    .attr('y', 25)
    .text('TN1')

  stationSvg.selectAll('.station_label').data(stations).enter().append('text')
    .attr('class', 'station_label')
    .attr('x', 250)
    .attr('y', function (d) { return scale(d.km) })
    .attr('dy', '0.32em')
    .text(function (d) { return d.name })

  train1Svg.selectAll('.time1_label').data(se9).enter().append('text')
    .attr('class', 'time1_label')
    .attr('x', 125)
    .attr('y', function (d) { return scale(d.km) })
    .attr('dy', '0.32em')
    .text(timeDisplay)

  train2Svg.selectAll('.time2_label').data(tn1).enter().append('text')
    .attr('class', 'time2_label')
    .attr('x', 375)
    .attr('y', function (d) { return scale(d.km) })
    .attr('dy', '0.32em')
    .text(timeDisplay)
}

var timeDisplay = function (data) {
  if (data.in === data.out) return data.in

  return data.in + ' - ' + data.out
}

d3.queue()
  .defer(d3.json, '/kehoach/data/code_sections.json')
  .defer(d3.json, '/kehoach/data/he2017_e.json')
  .defer(d3.json, '/kehoach/data/sauhe2017_e.json')
  .awaitAll(process)
