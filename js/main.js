
  var fxCanvas = null;
  var texture = null;

  function step2() {
    var canvas = document.querySelector('#result');
    var img = document.querySelector('#resultimg');
    fxCanvas = fx.canvas();

    var ctx = canvas.getContext('2d');
    //modify the picture using glfx.js filters
    texture = fxCanvas.texture(canvas);
    fxCanvas.draw(texture)
    .hueSaturation(-1, -1)//grayscale
    .unsharpMask(20, 2)
    .brightnessContrast(0.25, 0.0)
    .update();
    window.texture = texture;
    window.fxCanvas = fxCanvas;


    var step2Image = fxCanvas.toDataURL();
    var vurl = "https://api.idolondemand.com/1/api/sync/ocrdocument/v1";
    var apikey1 = "31a53ab4-4b97-436e-8116-3d9485584bc7";

    //Hide
    $("#photo").hide();
    $("#loading").show();

    //your APIv3 client id
    var clientId = "5603b47f9c09ce4";
    var imgUrl = step2Image;
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

        $.ajax({
          url: vurl,
          data: vdata,
          cache: false,
          contentType: false,
          processData: false,
          type: 'POST',
          success: function(data){
            //alert(data.text_block[0].text);
            var array = data.text_block[0].text.split('\n');
            $("#studentID").val(array[0]);
            $("#firstName").val(array[1]);
            $("#major").val(array[2]);
            $("#campus").val(array[4]);

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
            $("#form").show();
            $("#loading").hide();
          }
        })
    }
  }
