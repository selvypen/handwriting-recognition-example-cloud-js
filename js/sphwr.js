let strokePoints = [];
let xArray = [];
let yArray = [];
let isDown = false;
let recognizeTimer;
const RECOGNIZE_TIME = 500;
let canvas = document.getElementById('hwrCanvas');
const JsonOption = { indent: 2, quoteKeys: true };

function Stroke(x, y) {
  this.x = x;
  this.y = y;
}

window.onload = function () {
  setHwrCanvas();
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
      strokeStyle: '#4a235a',
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
  $('#hwrCanvas').on('mousedown', function (event) {
    setMounsePos(event);
    touchDown();

  });
  $('#hwrCanvas').on('mousemove', function (event) {
    if (isDown) {
      setMounsePos(event);
      touchMove();
    }
  });
  $('#hwrCanvas').on('mouseup', function (event) {
    setMounsePos(event);
    touchUp();
    showSpinner();
  });

  $('#hwrCanvas').on('touchstart', function (event) {
    setTouchPos(event);
    touchDown();
    event.preventDefault();
  });
  $('#hwrCanvas').on('touchmove', function (event) {
    if (isDown) {
      setTouchPos(event);
      touchMove();
    }
    event.preventDefault();
  });
  $('#hwrCanvas').on('touchend', function (event) {
    setTouchPos(event);
    touchUp();
    showSpinner();
    event.preventDefault();
  });
}

// 필기 인식
function recognize() {
  const dataJson = {
    language: $('#language').val(),
    inks: [strokePoints],
    maxCandidateCount: $('#maxCandidateCount').val(),
    userSymbol: $('#userSymbol').val(),
    userConfig: {
      minPoint: $('#userConfigMinPoint').val(),
      maxPoint: $('#userConfigMaxPoint').val(),
      minStroke: $('#userConfigMinStroke').val(),
      maxStroke: $('#userConfigMaxStroke').val()
    },
    includeNative: isChecked('includeNative'),
    includeEnglish: isChecked('includeEnglish'),
    includeNumber: isChecked('includeNumber'),
    includeSymbol: isChecked('includeSymbol'),
    includeHangulJamo: isChecked('includeHangulJamo'),
    useGesture: isChecked('useGesture'),
    answer: [$('#answer').val()]
  }
  $('#requestJson').html(prettyPrintJson.toHtml(dataJson, JsonOption));

  const serverUrl = $('#serverUrl').val();
  const apiKey = $('#apiKey').val();
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }

  let startTime = new Date();
  $.ajax({
    url: serverUrl + '/hwr/recognize',
    dataType: 'json',
    headers: headers,
    type: 'POST',
    data: JSON.stringify(dataJson),
    contentType: 'application/json',
    success: function (result) {
      console.log('[RESPONSE]:', JSON.stringify(result))
      if (result.hwrErrorCode[0].value !== 0) {
        $('.candidate-item').text('No Result');
      } else {
        $('.candidate-item').text(result['candidates']);
      }
      $('#responseJson').html(prettyPrintJson.toHtml(result, JsonOption));
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error(jqXHR);
      $('#responseJson').html(prettyPrintJson.toHtml(jqXHR, JsonOption));
    },
    complete: function () {
      let elapsedTime = new Date() - startTime;
      console.log('elapsed time(ms):', elapsedTime);
      $('#responseJson').prepend(`<pre>elapsed time: ${elapsedTime}ms</pre>`);
      hideSpinner();
    }
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

  $('#requestJson').empty();
  $('#responseJson').empty();
  drawGuideText();
  hideSpinner();
}

function initialize() {
  window.addEventListener('resize', resizeCanvas, false);
  window.addEventListener('orientationchange', clearCanvas, false);
  resizeCanvas();
}

function resizeCanvas() {
  const html = document.documentElement;
  canvas.width = html.clientWidth;
  canvas.height = 200;
  clearCanvas();
}

function drawGuideText() {
  let x = canvas.width / 2;
  let y = canvas.height / 2;
  let ctx = canvas.getContext('2d');
  ctx.font = '30px gothic';
  ctx.fillStyle = '#e0e0e0';
  ctx.textAlign = 'center';
  ctx.fillText('Write here', x, y);
}

function isChecked(id) {
  return $("input:checkbox[id='" + id + "']").is(':checked');
}

function hideSpinner() {
  $('#recognizerSpinner').hide();
}

function showSpinner() {
  $('#recognizerSpinner').show();
}

$('#clear').on('click', function (e) {
  clearCanvas();
});
