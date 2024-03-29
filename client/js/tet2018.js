// extend d3
d3.selection.prototype.moveToBack = function () {
  return this.each(function () {
    var firstChild = this.parentNode.firstChild
    if (firstChild) {
      this.parentNode.insertBefore(this, firstChild)
    }
  })
}
d3.selection.prototype.moveToFront = function () {
  return this.each(function () {
    this.parentNode.appendChild(this)
  })
}
d3.selection.prototype.getOffset = function () {
  var el = this._groups[0][0]
  if (!el) {
    return
  }

  if (!el.getClientRects().length) {
    return {
      top: 0,
      left: 0
    }
  }

  var rect = el.getBoundingClientRect()
  var doc = el.ownerDocument
  var docElem = doc.documentElement
  var win = doc.defaultView

  return {
    top: rect.top + win.pageYOffset - docElem.clientTop,
    left: rect.left + win.pageXOffset - docElem.clientLeft
  }
}

var lineLength = 1726,
  scaleRatio = 3,
  width = 1200,
  height = (lineLength + 20) * scaleRatio

var svg = d3.select('#bieudo').append('svg')
  .attr('width', 250)
  .attr('height', height)

var bieudoSVG = d3.select('#bieudo_chaytau_svg').append('svg')
  .attr('width', 24 * 43 + 70)
  .attr('height', lineLength * scaleRatio + 50)

var scaleStation = scale = d3.scaleLinear().domain([0, 1726]).range([0, 1726 * scaleRatio])
var scaleTime = d3.scaleTime()
  .domain([new Date(2016, 0, 15, 0), new Date(2016, 0, 16, 0)])
  .range([0, 24 * 43])
var lineForMarley = d3.line()
  .y(function (d) {
    return scaleStation(d.km)
  })
  .x(function (d) {
    return scaleTime(d.time)
  })

// 1. KM Axis
var axisKM = d3.axisLeft(scale).ticks(16)
svg.append('g')
  .attr('transform', 'translate(33,20)')
  .call(axisKM)

// 2. Marley time Axis
var bieudoTimeSVG = d3.select('#bieudo_chaytau_time_svg').append('svg')
  .attr('width', 24 * 43 + 122)
  .attr('height', 20)
var bieudoStationSVG = d3.select('#bieudo_chaytau_station_svg').append('svg')
  .attr('width', 50)
  .attr('height', lineLength * scaleRatio + 50)
var axisTime = d3.axisTop(scaleTime)
  .ticks(24)
  .tickFormat(d3.timeFormat('%H:%M'))
bieudoTimeSVG.append('g')
  .attr('transform', 'translate(60,20)')
  .call(axisTime)

// 2.1 Line

// 2. Route
var routeSvg = svg.append('g')
  .attr('class', 'route')
  .attr('transform', 'translate(200,20)')
  .attr('font-size', '12px')

var praseTimeString = function (time) {
  time = time.split(':')
  return new Date(2016, 0, 15, parseInt(time[0]), parseInt(time[1], 0))
}

// load data and process
d3.json('data/tet2018.json', function (data) {
  // process flexiable data for D3
  var dataLines = []
  var i = 0
  for (var d in data.sections) {
    dataLines[i] = data.sections[d]
    i++
  }

  var dataStations = []
  i = 0
  for (var d in data.stations) {
    dataStations[i] = data.stations[d]
    i++
  }

  var lines = routeSvg.selectAll('.line').data(dataLines)
  var stations = routeSvg.selectAll('.station').data(dataStations)
  var stationLabels = routeSvg.selectAll('.station_label').data(dataStations)
  var stationTicks = routeSvg.selectAll('.station_tick').data(dataStations)

  lines.enter().append('line')
    .attr('class', 'line')
    .attr('x1', 0)
    .style('shape-rendering', 'crispEdges')
    .attr('y1', function (d) {
      return scale(data.stations[d.station1].km)
    })
    .attr('x2', 0)
    .attr('y2', function (d) {
      return scale(data.stations[d.station2].km)
    })

  stationLabels.enter().append('text')
    .attr('class', 'station_label')
    .attr('x', function (d, i) {
      return i % 2 === 0 ? '-75' : '-15'
    })
    .attr('y', function (d) {
      return (scale(d.km))
    })
    .attr('dy', '0.32em')
    .text(function (d) {
      return d.name
    })

  stationTicks.enter().append('line')
    .attr('class', 'station_tick')
    .attr('fill', 'none')
    .attr('stroke', '#000')
    .style('shape-rendering', 'crispEdges')
    .attr('y2', function (d, i) {
      return (scale(d.km))
    })
    .attr('y1', function (d, i) {
      return (scale(d.km))
    })
    .attr('x1', function (d, i) {
      return i % 2 === 0 ? '-70' : '-10'
    })
    .attr('x2', '-3')

  var timeToMin = function (time) {
    var parts = time.split(':')
    return parseInt(parts[0]) * 60 + parseInt(parts[1])
  }

  var dayToMin = function (day) {
    return day * 24 * 60
  }

  // Train data
  var trains = []
  var trainCircles = []
  var trainLastPos = []
  var trainLabels = []

  var setTrainsByTime = function (time) {
    var total = trains.length
    for (i = 0; i < total; i++) {
      setTrainByTime(i, time)
    }
  }

  var setTrainByTime = function (index, time) {
    if (time < trains[index].start) {
      trainCircles[index].style('opacity', 0)
      trainLabels[index].style('opacity', 0)
      return
    }

    if (time > trains[index].end) {
      trainCircles[index].style('opacity', 0)
      trainLabels[index].style('opacity', 0)
      return
    }

    var route = 0
    if (trainLastPos[index] === null) {
      var totalRoutes = trains[index].route.length
      var totalTimes = trains[index].end - trains[index].start
      var avgTimeForRoute = totalTimes / totalRoutes
      var currentTime = time - trains[index].start
      var preRoutes = Math.ceil(currentTime / avgTimeForRoute) - 1
      preRoutes = preRoutes < 0 ? 0 : preRoutes
      preRoutes = preRoutes > totalRoutes ? totalRoutes : preRoutes
      var direction = 1
      if (time < trains[index].route[preRoutes].start) {
        direction = -1
      }

      do {
        if (trains[index].route[preRoutes].start <= time && trains[index].route[preRoutes].out >= time) {
          route = preRoutes
          break
        }
        preRoutes = preRoutes + direction
      } while (true)
    } else {
      route = trainLastPos[index]
      do {
        if (trains[index].route[route].start <= time && trains[index].route[route].out >= time) {
          break
        }
        route++
      } while (true)
    }

    var station1 = trains[index].route[route].station1
    var station2 = trains[index].route[route].station2
    var routeLenght = data.stations[station2].km - data.stations[station1].km
    var routeDuration = trains[index].route[route].in - trains[index].route[route].start
    var routeRunningTime = trains[index].route[route].in - time
    if (routeRunningTime < 0) routeRunningTime = 0
    routeRunningTime = routeDuration - routeRunningTime
    var currentPos = data.stations[station1].km + routeRunningTime * routeLenght / routeDuration
    trainCircles[index].style('opacity', 1)
    trainCircles[index].attr('cy', currentPos * scaleRatio)
    trainCircles[index].attr('cy', currentPos * scaleRatio)
    trainLabels[index].style('opacity', 1)
    trainLabels[index].attr('y', currentPos * scaleRatio)
    trainLastPos[index] = route
  }

  var createTrain = function (name, route, day) {
    var train = {
      'name': name + '_' + day,
      'start': '',
      'end': '',
      'route': []
    }

    var i = 0
    for (var key in data.routes[route].sections) {
      var dayStart = data.routes[route].sections[key].time1OutDay + day
      var dayIn = data.routes[route].sections[key].time2InDay + day
      var dayOut = data.routes[route].sections[key].time2OutDay + day
      var timeStart = timeToMin(data.routes[route].sections[key].time1Out)
      var timeIn = timeToMin(data.routes[route].sections[key].time2In)
      var timeOut = timeToMin(data.routes[route].sections[key].time2Out)

      train.route[i] = {}
      train.route[i].start = timeStart + dayToMin(dayStart)
      train.route[i].in = timeIn + dayToMin(dayIn)
      train.route[i].out = timeOut + dayToMin(dayOut)
      train.route[i].station1 = data.routes[route].sections[key].station1
      train.route[i].station2 = data.routes[route].sections[key].station2

      i++
    }

    train.start = train.route[0].start
    train.end = train.route[i - 1].out

    // add data
    trains.push(train)

    // add cirlce
    var cir = routeSvg.append('circle')
      // .attr('id', 'train_se1')
      .attr('class', 'train t_' + route + '_f')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 3)
      .style('opacity', 0)
    trainCircles.push(cir)

    // add label
    var text = routeSvg.append('text')
      .attr('class', 'train_label')
      .attr('x', 5)
      .attr('y', 0)
      .attr('dy', '0.32em')
      .text(train.name)
      .style('opacity', 0)
    trainLabels.push(text)

    trainLastPos.push(null)
  }

  var resetLastPos = function () {
    for (var pos in trainLastPos) {
      trainLastPos[pos] = null
    }
  }

  var timer = d3.select('#timer')

  var updateTimer = function (time) {
    var midnightToNow = Math.round(time) % (60 * 24)
    var hh = Math.floor(midnightToNow / 60)
    var mm = midnightToNow - (hh * 60)

    hh = hh < 10 ? '0' + hh : hh
    mm = mm < 10 ? '0' + mm : mm

    timer.text(hh + ':' + mm)
  }

  for (i = 0; i <= 4; i++) {
    createTrain('se1', 'se1', i)
    createTrain('se3', 'se3', i)
    createTrain('se5', 'se5', i)
    createTrain('se7', 'se7', i)
    createTrain('se9', 'se9', i)
    createTrain('se13', 'se13', i)
    createTrain('tn3', 'tn3', i)
    createTrain('tn5', 'tn5', i)
    createTrain('tn7', 'tn7', i)
    createTrain('se17', 'se17', i)
    createTrain('se11', 'se11', i)
    createTrain('se15', 'se15', i)
    createTrain('se21', 'se21', i)
    createTrain('se35', 'se35', i)
    createTrain('na1', 'na1', i)
    createTrain('snt1', 'snt1', i)
    createTrain('sqn1', 'sqn1', i)
    createTrain('se25', 'se25', i)
    createTrain('spt1', 'spt1', i)
    
    createTrain('se2', 'se2', i)
    createTrain('se4', 'se4', i)
    createTrain('se5', 'se6', i)
    createTrain('se6', 'se8', i)
    createTrain('se10', 'se10', i)
    createTrain('se14', 'se14', i)
    createTrain('tn4', 'tn4', i)
    createTrain('tn6', 'tn6', i)
    createTrain('tn8', 'tn8', i)
    createTrain('se18', 'se18', i)
    createTrain('se12', 'se12', i)
    createTrain('se16', 'se16', i)
    createTrain('se22', 'se22', i)
    createTrain('se36', 'se36', i)
    createTrain('na2', 'na2', i)
    createTrain('snt2', 'snt2', i)
    createTrain('sqn2', 'sqn2', i)
    createTrain('se26', 'se26', i)
    createTrain('spt2', 'spt2', i)
  }

  // Simualator control
  var simIsPaused = false
  /**
   * Khoảng thời gian dài nhất để một tàu thực hiện hành trình là 3 ngày
   * Vì vậy khi chạy mô phỏng 1 ngày, mỗi tàu sẽ có lịch trình cho 3 ngày
   * và thời gian thiết lập tứng với ngày thứ 3
   */
  var simTime = 2 * 24 * 60

  var simPause = function () {
    simIsPaused = true
  }

  var simPlay = function () {
    simIsPaused = false
  }

  var simRunningStatus = function () {
    return !simIsPaused
  }

  var simSetTime = function (time) {
    var status = simRunningStatus()
    if (status) simPause()

    simTime = 2 * 24 * 60 + time
    resetLastPos()

    if (status) {
      simPlay()
    } else {
      setTrainsByTime(simTime)
      updateTimer(simTime)
    }
  }

  var simEnable = function () {
    if (!simIsPaused) {
      setTrainsByTime(simTime)
      updateTimer(simTime)
      simTime += 0.3
      if (simTime >= 3 * 24 * 60) {
        resetLastPos()
        simTime = simTime - 1 * 24 * 60
      }
    }
    setTimeout(simEnable, 100)
  }

  simEnable()

  // Control button
  // apply setting timer
  d3.select('#sim_setting').on('click', function () {
    d3.select('#simulator_options').classed('show', true)
  })

  d3.select('#sim_toggle').on('click', function () {
    var _this = d3.select(this)
    if (simRunningStatus()) {
      simPause()
      _this.html('<i class="material-icons">play_arrow</i>')
      return true
    }

    simPlay()
    _this.html('<i class="material-icons">pause</i>')
  })

  // Sim setting
  d3.select('#play_from_setting').on('click', function () {
    var time = d3.select('#time_to_start').property('value').trim()
    if (!/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      alert('Thời gian không đúng, vui lòng nhập từ 00:00 đến 23:59')
      return false
    }

    simSetTime(timeToMin(time))
    d3.select('#simulator_options').select('.close_button').dispatch('click')
  })

  // modal close
  d3.select('.close_button').on('click', function () {
    var _this = d3.select(this)
    var _modal = '#' + _this.attr('data-modal')
    d3.select(_modal).classed('show', false)
  })

  /**
   * Vẽ biểu đồ
   */

  // Dữ liệu
  var dataTimeTable = []

  var getTrainDiagramData = function (route) {
    var point = []
    var i = 0
    var lastKm = 0
    var lastTime = '000:000'
    point[i] = []

    var addPoint = function (km, time, type) {
      if (time === lastTime) {
        return
      }

      if (timeToMin(time) < timeToMin(lastTime)) {
        console.log(time, lastTime, route)
        var l = km - lastKm
        var t1 = timeToMin('24:00') - timeToMin(lastTime)
        var t2 = timeToMin(time) - 0
        var km1 = Math.floor(t1 / (t1 + t2) * l) + lastKm
        point[i].push({
          km: km1,
          time: praseTimeString('24:00')
        })
        i++
        point[i] = []
        point[i].push({
          km: km1,
          time: praseTimeString('00:00')
        })
      }

      point[i].push({
        km: km,
        time: praseTimeString(time),
        t: 's',
        ti: time,
        type: type
      })
      lastKm = km
      lastTime = time
    }

    var count = 0
    for (var section in data.routes[route].sections) {
      var info = data.routes[route].sections[section]
      if (count === 0) {
        addPoint(data.stations[info.station1].km, info.time1In, 'i')
        addPoint(data.stations[info.station1].km, info.time1Out, 'o')
      }
      addPoint(data.stations[info.station2].km, info.time2In, 'i')
      addPoint(data.stations[info.station2].km, info.time2Out, 'o')
      count++
    }

    return {
      route: route,
      point: point
    }
  }

  for (var route in data.routes) {
    dataTimeTable.push(getTrainDiagramData(route))
  }

  var formatTime = function (time) {
    var a = time.split(':')
    return '.' + a[1]
  }

  // Chú thích ga
  var diagramHelper = bieudoStationSVG.append('g')
    .attr('transform', 'translate(0,30)')
    .attr('class', 'station_helper')
    .selectAll('g')
    .data(dataStations)

  var lineHelper = bieudoSVG.append('g')
    .attr('transform', 'translate(60,30)')
    .attr('class', 'line_helper')
    .selectAll('g')
    .data(dataStations)

  diagramHelper.enter().append('text')
    .attr('x', function (d, i) {
      return i % 2 === 0 ? '0' : '20'
    })
    .attr('y', function (d) {
      return (scale(d.km))
    })
    .attr('dy', '0.32em')
    .text(function (d) {
      return d.code
    })

  lineHelper.enter().append('line')
    .attr('y2', function (d, i) {
      return (scaleStation(d.km))
    })
    .attr('y1', function (d, i) {
      return (scaleStation(d.km))
    })
    .attr('x1', 0)
    .attr('x2', 24 * 43)

  // Chú thích giờ
  var timeHelper = bieudoSVG.append('g')
    .attr('transform', 'translate(60,0)')
    .attr('class', 'time_helper')
    .selectAll('g')
    .data([
      '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00',
      '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
      '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
      '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'
    ])

  timeHelper.enter().append('line')
    .attr('y1', 30)
    .attr('x1', function (d, i) {
      return i * 43
    })
    .attr('x2', function (d, i) {
      return i * 43
    })
    .attr('y2', 30 + lineLength * scaleRatio)

  // Tạp biểu đồ
  var trainPath = bieudoSVG.append('g')
    .attr('transform', 'translate(60,30)')
    .selectAll('g')
    .data(dataTimeTable)
    .enter().append('g')
    .attr('class', function (d) {
      return 'train_detail t_' + d.route
    })
    .selectAll('g')
    .data(function (d) {
      return d.point
    })
    .enter()

  trainPath.append('path')
    .attr('d', function (d) {
      return lineForMarley(d)
    })
    .on('mouseover', routeMouseOver)
    .on('mouseout', routeMouseOut)

  trainPath.selectAll('circle')
    .data(function (d) {
      return d.filter(function (d) {
        return d.t === 's'
      })
    })
    .enter().append('circle')
    .style('opacity', 0)
    .attr('transform', function (d) {
      return 'translate(' + scaleTime(d.time) + ',' + scaleStation(d.km) + ')'
    })
    .attr('r', 2)

  trainPath.selectAll('text')
    .data(function (d) {
      return d.filter(function (d) {
        return d.t === 's'
      })
    })
    .enter().append('text')
    .style('opacity', 0)
    .attr('transform', function (d) {
      var adjust = 5
      if (d.type === 'i') adjust = -15
      return 'translate(' + (scaleTime(d.time) + adjust) + ',' + (scaleStation(d.km) + 3) + ')'
    })
    .text(function (d) {
      return formatTime(d.ti)
    })

  // position
  var w = $(window)
  var inner = $('#bieudo_chaytau')
  w.on('scroll', function () {
    var bieudo_offset_top = $('#bieudo_chaytau').offset().top
    var bieudo_h = $('#bieudo_chaytau').outerHeight()
    var window_scroll_h = w.scrollTop()
    if (window_scroll_h > bieudo_offset_top && window_scroll_h < bieudo_offset_top + bieudo_h - 40) {
      $('#bieudo_chaytau_time_svg').css('top', window_scroll_h - bieudo_offset_top)
    } else {
      $('#bieudo_chaytau_time_svg').css('top', 0)
    }

    var bieudo_mophong_offset_top = $('#bieudo_mophong').offset().top
    var bieudo_mophong_h = $('#bieudo_mophong').outerHeight()

    if (window_scroll_h > bieudo_mophong_offset_top && window_scroll_h < bieudo_mophong_offset_top + bieudo_mophong_h - 250) {
      $('#bieudo_thongtin').css('top', window_scroll_h - bieudo_mophong_offset_top)
    } else if (window_scroll_h <= bieudo_mophong_offset_top) {
      $('#bieudo_thongtin').css('top', 0)
    }
  })
  inner.on('scroll', function () {
    var inner_scroll_left = inner.scrollLeft()
    $('#bieudo_chaytau_station_svg').css('left', inner_scroll_left)
  })
})

function routeMouseOver(d, i) {
  d3.select(this.parentNode).selectAll('text').style('opacity', 1)
  d3.select(this.parentNode).selectAll('circle').style('opacity', 1)
  d3.select(this.parentNode).moveToFront()
}

function routeMouseOut(d, i) {
  d3.select(this.parentNode).selectAll('text').style('opacity', 0)
  d3.select(this.parentNode).selectAll('circle').style('opacity', 0)
}
