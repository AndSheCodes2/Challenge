var async      = require('async'),
    unirest    = require('unirest'),
    _          = require('underscore');

var url        = ''
var breadcrumbs= []

function api(path){
  return unirest.get(url+path)
  .header({'X-Labyrinth-Email': process.env.user})
}

function trail(data){
  breadcrumbs.push({ roomId: data.roomId, writing: data.writing, order: data.order})
}

function move(room,direction,callback){
  api('/move?roomId='+room+'&exit='+direction)
    .end(function(data){
      data = JSON.parse(data.body)
      callback(null,data.roomId)
    })
}

function writing(room,callback){
  api('/wall?roomId='+room)
    .end(function(data){
      data = JSON.parse(data.body)
      trail({ roomId: room, writing: data.writing, order: data.order })
      callback(null,room)
    })
}

function exits(room,callback){
  api('/exits?roomId='+room)
    .end(function(data){
      data = JSON.parse(data.body)
      _.isNull(data.exits) ? false : navigate(room)
      callback(null,breadcrumbs)
    })
}

function broken_lights(data){
  return _.pluck(_.where(data,{ writing: 'xx'}),'roomId' )
}

function code(data){
  return _.pluck(_.sortBy(_.reject(data,function(i){ return i.writing == 'xx' }),function(i){ return i.order }),'writing').join('')
}

function submit_report(data){
  unirest.post(url+'/report')
    .header({'X-Labyrinth-Email': process.env.user, 'Accept': 'application/json'})
    .send(JSON.stringify({ roomIds: broken_lights(data), challenge: code(data) }))
    .end(function(data){
      console.log(data.body)
    })
}

function navigate(room,callback){
  api('/exits?roomId='+room)
    .end(function(data){
      data = JSON.parse(data.body)
      _.each(data.exits,function(i){
        var path = async.compose(exits,writing,move)
          path(room,i,function(err,result){
            if (err){ console.log('[navigate err] '+err) }
            submit_report(result)
          })
      })
    })
}

async.waterfall([
    function(callback){
      api('/start')
        .end(function(data){
          callback(null,JSON.parse(data.body).roomId)
        })
    },
    function(room,callback){
      api('/wall?roomId='+room)
        .end(function(data){
          data = JSON.parse(data.body)
          trail({ roomId: room, writing: data.writing, order: data.order })
          callback(null,room)
        })
    },
    function(room,callback){
      navigate(room,callback)
    }
  ],
  function(err,result){
    if (err){ console.dir(err) }
  })