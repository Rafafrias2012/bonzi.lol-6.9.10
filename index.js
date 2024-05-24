var http = require("http");
var fs = require("fs");
var express = require("express");

//Read settings
var colors = fs.readFileSync("./config/colors.txt").toString().replace(/\r/,"").split("\n");
var blacklist = fs.readFileSync("./config/blacklist.txt").toString().replace(/\r/,"").split("\n");
var colorBlacklist = fs.readFileSync("./config/colorBlacklist.txt").toString().replace(/\r/,"").split("\n");
var config = JSON.parse(fs.readFileSync("./config/config.json"));
if(blacklist.includes("")) blacklist = []; //If the blacklist has a blank line, ignore the whole list.

//Variables
var rooms = {};
var markuprules = {
  "**":"b",
  "__":"u",
  "--":"s",
  "~~":"i",
  "##":"font size=5",
}
var userips = {}; //It's just for the alt limit
var guidcounter = 0;
var app = new express();
app.use(express.static("./frontend"));
var server = require("http").createServer(app)
//Socket.io Server
var io = require("socket.io")(server, {
    allowEIO3: true
}
);
server.listen(config.port, () => {
    rooms["default"] = new room("default");
    console.log("running at http://bonzi.localhost:" + config.port);
});
io.on("connection", (socket) => {
  //First, verify this user fits the alt limit
  if(true || typeof userips[socket.request.connection.remoteAddress] == 'undefined') userips[socket.request.connection.remoteAddress] = 0;
  userips[socket.request.connection.remoteAddress]++; //remoce true || to turn on alt limit
  
  if(userips[socket.request.connection.remoteAddress] > config.altlimit){
    //If we have more than the altlimit, don't accept this connection and decrement the counter.
    userips[socket.request.connection.remoteAddress]--;
    socket.emit("errr", {code:104});
    socket.disconnect();
    return;
  }
  
  //Set up a new user on connection
    new user(socket);
});

//Now for the fun!

//Command list
var commands = {

  name:(victim,param)=>{
    if (param == "" || (param == "Fune" && victim.level<2) || param.length > config.namelimit) return;
    victim.public.name = param
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },
  
  asshole:(victim,param)=>{
  victim.room.emit("asshole",{
    guid:victim.public.guid,
    target:param,
  })
  },

  restart:(victim, param)=>{
    if(victim.level<2) return;
    for (thing in rooms)
      rooms[thing].emit("errr", {code: 104});
    process.exit();
  },
  
  color:(victim, param)=>{
    if (victim.statlocked)
      return;
    if (!param.startsWith("http"))
    param = param.toLowerCase();
    if(!param || colorBlacklist.includes(param) || (!param.startsWith("http") && !colors.includes(param))) param = colors[Math.floor(Math.random() * colors.length)];
    victim.public.color = param;
     victim.public.tagged = false;
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  }, 
  
  pitch:(victim, param)=>{
    param = parseInt(param);
    if(isNaN(param)) return;
    victim.public.pitch = param;
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },

  speed:(victim, param)=>{
    param = parseInt(param);
    if(isNaN(param) || param>400|| param<100) return;
    victim.public.speed = param;
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },
  
  godmode:(victim, param)=>{
    if(param == config.godword){
	victim.level = 2;
  victim.socket.emit("authlv",{level:2});
    }
  },

  pope:(victim, param)=>{
    if(victim.level<2) return;
    victim.public.color = "pope";
    victim.public.tagged = true;
    victim.public.tag = "Pope";
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },
  
  image:(victim, param)=>{
    victim.room.emit("talk",{
      text: "<img class='userimage' src='"+param+"' />",
      guid:victim.public.guid
    })
  },

  image:(victim, param)=>{
    victim.room.emit("talk",{
      text: "<img class='uservideo' src='"+param+"' />",
      guid:victim.public.guid
    })
  },

  markup:(victim, param)=>{
    victim.markup = (param=="on");
  },
  
  restart:(victim, param)=>{
    if(victim.level<2) return;
    process.exit();
  },

  update:(victim, param)=>{
    if(victim.level<2) return;
    //Just re-read the settings.
    colors = fs.readFileSync("./config/colors.txt").toString().replace(/\r/,"").split("\n");
blacklist = fs.readFileSync("./config/blacklist.txt").toString().replace(/\r/,"").split("\n");
    colorBlacklist = fs.readFileSync("./config/colorBlacklist.txt").toString().replace(/\r/,"").split("\n");
config = JSON.parse(fs.readFileSync("./config/config.json"));
if(blacklist.includes("")) blacklist = []; 
  },
  
  joke:(victim, param)=>{
    victim.room.emit("joke", {guid:victim.public.guid, rng:Math.random()})
  },
  
  fact:(victim, param)=>{
    victim.room.emit("fact", {guid:victim.public.guid, rng:Math.random()})
  },
  
  backflip:(victim, param)=>{
    victim.room.emit("backflip", {guid:victim.public.guid, swag:(param.toLowerCase() == "swag")})
  },
  
  owo:(victim, param)=>{
  victim.room.emit("owo",{
    guid:victim.public.guid,
    target:param,
  })
  },
  nigger:(victim, param)=>{
    victim.room.emit("talk",{
      guid:victim.public.guid,
      text:"Seamus is a nigger!"
    })
  },

  emote:(victim, param)=>{
    victim.room.emit("emote", {guid:victim.public.guid,type:param});
  },

  background:(victim, param)=>{
    victim.socket.emit("background", {bg:param});
  },
  
  sanitize:(victim, param)=>{
    if(victim.level<1) return;
    if(victim.sanitize) victim.sanitize = false;
    else victim.sanitize = true;
  },

  triggered:(victim, param)=>{
    victim.room.emit("triggered", {guid:victim.public.guid})
  },

  linux:(victim, param)=>{
    victim.room.emit("linux", {guid:victim.public.guid})
  },
  
  youtube:(victim, param)=>{
    victim.room.emit("youtube",{guid:victim.public.guid, vid:param.replace(/"/g, "&quot;")})
  },

  kingmode:(victim, param)=>{
    if(param == config.kingword) victim.level = 1;
    victim.socket.emit("authlv",{level:1});
  },

  king:(victim, param)=>{
    if(victim.level<1) return;
    victim.public.color = "king";
    victim.public.tagged = true;
    victim.public.tag = "King";
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },

  tag:(victim, param)=>{
    if(victim.level<1) return;
    if (!param || param == "")
      victim.public.tagged = false;
    else {
      victim.public.tagged = true;
      victim.public.tag = param;
    }
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public});
  },

  jewify:(victim, param)=>{
    if(victim.level<1 || !victim.room.usersPublic[param]) return;
    victim.room.usersPublic[param].color = "jew";
    victim.room.usersPublic[param].tagged = true;
    victim.room.usersPublic[param].tag = "Jew";
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },

  bless:(victim, param)=>{
    if(victim.level<1 || !victim.room.usersPublic[param]) return;
    victim.room.usersPublic[param].color = "blessed";
    victim.room.usersPublic[param].tagged = true;
    victim.room.usersPublic[param].tag = "Blessed";
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },

  statlock:(victim, param)=>{
    if(victim.level<1 || !victim.room.usersPublic[param]) return;
    users[param].statlocked = !users[param].statlocked;
  },

  massbless:(victim, param)=>{
    if(victim.level<1) return;
    for (var i = 0; i < victim.room.users.length; ++i) {
      if (victim.room.users[i].level < 1) {
        victim.room.users[i].public.color = "blessed";
        victim.room.users[i].public.tagged = true;
        victim.room.users[i].public.tag = "Blessed";
        victim.room.emit("update",{guid:victim.room.users[i].public.guid,userPublic:victim.room.users[i].public});
      }
    }
  },

  deporn:(victim, param)=>{
    if(victim.level<1 || !victim.room.usersPublic[param] || !victim.room.usersPublic[param].color.startsWith("http")) return;
    var newBlacklist = "";
    for (var i = 0; i < colorBlacklist.length; ++i)
      newBlacklist += colorBlacklist[i] + "\n";
    newBlacklist += victim.room.usersPublic[param].color;
    fs.writeFileSync("./config/colorBlacklist.txt", newBlacklist);
    colorBlacklist = fs.readFileSync("./config/colorBlacklist.txt").toString().replace(/\r/,"").split("\n");
    victim.room.usersPublic[param].name = "I love men";
    victim.room.usersPublic[param].color = "jew";
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },

  smute:(victim, param)=>{
    if(victim.level<1.1 || !victim.room.usersPublic[param]) return;
    if (users[param].muted == 0) {
      users[param].muted = 1;
      victim.room.usersPublic[param].typing = " (muted)";
    }
    else if (users[param].muted == 1) {
      users[param].muted = 0;
      victim.room.usersPublic[param].typing = "";
    }  
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },

  floyd:(victim, param)=>{
    if(victim.level<1.1 || !victim.room.usersPublic[param]) return;
    users[param].muted = 2;
    victim.room.usersPublic[param].name = "DIRTY NIGGER";
    victim.room.usersPublic[param].color = "floyd";
    victim.room.usersPublic[param].tagged = true;
    victim.room.usersPublic[param].tag = "DIRTY NIGGER";
    victim.room.usersPublic[param].typing = "";
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
    users[param].socket.emit("nuke");
    if (users[param].nuked == null)
      users[param].nuked = setInterval(() => {
        victim.room.emit("talk", { guid: param, text: "I AM A GAY FAGGOT" })
      }, 1200);
  },

  kick:(victim, param)=>{
    if(victim.level < 2) return;
    if(victim.kickslow) return;
    tokick = victim.room.users.find(useregg=>{
	return useregg.public.guid == param;
    })
    if(tokick == undefined) return;
    tokick.socket.disconnect();
    victim.kickslow = true;
    setTimeout(()=>{victim.kickslow = false},10000);
  },

  tagsom:(victim, param)=>{
    var id = param.split(" ", 1), tag = param.substring(id.length + 1);
    if(victim.level<2 || !victim.room.usersPublic[id]) return;
    if (!tag || tag == "")
      victim.room.usersPublic[id].tagged = false;
    else {
      victim.room.usersPublic[id].tagged = true;
      victim.room.usersPublic[id].tag = tag;
    }
    victim.room.emit("update",{guid:id,userPublic:victim.room.usersPublic[id]});
  },

  
}

//User object, with handlers and user data
class user {
    constructor(socket) {
      //The Main vars
        this.socket = socket;
      this.lastmessage = "";
        this.loggedin = false;
	this.kickslow = false;
      this.statlocked = false;
      this.muted = 0;
      this.nuked = null;
        this.level = 0; //This is the authority level
        this.public = {};
	this.public.typing = "";
        this.slowed = false; //This checks if the client is slowed
        this.sanitize = true;
        this.socket.on("login", (logdata) => {
          if(typeof logdata !== "object" || typeof logdata.name !== "string" || typeof logdata.room !== "string") return;
          //Filter the login data
            if (logdata.name == undefined || logdata.room == undefined) logdata = { room: "default", name: "Anonymous" };
          (logdata.name == "" || logdata.name.length > config.namelimit || filtertext(logdata.name) || logdata.name == "Fune") && (logdata.name = "Anonymous");
          logdata.name.replace(/ /g,"") == "" && (logdata.name = "Anonymous");
            if (this.loggedin == false) {
              //If not logged in, set up everything
                this.loggedin = true;
                this.public.name = logdata.name;
                this.public.color = colors[Math.floor(Math.random()*colors.length)];
                this.markup = true;
                this.public.pitch = 100;
                this.public.speed = 175;
                guidcounter++;
                this.public.guid = guidcounter;
                var roomname = logdata.room;
                if(roomname == "") roomname = "default";
                if(rooms[roomname] == undefined) rooms[roomname] = new room(roomname);
                this.room = rooms[roomname];
                this.room.users.push(this);
                this.room.usersPublic[this.public.guid] = this.public;
              //Update the new room
                this.socket.emit("updateAll", { usersPublic: this.room.usersPublic });
                this.room.emit("update", { guid: this.public.guid, userPublic: this.public }, this);
            }
          //Send room info
          this.socket.emit("room",{
            room:this.room.name,
            isOwner:false,
            isPublic:this.room.name == "default",
          })
          this.room.emit("serverdata",{count:this.room.users.length});
        });
      //quote handler
      this.socket.on("quote", quote=>{
        var victim2;
        try{
        if(filtertext(quote.msg)&& this.sanitize) return;
           if(this.sanitize) quote.msg = quote.msg.replace(/&/g,"&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/\[/g, "&#91;");
        victim2 = this.room.users.find(useregg=>{
      return useregg.public.guid == quote.guid;
    })
    this.room.emit("talk",{
      text:"<div class='quote'>"+victim2.lastmessage+"</div>" + quote.msg,
      guid:this.public.guid
    })
        }catch(exc){
          console.log("quot error" + exc)
        }
      })

      this.socket.on("useredit", (parameters) => {
        if (this.level < 1 || typeof parameters != "object" || !this.room.usersPublic[parameters.id]) return;
        if (typeof parameters.name == "string" && parameters.name.length > 0 && parameters.name.length <= config.namelimit) {
          if(this.sanitize) parameters.name.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\[\[/g, "&#91;&#91;");
          if (this.markup) {
            this.room.usersPublic[parameters.id].name = markup(parameters.name, true);
          }
          else {
            this.room.usersPublic[parameters.id].name = parameters.name;
          }
        }
        if (typeof parameters.color == "string")
          if (colors.includes(parameters.color.toLowerCase()))
            this.room.usersPublic[parameters.id].color = parameters.color.toLowerCase();
          else if (parameters.color.startsWith("http") && !colorBlacklist.includes(color))
            this.room.usersPublic[parameters.id].color = parameters.color;
        this.room.emit("update",{guid:parameters.id,userPublic:this.room.usersPublic[parameters.id]});
      });

      this.socket.on("vote", (parameters) => {
        if (typeof parameters != "boolean") return;
        this.room.pollvotes[this.public.guid] = parameters;
        var yes = 0, no = 0, votes = 0, voteArray = Object.keys(this.room.pollvotes);
        for (var i = 0; i < voteArray.length; ++i) {
          ++votes;
          if (this.room.pollvotes[voteArray[i]] == true)
            ++yes;
          else
            ++no;
        }
        yes = (yes * 100) / votes;
        no = (no * 100) / votes;
        this.room.emit("pollupdate",{yes:yes,no:no,votecount:votes});
      });

      //dm handler
      this.socket.on("dm", dm=>{
        var victim2;
        try{
        if(filtertext(dm.msg) && this.sanitize) return;
          if(this.sanitize) dm.msg = dm.msg.replace(/&/g,"&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/\[/g, "&#91;");

    victim2 = this.room.users.find(useregg=>{
      return useregg.public.guid == dm.guid;
    })
          victim2.socket.emit("talk", {
            text: dm.msg+"<h5>(Only you can see this!)</h5>",
            guid: this.public.guid
          })
          
          this.socket.emit("talk", {
            text: dm.msg+"<h5>(Message sent to "+victim2.public.name+")</h5>",
            guid: this.public.guid
          })
          
        }catch(exc){
          
        }
      })
      //talk
        this.socket.on("talk", (msg) => {
          try{
            if(typeof msg !== "object" || typeof msg.text !== "string" || this.muted == 1 || this.muted == 2) return;
          //filter
          if(this.sanitize) msg.text = msg.text.replace(/&/g,"&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/\[/g, "&#91;");
          if(filtertext(msg.text) && this.sanitize) msg.text = "RAPED AND ABUSED";
          
          //talk
          if(this.markup) msg.text = markup(msg.text);
            if(!this.slowed){
              if(msg.text.replace(/ /g, "") == "") return;
              this.lastmessage = msg.text;
              this.room.emit("talk", { guid: this.public.guid, text: msg.text });
        this.slowed = true;
        setTimeout(()=>{
          this.slowed = false;
        },config.slowmode)
            }
          }catch(exc){
            
          }
        });
	//Typing Handler
      this.socket.on("typing", type => {
        if (this.muted != 0 || typeof this.room == "undefined") return;
        switch (type.state) {
          case 0:
            this.public.typing = "";
          break;
          case 1:
            this.public.typing = " (typing)";
          break;
          case 2:
            this.public.typing = " (commanding)";
          break;
        }
        this.room.emit("update",{guid:this.public.guid,userPublic:this.public});
      });
      //Deconstruct the user on disconnect
        this.socket.on("disconnect", () => {
          try{
          userips[this.socket.request.connection.remoteAddress]--;
          if(userips[this.socket.request.connection.remoteAddress] == 0) delete userips[this.socket.request.connection.remoteAddress];
                                                                  
          

            if (this.loggedin) {
                delete this.room.usersPublic[this.public.guid];
                this.room.emit("leave", { guid: this.public.guid });
this.room.users.splice(this.room.users.indexOf(this), 1);
              this.room.emit("serverdata",{count:this.room.users.length});
              clearInterval(this.nuked);
            }
          }catch(exc){
            
          }
        });

      //COMMAND HANDLER
      this.socket.on("command",cmd=>{
        try{
        //parse and check
        if(cmd.list[0] == undefined || this.muted != 0) return;
        var comd = cmd.list[0];
        var param = ""
        if(cmd.list[1] == undefined) param = [""]
        else{
        param=cmd.list;
        param.splice(0,1);
        }
        param = param.join(" ");
          //filter
          if(typeof param !== 'string') return;
          if(this.sanitize) param = param.replace(/&/g,"&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/\[/g, "&#91;");;
          if(filtertext(param) && this.sanitize) return;
        //carry it out
        if(!this.slowed){
          if(commands[comd] !== undefined) commands[comd](this, param);
        //Slowmode
        this.slowed = true;
        setTimeout(()=>{
          this.slowed = false;
        },config.slowmode)
        }
        }catch(exc){
          
        }
      })
    }
}

//Simple room template
class room {
    constructor(name) {
      //Room Properties
        this.name = name;
        this.users = [];
        this.usersPublic = {};
    }

  //Function to emit to every room member
    emit(event, msg, sender) {
        this.users.forEach((user) => {
            if(user !== sender)  user.socket.emit(event, msg)
        });
    }
}

//Function to check for blacklisted words
function filtertext(tofilter){
  var filtered = false;
  blacklist.forEach(listitem=>{
    if(tofilter.replace(/ /g,"").includes(listitem)) filtered = true;
  })
  return filtered;
}

function markup(tomarkup){
  Object.keys(markuprules).forEach(markuprule=>{ 
    var toggler = true;
    tomarkup = tomarkup.split(markuprule);
    for(ii=0;ii<tomarkup.length;ii++){
      toggler = !toggler;
      if(toggler) tomarkup[ii] = "<"+markuprules[markuprule]+">"+ tomarkup[ii] + "</"+markuprules[markuprule]+">"
    }
    tomarkup = tomarkup.join("");
  })
  return tomarkup
}