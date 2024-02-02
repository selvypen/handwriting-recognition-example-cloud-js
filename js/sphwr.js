let strokePoints = [];
let xArray = [];
let yArray = [];
var languageList = [];
let isDown = false;
let recognizeTimer;
const RECOGNIZE_TIME = 500;
let canvas = document.getElementById('hwrCanvas');

let serverUrl = '{API_URL}'
let headers = {
  "Authorization": "Bearer {API_KEY}",
  "Content-Type": "application/json"
}

function Stroke(x, y) {
  this.x = x;
  this.y = y;
}

window.onload = function () {
  setHwrCanvas();
  setLanguages()
  initialize();
};

// 터치 이벤트 처리
function touchDown() {
  isDown = true;
  $('.candidate-item').text(function () {
    return '';
  });
  if (recognizeTimer) {
    clearTimeout(recognizeTimer);
  }
}

function touchMove() {
  if (xArray.length > 1 && yArray.length > 1) {
    $('canvas').drawLine({
      strokeStyle: '#5577fb',
      strokeWidth: 3,
      x1: xArray[xArray.length - 2],
      y1: yArray[yArray.length - 2],
      x2: xArray[xArray.length - 1],
      y2: yArray[yArray.length - 1]
    });
  }
}

function touchUp() {
  strokePoints.push(new Stroke(xArray, yArray));
  xArray = [];
  yArray = [];
  isDown = false;
  recognizeTimer = setTimeout(recognize, RECOGNIZE_TIME);
}

function setMounsePos(event) {
  const mounseX = event.offsetX * canvas.width / canvas.clientWidth | 0;
  const mounseY = event.offsetY * canvas.height / canvas.clientHeight | 0;
  xArray.push(parseInt(mounseX));
  yArray.push(parseInt(mounseY));
}

function setTouchPos(event) {
  const touches = event.originalEvent.touches;
  if (touches) {
    if (touches.length == 1) { // Only deal with one finger
      const touch = touches[0]; // Get the information for finger #1
      const touchX = (touch.pageX - touch.target.offsetLeft) * canvas.width / canvas.clientWidth | 0;
      const touchY = (touch.pageY - touch.target.offsetTop) * canvas.height / canvas.clientHeight | 0;
      xArray.push(touchX);
      yArray.push(touchY);
    }
  }
}

function setHwrCanvas() {
  $('#hwrCanvas').on("mousedown", function (event) {
    setMounsePos(event);
    touchDown();

  });
  $('#hwrCanvas').on("mousemove", function (event) {
    if (isDown) {
      setMounsePos(event);
      touchMove();
    }
  });
  $('#hwrCanvas').on("mouseup", function (event) {
    setMounsePos(event);
    touchUp();
  });

  $('#hwrCanvas').on("touchstart", function (event) {
    setTouchPos(event);
    touchDown();
    event.preventDefault();
  });
  $('#hwrCanvas').on("touchmove", function (event) {
    if (isDown) {
      setTouchPos(event);
      touchMove();
    }
    event.preventDefault();
  });
  $('#hwrCanvas').on("touchend", function (event) {
    setTouchPos(event);
    touchUp();
    event.preventDefault();
  });
}

// 문자 인식 지원 언어 확인
function setLanguages() {
  $.ajax({
    url: serverUrl + '/hwr/languages',
    headers: headers,
    dataType: 'json',
    type: 'GET',
    success: function (result) {
      result.sort((a, b) => {
        if (a.english_name > b.english_name) {
          return 1;
        } else if (a.english_name < b.english_name) {
          return -1;
        } else {
          return 0;
        }
      });
      for (var index in result) {
        console.log(result[index])
        if (result[index].language == "ko_KR" || result[index].language == "en_US") {
          languageList[result[index]['english_name']] = result[index]['language'];
          $('#language').append('<option>' + result[index]['english_name'] + '</option>');
          if (result[index]['english_name'].indexOf('Korean') != -1) {
            $('#language').val(result[index]['english_name']).attr('selected', 'selected');
          }
        }
      }
    },
  });

  $('#language').on('change', () => {
    var selectedLanguage = $('#language').val()
    if (selectedLanguage.includes("English")) {
      $("#includeHangulJamo").prop('disabled', true);
    } else {
      $("#includeHangulJamo").prop('disabled', false);
    }
  })
}

// 문자 인식
function recognize() {
  console.log('recognize Click');
  var languageName = $('#language option:selected').val();
  var includeNative = $('#includeNative').prop("checked")
  var includeSymbol = $('#includeSymbol').prop("checked")
  var includeNumber = $('#includeNumber').prop("checked")
  var includeEnglish = $('#includeEnglish').prop("checked")
  var includeHangulJamo = $('#includeHangulJamo').prop("checked")
  var useGesture = $('#useGesture').prop("checked")
  var englishOption = $('#englishOption option:selected').val();

  console.log("languageName : " , languageName)
  console.log("includeNative : " , includeNative)
  console.log("includeSymbol : " , includeSymbol)
  console.log("includeNumber : " , includeNumber)
  console.log("includeEnglish : " , includeEnglish)
  console.log("includeHangulJamo : " , includeHangulJamo)
  console.log("useGesture : " , useGesture)
  console.log("englishOption : " , englishOption)

  var langCode = languageList[languageName];
  var dataJson = JSON.stringify({
    language: langCode,
    maxCandidateCount: 3,
    userSymbol: '',
    inks: strokePoints,
    includeNative: includeNative,
    includeSymbol: includeSymbol,
    includeNumber: includeNumber,
    includeEnglish: includeEnglish,
    includeHangulJamo: includeHangulJamo,
    useGesture: useGesture,
    englishOption: englishOption
  });

  console.log(dataJson)

  $.ajax({
    url: serverUrl + '/hwr/recognize',
    dataType: 'json',
    type: 'POST',
    data: dataJson,
    headers: headers,
    contentType: 'application/json',
    success: function (result) {
      console.log(result);
      if (result['candidates'].length == 0) {
        $('.candidate-item').text('No Result');
      } else {
        $('.candidate-item').text(function (index) {
          return result['candidates'][index];
        });
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.log('error');
    },
  });
}

function clearCanvas() {
  $('#hwrCanvas').clearCanvas();
  strokePoints.length = 0;
  if (recognizeTimer) {
    clearTimeout(recognizeTimer);
  }

  $('.candidate-item').text(function (index) {
    return '';
  });
}

function initialize() {
  window.addEventListener('resize', resizeCanvas, false);
  window.addEventListener("orientationchange", clearCanvas, false);
  resizeCanvas();
}

function resizeCanvas() {
  const html = document.documentElement;
  const margin = 8; // avoid to show scroll-bar
  canvas.width = html.clientWidth;
  canvas.height = html.clientHeight - margin;
  clearCanvas();
}

$('#clear').on('click', function (e) {
  clearCanvas();
});
