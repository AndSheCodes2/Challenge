var net = require('net');
var fs = require('fs');

var HOST = 'challenge2';
var PORT = 2324;
var EMAIL = '';

var client = new net.Socket();
var buffer = new Buffer(0, 'binary');

var dump = "dump.dat";
var process = "processed.dat"

function logic() {
    if (fs.existsSync(dump)) {
        processDump();
    }
    else{
        client.connect(PORT, HOST, function() {
            console.log('CONNECTED TO: ' + HOST + ':' + PORT);
        });
    }
}

client.on('data', function(data) {
    if (new String(data).split(":")[0] == "WHORU") {
        var id = new String(data).split(":")[1];
        id = id.substring(0, id.length - 1);
        client.write("IAM:"+ id + ":" + EMAIL+"\n");
    }
    else if (new String(data).split(":")[0] == "SUCCESS") {
        console.log(""+data);
    }
    else{
        buffer = Buffer.concat([buffer, new Buffer(data,'binary')]);
        client.destroy();
    }    
});

client.on("end", function(data) {
    console.log("End called");
    fs.writeFile(dump, buffer, function(err) {
        if(err) {
            console.log(err);
        } else {
            console.log("Data written");
            logic();
        }
    });
});

client.on('close', function() {
    console.log('Connection closed');
});

function processDump() {
    var b3 = fs.readFileSync(dump);
    processData(b3);
}

function processData(buff){
    var res = {};
    var seq = 0;
    var len = 0;
    var total_len = 0;
    var packet_len = 0;
    for (var i = 0 ; packet_len < buff.length ; i++) {
        seq = buff.readInt32BE(i*12 + total_len);
	len = buff.readInt32BE(i*12 + total_len + 8);
        var seq_buff = buff.slice(i*12 + total_len, i*12 + total_len + 4);
        var chk_buff = buff.slice(i*12 + total_len + 4, i*12 + total_len + 8);
        var data_buff = buff.slice(i*12 + total_len + 12, i*12 + total_len + 12 + len);
        var packet = { seq_buff : seq_buff , chk_buff : chk_buff , len : len , data_buff : data_buff };
	total_len += len;
        packet_len += 12 + len;
        if (isValidPacket(packet)) {
            if (res[seq] == undefined ) {
                res[seq] = packet.data_buff;
            }
            else{
                console.log("SEQ Present",seq);
            }
        }
    }
    var final_buff = new Buffer(0);
    for (var key in res ) {
        final_buff = Buffer.concat([final_buff,res[key]]);
    }
    fs.writeFileSync(process,final_buff);
}

function isValidPacket(packet) {
    var tlcval = new Buffer(4);
    packet.seq_buff.copy(tlcval);
    for (var i = 0; i < packet.len ; i+=4) {
        var buf = packet.data_buff.slice(i,i+4);
        if (buf.length % 4 != 0) {
            for (var j=buf.length; j<4 ; j++) {
                buf = Buffer.concat([buf, new Buffer([171])]);
            }
        }
        tlcval = xor(tlcval,buf);
    }
    return equal(packet.chk_buff,tlcval);
}

function xor(a, b) {
  if (!Buffer.isBuffer(a)) a = new Buffer(a)
  if (!Buffer.isBuffer(b)) b = new Buffer(b)
  var res = []
  if (a.length > b.length) {
    for (var i = 0; i < b.length; i++) {
      res.push(a[i] ^ b[i])
    }
  } else {
    for (var i = 0; i < a.length; i++) {
      res.push(a[i] ^ b[i])
    }
  }
  return new Buffer(res);
}

function equal(a, b) {
  if (!Buffer.isBuffer(a)) a = new Buffer(a);
  if (!Buffer.isBuffer(b)) b = new Buffer(b);
  if (a.length > b.length) {
    for (var i = 0; i < b.length; i++) {
        if (a[i] != b[i]) {
            return false;
        }
    }
  } else {
    for (var i = 0; i < a.length; i++) {
        if (a[i] != b[i]) {
            return false;
        }
    }
  }
  return true;
}

logic();
