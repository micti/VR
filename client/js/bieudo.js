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

// Mô phỏng chạy tàu bắc nam
// Todo
// - Biểu diễn các ga
// - Biểu diễn lại đoạn Đà Nẵng - Thanh Khê
// - Biểu diễn lại đoạn Diêu Trì - Quy nhơn, Bình Thuận - Phan thiết

// Xây dựng mô phỏng
var builder = async function (dataFile) {
  var data = await d3.json(dataFile)

  simConfig.init(data)
  // Cứ 100ms tính toán lại vị trí các tàu, nên tốc độ 0.3 ứng với 1s mô phỏng bằng 3s thực tế
  sim.init(0.3)
  marley.init()
  simControl.init()
}

// Cấu hình và các hàm trợ giúp
var simConfig = {
  init: function (data) {
    simConfig.data = data
    simConfig.scaleStation = d3.scaleLinear().domain([0, simConfig.lineLength]).range([0, simConfig.lineLength * simConfig.scaleRatio])
    simConfig.scaleTime = d3.scaleTime()
      .domain([new Date(2016, 0, 15, 0), new Date(2016, 0, 16, 0)])
      .range([0, 24 * 43])

    for (var d in simConfig.data.sections) {
      simConfig.dataLines.push(simConfig.data.sections[d])
    }

    for (var d in data.stations) {
      simConfig.dataStations.push(data.stations[d])
    }
  },
  data: null,
  dataStations: [],
  dataLines: [],
  lineLength: 1726,
  scaleRatio: 3,
  scaleStation: null,
  scaleTime: null,
  praseTimeString: function(time) {
    time = time.split(':')
    return new Date(2016, 0, 15, parseInt(time[0]), parseInt(time[1], 0))
  },
  timeToMin: function(time) {
    parts = time.split(':')
    return parseInt(parts[0]) * 60 + parseInt(parts[1])
  },

  dayToMin: function(day) {
    return day * 24 * 60
  }
}

// Sim
var sim = {
  // Init
  init: function(speed) {
    sim.render()

    sim.speed = speed
    for (train in simConfig.data.routes) {
      for (i = 0; i <= 4; i++) {
        sim.createTrain(train, train, i)
      }
    }
    sim.simEnable()
  },

  render: function() {
    // Khai báo thông số
    var width = 1200
    var height = (simConfig.lineLength + 20) * simConfig.scaleRatio

    var svg = d3.select('#bieudo').append('svg')
      .attr('width', 250)
      .attr('height', height)

    // Cột KM
    var axisKM = d3.axisLeft(simConfig.scaleStation).ticks(32)
    svg.append('g')
      .attr('transform', 'translate(33,20)')
      .call(axisKM)

    var routeSvg = svg.append('g')
      .attr('class', 'route')
      .attr('transform', 'translate(200,20)')
      .attr('font-size', '12px')

    sim.sgv = routeSvg

    var lines = routeSvg.selectAll('.line').data(simConfig.dataLines)
    var stations = routeSvg.selectAll('.station').data(simConfig.dataStations)
    var stationLabels = routeSvg.selectAll('.station_label').data(simConfig.dataStations)
    var stationTicks = routeSvg.selectAll('.station_tick').data(simConfig.dataStations)

    lines.enter().append('line')
      .attr('class', 'line')
      .attr('x1', 0)
      .attr('y1', function(d) {
        return simConfig.scaleStation(simConfig.data.stations[d.station1].km)
      })
      .attr('x2', 0)
      .attr('y2', function(d) {
        return simConfig.scaleStation(simConfig.data.stations[d.station2].km)
      });

    // stations.enter().append('circle')
    //   .attr('class', 'station')
    //   .attr('cx', 0)
    //   .attr('cy', function(d) {
    //     return scaleStation(d.km)
    //   })
    //   .attr('r', 2)

    stationLabels.enter().append('text')
      .attr('class', 'station_label')
      .attr('x', function(d, i) {
        return i % 2 === 0 ? '-75' : '-15'
      })
      .attr('y', function(d) {
        return simConfig.scaleStation(d.km)
      })
      .attr('dy', '0.32em')
      .text(function(d) {
        return d.name
      })

    stationTicks.enter().append('line')
      .attr('class', 'station_tick')
      .attr('y2', function(d, i) {
        return simConfig.scaleStation(d.km)
      })
      .attr('y1', function(d, i) {
        return simConfig.scaleStation(d.km)
      })
      .attr('x1', function(d, i) {
        return i % 2 === 0 ? '-70' : '-10'
      })
      .attr('x2', '-3')
  },

  // Data
  data: null,
  trains: [],
  trainCircles: [],
  trainLastPos: [],
  trainLabels: [],

  // Tỉlệ phóng to thu nhỏ
  scale: 3,

  sgv: null,

  // Tốc độ mô phỏng
  // 0.3 -> 1s mô phỏng bằng 3s thực tế
  speed: 0.1,

  setTrainsByTime: function(time) {
    var total = sim.trains.length
    for (i = 0; i < total; i++) {
      sim.setTrainByTime(i, time)
    }
  },

  setTrainByTime: function(index, time) {
    if (time < sim.trains[index].start) {
      sim.trainCircles[index].style('opacity', 0)
      sim.trainLabels[index].style('opacity', 0)
      return
    }

    if (time > sim.trains[index].end) {
      sim.trainCircles[index].style('opacity', 0)
      sim.trainLabels[index].style('opacity', 0)
      return
    }

    var route = 0
    if (sim.trainLastPos[index] === null) {
      var totalRoutes = sim.trains[index].route.length
      var totalTimes = sim.trains[index].end - sim.trains[index].start
      var avgTimeForRoute = totalTimes / totalRoutes
      var currentTime = time - sim.trains[index].start
      var preRoutes = Math.ceil(currentTime / avgTimeForRoute) - 1
      preRoutes = preRoutes < 0 ? 0 : preRoutes
      preRoutes = preRoutes > totalRoutes ? totalRoutes : preRoutes
      var direction = 1
      if (time < sim.trains[index].route[preRoutes].start) {
        direction = -1
      }
      do {
        if (sim.trains[index].route[preRoutes].start <= time && sim.trains[index].route[preRoutes].out >= time) {
          route = preRoutes
          break;
        }
        preRoutes = preRoutes + direction
      } while (true)
    } else {
      route = sim.trainLastPos[index]
      do {
        if (sim.trains[index].route[route].start <= time && sim.trains[index].route[route].out >= time) {
          break
        }
        route++
      } while (true)
    }

    var station1 = sim.trains[index].route[route].station1
    var station2 = sim.trains[index].route[route].station2
    var routeLenght = simConfig.data.stations[station2].km - simConfig.data.stations[station1].km;
    var routeDuration = sim.trains[index].route[route].in - sim.trains[index].route[route].start;
    var routeRunningTime = sim.trains[index].route[route].in - time;
    if (routeRunningTime < 0) routeRunningTime = 0;
    routeRunningTime = routeDuration - routeRunningTime;
    var currentPos = simConfig.data.stations[station1].km + routeRunningTime * routeLenght / routeDuration;
    sim.trainCircles[index].style('opacity', 1);
    sim.trainCircles[index].attr('cy', currentPos * sim.scale)
    sim.trainCircles[index].attr('cy', currentPos * sim.scale)
    sim.trainLabels[index].style('opacity', 1);
    sim.trainLabels[index].attr('y', currentPos * sim.scale)
    sim.trainLastPos[index] = route
  },

  createTrain: function(name, route, day) {
    var train = {
      'name': name + '_' + day,
      'start': '',
      'end': '',
      'route': []
    }

    var i = 0;
    for (var key in simConfig.data.routes[route].sections) {
      var dayStart = simConfig.data.routes[route].sections[key].time1OutDay + day
      var dayIn = simConfig.data.routes[route].sections[key].time2InDay + day
      var dayOut = simConfig.data.routes[route].sections[key].time2OutDay + day
      var timeStart = simConfig.timeToMin(simConfig.data.routes[route].sections[key].time1Out)
      var timeIn = simConfig.timeToMin(simConfig.data.routes[route].sections[key].time2In)
      var timeOut = simConfig.timeToMin(simConfig.data.routes[route].sections[key].time2Out)

      train.route[i] = {}
      train.route[i].start = timeStart + simConfig.dayToMin(dayStart)
      train.route[i].in = timeIn + simConfig.dayToMin(dayIn)
      train.route[i].out = timeOut + simConfig.dayToMin(dayOut)
      train.route[i].station1 = simConfig.data.routes[route].sections[key].station1
      train.route[i].station2 = simConfig.data.routes[route].sections[key].station2

      i++;
    }

    train.start = train.route[0].start
    train.end = train.route[i - 1].out

    // add data
    sim.trains.push(train)

    // add cirlce
    var cir = sim.sgv.append('circle')
      //.attr('id', 'train_se1')
      .attr('class', 'train t_' + route + '_f')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 3)
      .style('opacity', 0)
    sim.trainCircles.push(cir)

    // add label
    var text = sim.sgv.append('text')
      .attr('class', 'train_label')
      .attr('x', 5)
      .attr('y', 0)
      .attr('dy', '0.32em')
      .text(train.name)
      .style('opacity', 0)
    sim.trainLabels.push(text)

    sim.trainLastPos.push(null)
  },
  resetLastPos: function() {
    for (var pos in sim.trainLastPos) {
      sim.trainLastPos[pos] = null
    }
  },
  updateTimer: function(time) {
    var midnightToNow = Math.round(time) % (60 * 24);
    var hh = Math.floor(midnightToNow / 60);
    var mm = midnightToNow - (hh * 60);

    hh = hh < 10 ? '0' + hh : hh;
    mm = mm < 10 ? '0' + mm : mm;

    d3.select('#timer').text(hh + ':' + mm)
  },

  simIsPaused: false, // Simualator control

  /**
   * Khoảng thời gian dài nhất để một tàu thực hiện hành trình là 3 ngày
   * Vì vậy khi chạy mô phỏng 1 ngày, mỗi tàu sẽ có lịch trình cho 3 ngày
   * và thời gian thiết lập tứng với ngày thứ 3
   */
  simTime: 2 * 24 * 60,

  simPause: function() {
    sim.simIsPaused = true;
  },

  simPlay: function() {
    sim.simIsPaused = false;
  },

  simRunningStatus: function() {
    return !sim.simIsPaused;
  },

  simSetTime: function(time) {
    var status = sim.simRunningStatus()
    if (status) sim.simPause()

    sim.simTime = 2 * 24 * 60 + time
    sim.resetLastPos()

    if (status) {
      sim.simPlay()
    } else {
      sim.setTrainsByTime(sim.simTime)
      sim.updateTimer(sim.simTime)
    }
  },

  simEnable: function() {
    if (!sim.simIsPaused) {
      sim.setTrainsByTime(sim.simTime)
      sim.updateTimer(sim.simTime)
      sim.simTime += sim.speed
      if (sim.simTime >= 3 * 24 * 60) {
        sim.resetLastPos()
        sim.simTime = sim.simTime - 1 * 24 * 60
      }
    }
    setTimeout(sim.simEnable, 100)
  }
}

// Biểu đồ Marley
var marley = {
  init: function() {
    marley.render()
  },

  render: function() {
    // Tạo dữ liệu
    for (var route in simConfig.data.routes) {
      marley.dataTimeTable.push(marley.getTrainDiagramData(route))
    }

    //
    var bieudoSVG = d3.select('#bieudo_chaytau_svg').append('svg')
      .attr('width', 24 * 43 + 70)
      .attr('height', simConfig.lineLength * simConfig.scaleRatio + 50);
    var bieudoTimeSVG = d3.select('#bieudo_chaytau_time_svg').append('svg')
      .attr('width', 24 * 43 + 122)
      .attr('height', 20);
    var bieudoStationSVG = d3.select('#bieudo_chaytau_station_svg').append('svg')
      .attr('width', 50)
      .attr('height', simConfig.lineLength * simConfig.scaleRatio + 50);
    var axisTime = d3.axisTop(simConfig.scaleTime)
      .ticks(24)
      .tickFormat(d3.timeFormat('%H:%M'))
    bieudoTimeSVG.append('g')
      .attr('transform', 'translate(60,20)')
      .call(axisTime)
    var lineForMarley = d3.line()
      .y(function(d) {
        return simConfig.scaleStation(d.km)
      })
      .x(function(d) {
        return simConfig.scaleTime(d.time)
      })

    // Chú thích ga
    var diagramHelper = bieudoStationSVG.append('g')
      .attr('transform', 'translate(0,30)')
      .attr('class', 'station_helper')
      .selectAll('g')
      .data(simConfig.dataStations)

    var lineHelper = bieudoSVG.append('g')
      .attr('transform', 'translate(60,30)')
      .attr('class', 'line_helper')
      .selectAll('g')
      .data(simConfig.dataStations)

    diagramHelper.enter().append('text')
      .attr('x', function(d, i) {
        return i % 2 === 0 ? '0' : '20'
      })
      .attr('y', function(d) {
        return (simConfig.scaleStation(d.km));
      })
      .attr('dy', '0.32em')
      .text(function(d) {
        return d.code
      })

    lineHelper.enter().append('line')
      .attr('y2', function(d, i) {
        return (simConfig.scaleStation(d.km))
      })
      .attr('y1', function(d, i) {
        return (simConfig.scaleStation(d.km))
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
      .attr('x1', function(d, i) {
        return i * 43
      })
      .attr('x2', function(d, i) {
        return i * 43
      })
      .attr('y2', 30 + simConfig.lineLength * simConfig.scaleRatio)

    // Tạp biểu đồ
    var trainPath = bieudoSVG.append('g')
      .attr('transform', 'translate(60,30)')
      .selectAll('g')
      .data(marley.dataTimeTable)
      .enter().append('g')
      .attr('class', function(d) {
        return 'train_detail t_' + d.route;
      })
      .selectAll('g')
      .data(function(d) {
        return d.point
      })
      .enter()

    trainPath.append('path')
      .attr('d', function(d) {
        return lineForMarley(d);
      })
      .on('mouseover', marley.routeMouseOver)
      .on('mouseout', marley.routeMouseOut)

    trainPath.selectAll('circle')
      .data(function(d) {
        return d.filter(function(d) {
          return d.t === 's'
        })
      })
      .enter().append('circle')
      .style('opacity', 0)
      .attr('transform', function(d) {
        return 'translate(' + simConfig.scaleTime(d.time) + ',' + simConfig.scaleStation(d.km) + ')';
      })
      .attr('r', 2)

    trainPath.selectAll('text')
      .data(function(d) {
        return d.filter(function(d) {
          return d.t === 's'
        })
      })
      .enter().append('text')
      .style('opacity', 0)
      .attr('transform', function(d) {
        var adjust = 5
        if (d.type === 'i') adjust = -15
        return 'translate(' + (simConfig.scaleTime(d.time) + adjust) + ',' + (simConfig.scaleStation(d.km) + 3) + ')';
      })
      .text(function(d) {
        return marley.formatTime(d.ti)
      })

    // On Scorll
    var w = $(window);
    var inner = $('#bieudo_chaytau');
    var isOnScrollCall = false;
    var updatePos = function() {
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

      isOnScrollCall = false
    }
    var updatePos2 = function() {
      var inner_scroll_left = inner.scrollLeft()
      $('#bieudo_chaytau_station_svg').css('left', inner_scroll_left)
      isOnScrollCall = false
    }
    w.on('scroll', function() {
      if(!isOnScrollCall) {
        requestAnimationFrame(updatePos)
      }
      isOnScrollCall = true;
    })
    inner.on('scroll', function() {
      if(!isOnScrollCall) {
        requestAnimationFrame(updatePos2)
      }
      isOnScrollCall = true;
    })
  },

  formatTime: function(time) {
    var a = time.split(':')
    return '.' + a[1]
  },

  dataTimeTable: [],

  getTrainDiagramData: function(route) {
    var point = []
    var i = 0
    var lastKm = 0
    var lastTime = '000:000'
    point[i] = []

    var addPoint = function(km, time, type) {
      if (time === lastTime) {
        return;
      }

      if (simConfig.timeToMin(time) < simConfig.timeToMin(lastTime)) {
        //console.log(time, lastTime, route)
        var l = km - lastKm
        var t1 = simConfig.timeToMin('24:00') - simConfig.timeToMin(lastTime)
        var t2 = simConfig.timeToMin(time) - 0
        var km1 = Math.floor(t1 / (t1 + t2) * l) + lastKm
        point[i].push({
          km: km1,
          time: simConfig.praseTimeString('24:00')
        })
        i++
        point[i] = []
        point[i].push({
          km: km1,
          time: simConfig.praseTimeString('00:00')
        })
      }

      point[i].push({
        km: km,
        time: simConfig.praseTimeString(time),
        t: 's',
        ti: time,
        type: type
      })
      lastKm = km
      lastTime = time
    }

    var count = 0
    for (var section in simConfig.data.routes[route].sections) {
      var info = simConfig.data.routes[route].sections[section];
      if (count === 0) {
        addPoint(simConfig.data.stations[info.station1].km, info.time1In, 'i')
        addPoint(simConfig.data.stations[info.station1].km, info.time1Out, 'o')
      }
      addPoint(simConfig.data.stations[info.station2].km, info.time2In, 'i')
      addPoint(simConfig.data.stations[info.station2].km, info.time2Out, 'o')
      count++
    }

    return {
      route: route,
      point: point
    }
  },

  routeMouseOver: function (d, i) {
    d3.select(this.parentNode).selectAll('text').style('opacity', 1)
    d3.select(this.parentNode).selectAll('circle').style('opacity', 1)
    d3.select(this.parentNode).moveToFront()
  },

  routeMouseOut: function (d, i) {
    d3.select(this.parentNode).selectAll('text').style('opacity', 0)
    d3.select(this.parentNode).selectAll('circle').style('opacity', 0)
  }
}

var simControl = {
  init: function () {
    // Control button
    // apply setting timer
    d3.select("#sim_setting").on('click', function() {
        d3.select('#simulator_options').classed('show', true)
    })

    d3.select("#sim_toggle").on('click', function() {
        var _this = d3.select(this)
        if (sim.simRunningStatus()) {
            sim.simPause()
            _this.html('<i class="material-icons">play_arrow</i>')
            return true
        }

        sim.simPlay()
        _this.html('<i class="material-icons">pause</i>')
    })

    // Sim setting
    d3.select('#play_from_setting').on('click', function() {
         var time = d3.select('#time_to_start').property('value').trim()
         if (!/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
             alert('Thời gian không đúng, vui lòng nhập từ 00:00 đến 23:59')
             return false
         }

         sim.simSetTime(simConfig.timeToMin(time))
         d3.select('#simulator_options').select('.close_button').dispatch('click')
    })

    // modal close
    d3.select('.close_button').on('click', function() {
        var _this = d3.select(this)
        var _modal = '#' + _this.attr('data-modal')
        d3.select(_modal).classed('show', false)
    })
  }
}
