(function () {
  var video = document.querySelector('video');
  var pictureWidth = 640;
  var pictureHeight = 360;
  var fxCanvas = null;
  var texture = null;
  function checkRequirements() {
    var deferred = new $.Deferred();
    //Check if getUserMedia is available
    if (!Modernizr.getusermedia) {
      deferred.reject('Your browser doesn\'t support getUserMedia (according to Modernizr).');
    }
    //Check if WebGL is available
    if (Modernizr.webgl) {
      try {
        //setup glfx.js
        fxCanvas = fx.canvas();
      } catch (e) {
        deferred.reject('Sorry, glfx.js failed to initialize. WebGL issues?');
      }
    } else {
      deferred.reject('Your browser doesn\'t support WebGL (according to Modernizr).');
    }
    deferred.resolve();
    return deferred.promise();
  }
  function searchForRearCamera() {
    var deferred = new $.Deferred();
    //MediaStreamTrack.getSources seams to be supported only by Chrome
    if (MediaStreamTrack && MediaStreamTrack.getSources) {
      MediaStreamTrack.getSources(function (sources) {
        var rearCameraIds = sources.filter(function (source) {
          return (source.kind === 'video' && source.facing === 'environment');
        }).map(function (source) {
          return source.id;
        });
        if (rearCameraIds.length) {
          deferred.resolve(rearCameraIds[0]);
        } else {
          deferred.resolve(null);
        }
      });
    } else {
      deferred.resolve(null);
    }
    return deferred.promise();
  }
  function setupVideo(rearCameraId) {
    var deferred = new $.Deferred();
    var getUserMedia = Modernizr.prefixed('getUserMedia', navigator);
    var videoSettings = {
      video: {
        optional: [
          {
            width: {min: pictureWidth}
          },
          {
            height: {min: pictureHeight}
          }
        ]
      }
    };
    //if rear camera is available - use it
    if (rearCameraId) {
      videoSettings.video.optional.push({
        sourceId: rearCameraId
      });
    }
    getUserMedia(videoSettings, function (stream) {
      //Setup the video stream
      video.src = window.URL.createObjectURL(stream);
      window.stream = stream;
      video.addEventListener("loadedmetadata", function (e) {
        //get video width and height as it might be different than we requested
        pictureWidth = this.videoWidth;
        pictureHeight = this.videoHeight;
        if (!pictureWidth && !pictureHeight) {
          //firefox fails to deliver info about video size on time (issue #926753), we have to wait
          var waitingForSize = setInterval(function () {
            if (video.videoWidth && video.videoHeight) {
              pictureWidth = video.videoWidth;
              pictureHeight = video.videoHeight;
              clearInterval(waitingForSize);
              deferred.resolve();
            }
          }, 100);
        } else {
          deferred.resolve();
        }
      }, false);
    }, function () {
      deferred.reject('There is no access to your camera, have you denied it?');
    });
    return deferred.promise();
  }
  function step1() {
    checkRequirements()
    .then(searchForRearCamera)
    .then(setupVideo)
    .done(function () {
      //Enable the 'take picture' button
      $('#takePicture').removeAttr('disabled');
      //Hide the 'enable the camera' info
      $('#step1 figure').removeClass('not-ready');
    })
    .fail(function (error) {
      showError(error);
    });
    $("#form").hide();
    $("#loading").hide();
  }
  function step2() {
    var canvas = document.querySelector('#step2 canvas');
    var img = document.querySelector('#step2 img');
    //setup canvas
    canvas.width = pictureWidth;
    canvas.height = pictureHeight;
    var ctx = canvas.getContext('2d');
    //draw picture from video on canvas
    ctx.drawImage(video, 0, 0);
    //modify the picture using glfx.js filters
    texture = fxCanvas.texture(canvas);
    fxCanvas.draw(texture)
    .hueSaturation(-1, -1)//grayscale
    .unsharpMask(20, 2)
    .brightnessContrast(0.25, 0.0)
    .update();
    window.texture = texture;
    window.fxCanvas = fxCanvas;
    $(img)
    //setup the crop utility
    .one('load', function () {
      if (!$(img).data().Jcrop) {
        $('#adjust').removeAttr('disabled');} else {
          //update crop tool (it creates copies of <img> that we have to update manually)
          $('.jcrop-holder img').attr('src', fxCanvas.toDataURL());
        }
      })
      //show output from glfx.js
      .attr('src', fxCanvas.toDataURL());
    }
    function step3() {
      var canvas = document.querySelector('#step3 canvas');
      var step2Image = document.querySelector('#step2 img');
      var vurl = "https://api.idolondemand.com/1/api/sync/ocrdocument/v1";
      var apikey1 = "31a53ab4-4b97-436e-8116-3d9485584bc7";

      //Hide
      $$("#photo").hide();

      //your APIv3 client id
      var clientId = "5603b47f9c09ce4";
      var imgUrl = step2Image.getAttribute("src");
      var postUrl;
      imgUrl = imgUrl.split(',')[1];
      $.ajax({
          url: "https://api.imgur.com/3/upload",
          type: "POST",
          datatype: "json",
          data: {image: imgUrl},
          success: showMe,
          error: showMe,
          beforeSend: function (xhr) {
              xhr.setRequestHeader("Authorization", "Client-ID " + clientId);
          }
      });

      function showMe(data) {
          postUrl = data.data.link;
          var delete1 = data.data.deletehash;
          console.log(data);
          var vdata = new FormData();
          vdata.append("url", postUrl);
          vdata.append("apikey", apikey1);

          $("#loading").show();

          $.ajax({
            url: vurl,
            data: vdata,
            cache: false,
            contentType: false,
            processData: false,
            type: 'POST',
            success: function(data){
              alert(data.text_block[0].text);
              console.log(data);
              //Erase photo
              var clientId = "5603b47f9c09ce4";
              var postUrl;
              $.ajax({
                  url: "https://api.imgur.com/3/image/" + delete1,
                  type: "DELETE",
                  datatype: "json",
                  beforeSend: function (xhr) {
                      xhr.setRequestHeader("Authorization", "Client-ID " + clientId);
                  }
              });
            }
          })
      }
      $("#form").show();
      $("#loading").hide();
    }
    /*********************************
    * UI Stuff
    *********************************/
    //start step1 immediately
    step1();
    $('.help').popover();
    function changeStep(step) {
      if (step === 1) {
        video.play();
      } else {
        video.pause();
      }
      $('body').attr('class', 'step' + step);
      $('.nav li.active').removeClass('active');
      $('.nav li:eq(' + (step - 1) + ')').removeClass('disabled').addClass('active');
    }
    function showError(text) {
      $('.alert').show().find('span').text(text);
    }
    //handle brightness/contrast change
    $('#brightness, #contrast').on('change', function () {
      var brightness = $('#brightness').val() / 100;
      var contrast = $('#contrast').val() / 100;
      var img = document.querySelector('#step2 img');
      fxCanvas.draw(texture)
      .hueSaturation(-1, -1)
      .unsharpMask(20, 2)
      .brightnessContrast(brightness, contrast)
      .update();
      img.src = fxCanvas.toDataURL();
      //update crop tool (it creates copies of <img> that we have to update manually)
      $('.jcrop-holder img').attr('src', fxCanvas.toDataURL());
    });
    $('#takePicture').click(function () {
      step2();
      changeStep(2);
    });
    $('#adjust').click(function () {
      step3();
      changeStep(3);
    });
    $('#go-back').click(function () {
      changeStep(2);
    });
    $('#start-over').click(function () {
      changeStep(1);
    });
    $('.nav').on('click', 'a', function () {
      if (!$(this).parent().is('.disabled')) {
        var step = $(this).data('step');
        changeStep(step);
      }
      return false;
    });
  })();
